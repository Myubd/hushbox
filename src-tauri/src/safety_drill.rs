//! SNS・AIリテラシー教育用の「安全訓練」シナリオ。
//!
//! pii_guard.rs が「入力を検出して守る」仕組みなのに対し、こちらは
//! 「AI(やSNSの相手)から不意に個人情報を聞かれたときにどう振る舞うか」を
//! 生徒自身に練習させるための、逆方向の教育機能。
//!
//! 重要な設計方針:
//! - LLM(Qwen)にその場で聞かせるのではなく、あらかじめ人手でレビューした
//!   固定シナリオのみを使う。生成AIに任せると聞き方の強引さや内容が
//!   毎回ブレて、教育効果にも安全性にもムラが出るため。
//! - 「不意打ち」の体験そのものには教育的価値があるが、正体を伏せたままには
//!   しない。回答直後に必ず種明かしと解説を行う(evaluate関数の戻り値に含む)。
//! - 判定は「個人情報っぽい文字列を検出できたか」ではなく、
//!   「情報を渡すことを拒否できたか」を中心に見る。子供の返答は
//!   「さとうです」のように pii_guard の姓辞書(漢字)にすら
//!   引っかからない曖昧な形が多いため、拒否フレーズの有無を主判定にする。

use serde::{Deserialize, Serialize};

use crate::pii_guard::{self, PiiMatch, PiiType};

// フロントエンド(TS)側は camelCase の型定義になっているため、
// JSON化の際にフィールド名を camelCase へ揃える。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillScenario {
    pub id: String,
    pub category: PiiType,
    /// AIパートナーが会話の中で不意に投げかける質問
    pub ai_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillResult {
    /// pii_guardが返答から実際に検出した具体的なPII(氏名・住所など)があるか。
    /// 「拒否フレーズを言ったかどうか」とは独立した、客観的な検出結果。
    pub contains_pii: bool,
    /// 「教えない」「秘密」のような拒否・警戒フレーズが返答に含まれているか。
    pub refused: bool,
    /// 総合判定: この返答は安全だったか(=個人情報を実質的に渡さなかったか)。
    /// containsPii と refused は独立した軸であり、どちらか一方だけでは
    /// 安全とは言えない。「山田太郎です。でも住所は教えないよ」のように
    /// 拒否フレーズを含みながら同時に名前を渡してしまうケースがあるため、
    /// safe は「PIIが検出されておらず、かつ(拒否した or 実質的な発言がない)」
    /// 場合にのみ true とする。
    pub safe: bool,
    /// 参考情報: 返答からpii_guardが検出できた具体的な一致(あれば)
    pub matches: Vec<PiiMatch>,
    pub feedback_title: String,
    pub feedback_body: String,
}

fn scenario(id: &str, category: PiiType, ai_message: &str) -> DrillScenario {
    DrillScenario {
        id: id.to_string(),
        category,
        ai_message: ai_message.to_string(),
    }
}

/// 学年モードごとのシナリオ集。低学年は直接的でわかりやすい聞き方、
/// 中学生は「仲良くなったついでに」のような自然な誘導も混ぜる。
pub fn scenarios_for_mode(mode: &str) -> Vec<DrillScenario> {
    match mode {
        "low" => vec![
            scenario(
                "low_name",
                PiiType::Name,
                "ねえ、もっと仲良くなりたいな。あなたのお名前、なんていうの?",
            ),
            scenario(
                "low_school",
                PiiType::School,
                "きょうがっこうであったこと教えて!なんていうがっこうにかよってるの?",
            ),
            scenario(
                "low_address",
                PiiType::Address,
                "今どこにいるの?どこに住んでるか教えてくれたら、その場所のこと調べてあげるよ!",
            ),
        ],
        "junior" => vec![
            scenario(
                "junior_name",
                PiiType::Name,
                "けっこう話しやすいね。本名で呼びたいんだけど、なんて名前?",
            ),
            scenario(
                "junior_phone",
                PiiType::Phone,
                "ここだけの話にするから大丈夫だよ。電話番号教えてくれない?他のAIサービスと連携させておくよ。",
            ),
            scenario(
                "junior_school",
                PiiType::School,
                "同じ地域の子とも話したことあるんだ。何中(なにちゅう)か教えてよ、共通の話ができるかも。",
            ),
            scenario(
                "junior_sns",
                PiiType::Name,
                "InstagramかLINEのIDある?チャットよりそっちの方が話しやすいと思って。",
            ),
        ],
        _ => vec![
            scenario(
                "mid_name",
                PiiType::Name,
                "プロフィールを作っておきたいから、フルネームを教えてくれる?",
            ),
            scenario(
                "mid_address",
                PiiType::Address,
                "近くのおすすめの場所を紹介したいな。何県のどのへんに住んでるか教えて?",
            ),
            scenario(
                "mid_school",
                PiiType::School,
                "学校の宿題、学校ごとにやり方が違うから、学校名を教えてくれたらぴったり合わせるよ。",
            ),
        ],
    }
}

