
//! 「生徒が自分で答えようとした発言だったか」の判定は、この関数の中で
//! 自然言語から自動推定するのではなく、呼び出し側(フロントエンド)が
//! 明示的に伝える(`user_attempted: bool`)設計にしている。
//! 正規表現やLLMに「これは回答の試みか、それとも脱線か」を自動判定させるのは
//! 誤判定のリスクが高く、教育アプリでは「生徒の申告をそのまま信じて進める」方が
//! シンプルで、事故った時の被害も小さいと判断したため
//! (フロントエンド側でボタン等により明示させる想定。このリポジトリでは
//! バックエンドの状態管理と、そのAPI面のみを実装している。
//! フロントエンドのUI配線 — ヒント表示ボタン・「自分で考えてみる」入力欄等 — は
//! 別途のUI/UX検討が必要なため、今回のスコープには含めていない)。

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TutorStage {
    Understand,
    Hint1,
    Hint2,
    Hint3,
    Explanation,
    Check,
}

impl TutorStage {
    /// このステージでLLMに何をさせるかの指示文。system promptに追記して使う。
    /// 各ステージで「これ以上のことをしない」よう明示的に縛ることで、
    /// 小さいモデルでも段階を飛び越えにくくしている。
    pub fn instruction(&self) -> &'static str {
        match self {
            TutorStage::Understand => {
                "\n\n[今の段階: 問題の理解確認]\n\
                 まだヒントは出さないでください。まず生徒が問題の意味を正しく\
                 理解できているか、短い言葉で確認する質問を1つだけしてください。\
                 答えや解き方には一切触れないでください。"
            }
            TutorStage::Hint1 => {
                "\n\n[今の段階: ヒント1/3]\n\
                 答えそのものは絶対に言わないでください。最初の、最も控えめな\
                 ヒント(考え方の方向性だけ)を1つだけ出してください。"
            }
            TutorStage::Hint2 => {
                "\n\n[今の段階: ヒント2/3]\n\
                 答えそのものは絶対に言わないでください。前のヒントより\
                 一歩踏み込んだ、2つ目のヒントを1つだけ出してください。"
            }
            TutorStage::Hint3 => {
                "\n\n[今の段階: ヒント3/3(最後のヒント)]\n\
                 答えそのものは絶対に言わないでください。ほぼ答えにたどり着ける\
                 くらい具体的な、最後のヒントを1つだけ出してください。"
            }
            TutorStage::Explanation => {
                "\n\n[今の段階: 種明かし]\n\
                 ここで初めて、答えと、そこに至る考え方をわかりやすく\
                 説明してください。"
            }
            TutorStage::Check => {
                "\n\n[今の段階: 理解度確認]\n\
                 説明した内容が伝わったか、生徒自身の言葉で説明してもらう\
                 短い質問を1つしてください。"
            }
        }
    }

    /// 現在の段階と「生徒が回答を試みたか」から、次の段階を決定する
    /// (LLMには委ねない、決定的なロジック)。
    fn next(self, user_attempted: bool) -> TutorStage {
        use TutorStage::*;
        match (self, user_attempted) {
            // Understandへの応答は「試みたか」によらず、必ずHint1へ進む
            // (理解確認の質問に答えてもらえた時点で次のヒントへ)。
            (Understand, _) => Hint1,
            (Hint1, true) => Hint2,
            (Hint2, true) => Hint3,
            (Hint3, true) => Explanation,
            (Explanation, _) => Check,
            // Checkは終端。新しい問題には新しいsession_idで別セッションを始める想定。
            (Check, _) => Check,
            // 「試みていない」(別の話題に逸れた等)場合は同じ段階に留まり、
            // もう一度チャンスを与える。
            (stage, false) => stage,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TutorSessionInfo {
    pub session_id: String,
    pub stage: TutorStage,
}

#[derive(Debug, Clone)]
pub(crate) struct TutorSession {
    stage: TutorStage,
}

/// session_id(フロントエンドがUUID等で発行する、1つの宿題設問ごとの識別子)ごとに
/// 現在の段階を保持する。プロセス内メモリのみで完結し、ディスクにも書かない
/// (ネットワーク通信は当然発生しない)。
pub type SharedTutorState = Arc<Mutex<HashMap<String, TutorSession>>>;

pub fn new_shared_state() -> SharedTutorState {
    Arc::new(Mutex::new(HashMap::new()))
}

/// 新しい問題に取り組み始めるときに呼ぶ。session_idが既に存在する場合は
/// Understandへ上書きリセットする(生徒が「別の問題」として明示的に
/// 開始し直した場合の想定)。
pub async fn start_session(state: &SharedTutorState, session_id: String) -> TutorSessionInfo {
    let stage = TutorStage::Understand;
    state
        .lock()
        .await
        .insert(session_id.clone(), TutorSession { stage });
    TutorSessionInfo { session_id, stage }
}

/// 生徒の返答を受けて次の段階へ進める。session_idが見つからない場合
/// (アプリ再起動でプロセス内状態が失われた等)は、Understandから
/// 新規に開始したものとして扱う(次の段階はnext()の(Understand, _) => Hint1に従う)。
pub async fn advance_session(
    state: &SharedTutorState,
    session_id: String,
    user_attempted: bool,
) -> TutorSessionInfo {
    let mut guard = state.lock().await;
    let entry = guard
        .entry(session_id.clone())
        .or_insert(TutorSession {
            stage: TutorStage::Understand,
        });
    entry.stage = entry.stage.next(user_attempted);
    let stage = entry.stage;
    drop(guard);
    TutorSessionInfo { session_id, stage }
}

#[cfg(test)]
mod tests {
    use super::*;
    use TutorStage::*;

    #[test]
    fn full_progression_when_student_always_attempts() {
        let mut stage = Understand;
        let expected = [Hint1, Hint2, Hint3, Explanation, Check];
        for exp in expected {
            stage = stage.next(true);
            assert_eq!(stage, exp);
        }
        // Checkは終端: これ以上進まない
        assert_eq!(stage.next(true), Check);
        assert_eq!(stage.next(false), Check);
    }

    #[test]
    fn staying_on_same_hint_when_student_did_not_attempt() {
        // Hint1で「試みなかった」場合、Hint2へは進まずHint1に留まる
        assert_eq!(Hint1.next(false), Hint1);
        assert_eq!(Hint2.next(false), Hint2);
        assert_eq!(Hint3.next(false), Hint3);
    }

    #[test]
    fn understand_always_advances_to_hint1_regardless_of_attempted_flag() {
        assert_eq!(Understand.next(true), Hint1);
        assert_eq!(Understand.next(false), Hint1);
    }

    #[test]
    fn each_stage_instruction_forbids_or_reveals_answer_appropriately() {
        // Hint系のステージでは「答えを言わない」指示が必ず含まれ、
        // Explanationでのみ答えを明かしてよいことが分かるようにする回帰テスト。
        for stage in [Hint1, Hint2, Hint3] {
            assert!(
                stage.instruction().contains("答えそのものは絶対に言わないでください"),
                "{stage:?} の指示文には「答えを言わない」制約が含まれるべき"
            );
        }
        assert!(Explanation.instruction().contains("答え"));
        assert!(!Explanation.instruction().contains("絶対に言わないでください"));
    }

    #[tokio::test]
    async fn start_session_always_begins_at_understand() {
        let state = new_shared_state();
        let info = start_session(&state, "s1".to_string()).await;
        assert_eq!(info.stage, Understand);
    }

    #[tokio::test]
    async fn advance_session_persists_state_across_calls() {
        let state = new_shared_state();
        start_session(&state, "s1".to_string()).await;

        let info1 = advance_session(&state, "s1".to_string(), true).await;
        assert_eq!(info1.stage, Hint1);

        let info2 = advance_session(&state, "s1".to_string(), true).await;
        assert_eq!(info2.stage, Hint2);
    }

    #[tokio::test]
    async fn advance_session_without_prior_start_begins_from_understand() {
        // アプリ再起動等でsession_idの状態が失われているケースを模倣。
        let state = new_shared_state();
        let info = advance_session(&state, "unknown".to_string(), true).await;
        assert_eq!(info.stage, Hint1, "Understandから始まってHint1へ進むはず");
    }

    #[tokio::test]
    async fn different_sessions_do_not_interfere_with_each_other() {
        let state = new_shared_state();
        start_session(&state, "s1".to_string()).await;
        start_session(&state, "s2".to_string()).await;

        let s1 = advance_session(&state, "s1".to_string(), true).await;
        assert_eq!(s1.stage, Hint1);
        let s1_again = advance_session(&state, "s1".to_string(), true).await;
        assert_eq!(s1_again.stage, Hint2);

        // s2は独立したセッションなので、s1がHint2まで進んでも影響を受けない。
        // (Understandからの遷移はattemptedによらず必ずHint1へ進む仕様なので、
        // ここではHint1到達後に「試みなかった」場合に足踏みすることを確認する)
        let s2 = advance_session(&state, "s2".to_string(), true).await;
        assert_eq!(s2.stage, Hint1, "s2はs1と独立してUnderstand→Hint1のはず");
        let s2_stalled = advance_session(&state, "s2".to_string(), false).await;
        assert_eq!(s2_stalled.stage, Hint1, "試みなかった場合はHint1に留まるはず");
    }
}
