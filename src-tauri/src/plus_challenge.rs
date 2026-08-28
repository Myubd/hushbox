//! プラスチャレンジ: 義務教育よりさらに発展した、AI・プライバシー・情報社会についての
//! 上級クイズ(問題データは未投入)。
//!
//! 学習ドリル(learning_drill.rs)と同じ「非AI・ルールベース」の設計方針を踏襲する想定。
//! 出題・採点にLLMは使わず、正解はこの端末内のメモリ(SharedDrillState)にのみ保持する。
//!
//! 現在はまだ問題データが入っていない、まっさらな状態。
//! 今後、独自に用意した問題をここに追加していく。
//!
//! 追加方法の一例(学習ドリルと同じ形):
//!   1. `ChallengeQuestion { question, choices, correct_index, category, explanation, notes }`
//!      の配列(`*_BANK`)を定義する。
//!   2. `categories()` に、そのカテゴリを表す `ChallengeCategory` を追加する。
//!   3. `generate()` の中で、その `*_BANK` から問題を選んで
//!      `(DrillProblem::Choice { .. }, PendingAnswer { .. })` を組み立てて返す。

use crate::learning_drill::{DrillProblem, PendingAnswer};

/// カテゴリの選択肢(UIのチップ表示用)。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChallengeCategory {
    pub id: String,
    pub label: String,
    pub icon: String,
}

/// カテゴリ一覧。問題データがまだ無いため、現状は空。
pub fn categories() -> Vec<ChallengeCategory> {
    vec![]
}

/// 新しい問題を1問生成する。問題データがまだ無いため、常に `None` を返す。
/// 問題を追加したら、ここで `Some((problem, pending))` を返すようにする。
pub fn generate(_category: Option<&str>) -> Option<(DrillProblem, PendingAnswer)> {
    None
}