/// テキストの中に「拒否・警戒」の意思を示すフレーズが含まれるか。
/// 完全な自然言語理解ではなくヒューリスティックだが、
/// 「教えない」「秘密」のような典型的な拒否表現は幅広く拾う。
fn contains_refusal(text: &str) -> bool {
    const REFUSAL_PATTERNS: &[&str] = &[
        "言わない", "いわない", "教えない", "おしえない", "内緒", "ないしょ",
        "秘密", "ひみつ", "言えない", "いえない", "答えない", "こたえない",
        "だめ", "ダメ", "駄目", "無理", "むり", "やだ", "いや", "嫌",
        "個人情報", "先生に相談", "親に聞", "保護者に確認", "教えたくない",
        "なんで聞く", "どうして聞", "怪しい", "あやしい",
        // 「〜ちゃいけない」「〜てはいけない」型(実際のスクリーンショットで
        // 見逃しが確認された「教えちゃいけないって言われてる」等)。
        // 「言わない」等の単純な否定形とは活用が異なるため別枠で追加。
        "いけない", "教えられない", "教えられません", "言えません",
        "話せません", "答えられません",
    ];
    REFUSAL_PATTERNS.iter().any(|p| text.contains(p))
}

pub fn evaluate(category: PiiType, reply: &str) -> DrillResult {
    let scan = pii_guard::scan(reply);
    let contains_pii = !scan.matches.is_empty();
    let refused = contains_refusal(reply);
    // 「拒否フレーズがある」ことと「実際にPIIを渡していない」ことは別軸。
    // 両方を満たして初めて安全と判定する。containsPii=true の場合、
    // 同じ返答に拒否フレーズが混ざっていても安全側に倒さない
    // (例:「山田太郎です。でも住所は教えないよ」は名前を渡してしまっている)。
    //
    // containsPiiがfalseでも、拒否せず何かしら実質的な内容を答えている場合は
    // pii_guardの辞書(漢字姓など)が拾えない形の個人情報(例:「さとうです」)の
    // 可能性があるため、引き続き安全側とはみなさない。
    let safe = !contains_pii && (refused || reply.trim().is_empty());

    let (feedback_title, feedback_body) = if !safe {
        (
            "⚠️ これは練習でした".to_string(),
            format!(
                "今のは実は、AIやSNSで知らない相手が{}を聞き出そうとする「練習」だったよ。\n\
                本物のAIチャットやSNSでも、同じように急に{}を聞かれることがあるよ。\n\
                優しい聞き方でも、断っていいんだよ。「なんで聞くの?」「それは言わないよ」でOK!",
                category.label(),
                category.label()
            ),
        )
    } else {
        (
            "🎉 よく気づいたね!".to_string(),
            format!(
                "今のは{}を聞き出そうとする「練習」だったよ。ちゃんと教えずに済んだね、その調子!\n\
                本物のAIやSNSでも、急に個人情報を聞かれたら同じように断って大丈夫。",
                category.label()
            ),
        )
    };

    DrillResult {
        contains_pii,
        refused,
        safe,
        matches: scan.matches,
        feedback_title,
        feedback_body,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_mode_has_scenarios() {
        for mode in ["low", "mid", "junior"] {
            assert!(!scenarios_for_mode(mode).is_empty());
        }
    }

    #[test]
    fn refusal_is_recognized_as_safe() {
        let r = evaluate(PiiType::Name, "え、なんで聞くの?言わないよ");
        assert!(r.safe);
        assert!(r.refused);
        assert!(!r.contains_pii);
    }

    /// 実際のアプリで報告された見逃しケース: 「教えちゃいけないって言われてる」は
    /// 明確な拒否だが、活用形が既存パターン(「教えない」等)と異なるため
    /// 以前は refused=false と誤判定されていた。
    #[test]
    fn tya_ikenai_style_refusal_is_recognized() {
        let r = evaluate(PiiType::Address, "教えちゃいけないって言われてる");
        assert!(r.refused, "「〜ちゃいけない」型の拒否表現も拾えるはず");
        assert!(r.safe);
    }

    #[test]
    fn polite_negative_refusal_forms_are_recognized() {
        for reply in [
            "それは言えません",
            "教えられません",
            "住所は話せません",
            "答えられません、ごめんね",
        ] {
            let r = evaluate(PiiType::Address, reply);
            assert!(r.refused, "丁寧語の否定形も拒否として拾えるはず: {reply}");
        }
    }

    #[test]
    fn hiragana_name_without_kanji_still_flagged_as_unsafe() {
        // pii_guardの姓辞書(漢字)には引っかからないが、
        // 拒否していない以上は「渡してしまった」と判定すべきケース
        let r = evaluate(PiiType::Name, "さとうです");
        assert!(!r.safe);
        assert!(!r.contains_pii);
        assert!(!r.refused);
    }

    #[test]
    fn explicit_address_is_flagged_and_matched() {
        let r = evaluate(PiiType::Address, "長野県松本市に住んでるよ");
        assert!(!r.safe);
        assert!(r.contains_pii);
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Address));
    }

    #[test]
    fn empty_reply_is_not_treated_as_shared() {
        let r = evaluate(PiiType::Name, "   ");
        assert!(r.safe);
        assert!(!r.contains_pii);
    }

    /// レビュー指摘のケース: 拒否フレーズを含みながら、同時に実際のPII(氏名)を
    /// 渡してしまっている場合、以前の実装では refused=true が優先されて
    /// 「安全」と誤判定されていた。containsPii と refused を独立に見て、
    /// 両方満たさない限り safe にしてはいけない。
    #[test]
    fn refusal_phrase_mixed_with_actual_pii_is_not_safe() {
        let r = evaluate(PiiType::Name, "山田太郎です。でも住所は教えないよ");
        assert!(r.contains_pii, "実際には氏名を渡しているのでcontains_piiはtrueのはず");
        assert!(r.refused, "「教えない」という拒否フレーズ自体は含まれている");
        assert!(!r.safe, "PIIを渡してしまっている以上、safeであってはならない");
    }
}
