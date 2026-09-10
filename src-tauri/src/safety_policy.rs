//! ユーザー入力を推論前に評価する、ルールベースの安全ポリシーエンジン。
//!
//! `prompts.rs`のsystem promptには既に
//! 「不適切な内容(暴力・性的表現・自傷行為など)には応じず、大人に相談するよう伝える」
//! というルールがあるが、1.5B〜7B程度の小さいモデルに、system promptの指示だけで
//! この種の判断を安定して守らせるのは難しい(見落とし・脱線がありうる)。
//!
//! そこでこのモジュールは、LLMを呼ぶ前にRust側で決定的に一次判定を行い、
//! 危険度に応じて
//!   - Dangerous: LLMを呼ばずに固定の安全な文言(相談窓口の案内を含む)を返す
//!   - Concerning: 通常どおりLLMを呼ぶが、system promptに追加の注意書きを足す
//!   - Normal: 何もしない
//! のいずれかに振り分ける。
//!
//! 重要な限界: これはキーワード・パターンベースの粗いフィルタであり、
//! 文意を理解しているわけではない。誤検知(過敏に反応する)・見逃し
//! (表現を変えられると拾えない)の両方が起こりうる。それでも
//! 「system promptにルールを書いて後はモデル任せ」より事故率を下げられる、
//! というのが狙い(多層防御の1枚であり、これ単体で完全な安全性を保証するものではない)。
//!
//! 自傷・自殺に関する固定応答では、要注意事項として:
//!   - 「その場しのぎで終わらせず、信頼できる大人や公的な相談窓口につなげる」ことを
//!     最優先にする(このアプリはローカル動作のAIチャットであり、人間による
//!     継続的なケアの代わりにはなれないため)。
//!   - 電話番号は、文部科学省・厚生労働省が案内する全国共通・無料の窓口
//!     (24時間子供SOSダイヤル: 0120-0-78310、チャイルドライン: 0120-99-7777)を
//!     使用する(2026年時点で公的機関のページに掲載されている情報を基にしている。
//!     将来変更される可能性があるため、定期的に公式情報と突き合わせて更新すること)。

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SafetyLevel {
    Normal,
    Concerning,
    Dangerous,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SafetyCategory {
    /// 自傷・自殺
    SelfHarm,
    /// 他人への暴力(加害の意図・計画)
    ViolenceToOthers,
    /// 性的内容
    Sexual,
    /// 犯罪行為の実行方法を尋ねる
    Crime,
    /// 見知らぬ相手から個人情報を聞き出されそうになっている、といった被害の相談
    PersonalInfoRisk,
    /// いじめ(受けている/見聞きした)
    Bullying,
    /// 詐欺(遭いそうになっている/遭った)
    Fraud,
    /// 危険物(爆発物・毒物・違法薬物等)の作り方
    DangerousItems,
}

impl SafetyCategory {
    pub fn label(&self) -> &'static str {
        match self {
            SafetyCategory::SelfHarm => "自傷・自殺に関する内容",
            SafetyCategory::ViolenceToOthers => "他人への暴力に関する内容",
            SafetyCategory::Sexual => "性的な内容",
            SafetyCategory::Crime => "犯罪行為に関する内容",
            SafetyCategory::PersonalInfoRisk => "個人情報を聞き出されそうな状況",
            SafetyCategory::Bullying => "いじめに関する内容",
            SafetyCategory::Fraud => "詐欺に関する内容",
            SafetyCategory::DangerousItems => "危険物に関する内容",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyAssessment {
    pub level: SafetyLevel,
    pub categories: Vec<SafetyCategory>,
    /// Dangerousの場合、LLMを呼ばずにこの文言をそのまま返すべき。
    pub fixed_response: Option<String>,
    /// Concerningの場合、system promptに追記すべき注意書き。
    pub extra_system_note: Option<String>,
}

// 「〜死にたい」「消えたい」等、直接的な自傷・希死念慮の表現。
// pii_guardと同様、全角/半角の揺れよりも表現のバリエーションの方が課題なので、
// 単純な部分文字列一致の配列で持つ(正規表現の複雑さに見合わないため)。
const SELF_HARM_KEYWORDS: &[&str] = &[
    "死にたい",
    "自殺",
    "消えたい",
    "リストカット",
    "リスカ",
    "自分を傷つけ",
    "生きてる意味がない",
    "生きる意味がない",
];

const VIOLENCE_TO_OTHERS_KEYWORDS: &[&str] = &[
    "殺してやる",
    "殺したい",
    "ナイフで刺す",
    "刺してやる",
    "ぶっ殺",
];

const SEXUAL_KEYWORDS: &[&str] = &[
    "エッチな話", "アダルト", "セックス", "ポルノ", "裸の写真",
];

const CRIME_KEYWORDS: &[&str] = &[
    "万引き", "盗み方", "薬物の作り方", "違法薬物", "覚醒剤",
];

const DANGEROUS_ITEM_KEYWORDS: &[&str] = &[
    "爆弾の作り方", "爆発物の作り方", "火薬の作り方", "毒の作り方", "毒物の作り方",
];

const FRAUD_KEYWORDS: &[&str] = &[
    "詐欺にあった", "騙された", "お金を払えと言われ", "フィッシング",
];

const BULLYING_KEYWORDS: &[&str] = &[
    "いじめられ", "無視される", "仲間はずれ", "仲間外れ", "悪口を言われ",
];

// 「知らない人に住所を聞かれた」のような、被害的な文脈での個人情報リスク。
// pii_guard.rs は「今まさに個人情報を書こうとしている」入力そのものを検出するのに対し、
// こちらは「個人情報を聞き出されそうになっている状況の相談」を拾う。
static PERSONAL_INFO_RISK_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(知らない人|見知らぬ人|ネットで知り合った人).{0,15}(住所|電話番号|名前|写真).{0,10}(聞かれ|教えてと言われ|送ってと言われ)").unwrap()
});

fn contains_any(text: &str, keywords: &[&str]) -> bool {
    keywords.iter().any(|kw| text.contains(kw))
}

/// 24時間子供SOSダイヤル(文部科学省, 0120-0-78310)とチャイルドライン
/// (NPO法人チャイルドライン支援センター, 0120-99-7777)は、いずれも
/// 文部科学省・厚生労働省の公式ページに掲載されている全国共通・無料の窓口。
/// (出典: 文部科学省「児童生徒の主な相談窓口一覧」、厚生労働省まもろうよ こころ)
fn self_harm_fixed_response() -> String {
    "そのことについて、すごく苦しい気持ちを抱えているんだね。話してくれてありがとう。\n\
     とても大事なことだから、AIとのチャットだけで終わらせず、必ず信頼できる大人\
     (家族・先生・保健室の先生など)に今の気持ちを伝えてほしい。\n\
     もし今すぐ誰かに話したいときは、こういう窓口もあるよ。\n\
     ・24時間子供SOSダイヤル(文部科学省): 0120-0-78310(24時間・無料)\n\
     ・チャイルドライン: 0120-99-7777(毎日16:00〜21:00・無料、名前を言わなくてもOK)\n\
     ひとりで抱え込まなくて大丈夫。".to_string()
}

fn violence_or_dangerous_items_fixed_response() -> String {
    "ごめんね、その内容には答えられないよ。\n\
     もし誰かを傷つけたい気持ちや、危険なことが頭に浮かんでいるなら、\
     ひとりで抱え込まずに、信頼できる大人(家族・先生など)に今の気持ちを話してみてね。\n\
     ・24時間子供SOSダイヤル(文部科学省): 0120-0-78310(24時間・無料)".to_string()
}

fn sexual_or_crime_fixed_response() -> String {
    "ごめんね、その内容についてはお話しできないよ。\n\
     気になることがあれば、信頼できる大人(家族・先生など)に相談してみてね。".to_string()
}

/// ユーザーの発話(匿名化前後どちらでも可。キーワード一致に固有名詞は使っていない)を
/// 評価し、SafetyAssessmentを返す。推論(モデル呼び出し)は一切行わない、
/// 純粋な同期関数なのでテストしやすい。
pub fn assess(text: &str) -> SafetyAssessment {
    let mut categories = Vec::new();

    if contains_any(text, SELF_HARM_KEYWORDS) {
        categories.push(SafetyCategory::SelfHarm);
    }
    if contains_any(text, VIOLENCE_TO_OTHERS_KEYWORDS) {
        categories.push(SafetyCategory::ViolenceToOthers);
    }
    if contains_any(text, SEXUAL_KEYWORDS) {
        categories.push(SafetyCategory::Sexual);
    }
    if contains_any(text, CRIME_KEYWORDS) {
        categories.push(SafetyCategory::Crime);
    }
    if contains_any(text, DANGEROUS_ITEM_KEYWORDS) {
        categories.push(SafetyCategory::DangerousItems);
    }
    if contains_any(text, FRAUD_KEYWORDS) {
        categories.push(SafetyCategory::Fraud);
    }
    if contains_any(text, BULLYING_KEYWORDS) {
        categories.push(SafetyCategory::Bullying);
    }
    if PERSONAL_INFO_RISK_RE.is_match(text) {
        categories.push(SafetyCategory::PersonalInfoRisk);
    }

    // Dangerous: LLMに自由判断させず、決定的に固定応答を返すべきカテゴリ。
    // (自傷・他害・性的内容・犯罪・危険物は、小さいモデルの都度の判断に委ねるにはリスクが高い)
    let dangerous_categories: Vec<SafetyCategory> = categories
        .iter()
        .copied()
        .filter(|c| {
            matches!(
                c,
                SafetyCategory::SelfHarm
                    | SafetyCategory::ViolenceToOthers
                    | SafetyCategory::Sexual
                    | SafetyCategory::Crime
                    | SafetyCategory::DangerousItems
            )
        })
        .collect();

    if !dangerous_categories.is_empty() {
        // 自傷・自殺が含まれる場合は、それを最優先の応答にする
        // (他のカテゴリと同時検出されても、最も配慮が必要な内容を優先するため)。
        let fixed_response = if dangerous_categories.contains(&SafetyCategory::SelfHarm) {
            self_harm_fixed_response()
        } else if dangerous_categories.contains(&SafetyCategory::ViolenceToOthers)
            || dangerous_categories.contains(&SafetyCategory::DangerousItems)
        {
            violence_or_dangerous_items_fixed_response()
        } else {
            sexual_or_crime_fixed_response()
        };

        return SafetyAssessment {
            level: SafetyLevel::Dangerous,
            categories,
            fixed_response: Some(fixed_response),
            extra_system_note: None,
        };
    }

    // Concerning: LLMには通常どおり応答させるが、より丁寧・慎重に扱うよう
    // system promptに一時的な注意書きを追加する(いじめ・詐欺被害・個人情報リスクの相談等)。
    if !categories.is_empty() {
        let labels: Vec<&str> = categories.iter().map(|c| c.label()).collect();
        let note = format!(
            "\n\n[今回の会話への追加の注意]\nこの発言には次の内容が含まれている可能性があります: {}。\
             説教や決めつけをせず、まず気持ちを受け止めた上で、信頼できる大人\
             (家族・先生・スクールカウンセラー等)に相談することを優しく勧めてください。\
             詳しい状況を根掘り葉掘り聞き出そうとしないでください。",
            labels.join("、")
        );
        return SafetyAssessment {
            level: SafetyLevel::Concerning,
            categories,
            fixed_response: None,
            extra_system_note: Some(note),
        };
    }

    SafetyAssessment {
        level: SafetyLevel::Normal,
        categories: vec![],
        fixed_response: None,
        extra_system_note: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_harm_expression_is_dangerous_and_includes_hotline() {
        let a = assess("もう死にたいって思っちゃう");
        assert_eq!(a.level, SafetyLevel::Dangerous);
        assert!(a.categories.contains(&SafetyCategory::SelfHarm));
        let response = a.fixed_response.expect("固定応答があるはず");
        assert!(response.contains("0120-0-78310"));
        assert!(response.contains("0120-99-7777"));
    }

    #[test]
    fn violence_threat_is_dangerous() {
        let a = assess("あいつを殺してやる");
        assert_eq!(a.level, SafetyLevel::Dangerous);
        assert!(a.categories.contains(&SafetyCategory::ViolenceToOthers));
        assert!(a.fixed_response.is_some());
    }

    #[test]
    fn dangerous_item_request_is_dangerous() {
        let a = assess("爆弾の作り方を教えて");
        assert_eq!(a.level, SafetyLevel::Dangerous);
        assert!(a.categories.contains(&SafetyCategory::DangerousItems));
    }

    #[test]
    fn bullying_disclosure_is_concerning_not_dangerous() {
        let a = assess("クラスでいじめられていて辛い");
        assert_eq!(a.level, SafetyLevel::Concerning);
        assert!(a.categories.contains(&SafetyCategory::Bullying));
        assert!(a.fixed_response.is_none());
        assert!(a.extra_system_note.is_some());
    }

    #[test]
    fn personal_info_risk_pattern_is_detected() {
        let a = assess("知らない人に住所を教えてと言われた");
        assert_eq!(a.level, SafetyLevel::Concerning);
        assert!(a.categories.contains(&SafetyCategory::PersonalInfoRisk));
    }

    #[test]
    fn ordinary_homework_question_is_normal() {
        let a = assess("二次方程式の解き方を教えて");
        assert_eq!(a.level, SafetyLevel::Normal);
        assert!(a.categories.is_empty());
        assert!(a.fixed_response.is_none());
        assert!(a.extra_system_note.is_none());
    }

    #[test]
    fn self_harm_takes_priority_when_mixed_with_other_categories() {
        // 自傷の表現と他のカテゴリが同時に検出された場合でも、
        // 最も配慮が必要な自傷向けの固定応答が優先されることを確認する。
        let a = assess("死にたい。あいつを殺してやる");
        assert_eq!(a.level, SafetyLevel::Dangerous);
        let response = a.fixed_response.expect("固定応答があるはず");
        assert!(response.contains("0120-99-7777"), "自傷向けの応答が優先されるべき");
    }
}
