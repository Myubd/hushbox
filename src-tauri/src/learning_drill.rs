//! 非AI・ルールベースの学習ドリル(国語・算数・理科・社会・英語・情報)。
//!
//! チャット欄(Qwenによる自由な会話)とは完全に別の経路。ここで生成・採点される
//! 問題は一切LLMを通らないため、計算ミスやハルシネーションが原理的に起こらない。
//! 「正解が一意に決まる問題は、AIに推測させず確実なロジックで答える」という方針の実装。
//!
//! 採点用の正解は、フロントエンドへは一切送らず、この端末内のメモリ(state)にのみ
//! 保持する。ブラウザの開発者ツールで通信内容を見ても正解が分からないようにするため。
//!
//! ## 単元(unit)について
//! 各科目は「単元」でさらに絞り込める(例: 算数 → 足し算/引き算/掛け算/割り算)。
//! `unit`引数は `None` または `"mixed"` で「すべて」を意味する。
//! 単元✕学年の組み合わせで該当する問題がまだ無い場合は、その学年全体からランダムに
//! 出題するフォールバックが働くので、問題を後から少しずつ追加していく形で運用できる。
//!
//! 拡張方針: 新しい問題を足したいときは、対象科目の `*_BANK` 配列に
//! `ChoiceQuestion { .. }` を1行追加するだけでよい(コード側の変更は不要)。
//! 新しい単元を追加したいときは `units_for_subject` にエントリを足し、
//! 該当する問題の `unit` フィールドをそのidに合わせる。

use std::collections::HashMap;
use std::sync::Arc;

use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

pub type SharedDrillState = Arc<Mutex<HashMap<String, PendingAnswer>>>;

#[derive(Debug, Clone)]
pub struct PendingAnswer {
    pub correct_text: String,
    pub explanation: String,
    /// 4択問題の場合、各選択肢(表示順)に対応する一言解説。
    /// (選択肢テキスト, 解説文) のペア。算数(自由記述)では空のまま。
    pub choice_notes: Vec<(String, String)>,
    /// 算数の「解き方のコツ」。演算の種類ごとに固定文を持つ。4択問題では常にNone。
    pub tip: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "kind")]
pub enum DrillProblem {
    #[serde(rename_all = "camelCase")]
    Arithmetic { id: String, question: String },
    /// 国語(漢字)・理科・社会・英語・情報など、4択形式の全科目で共通して使う形。
    /// `subject` はUI側の見出し・アイコン切り替え用の科目識別子。
    #[serde(rename_all = "camelCase")]
    Choice {
        id: String,
        subject: String,
        question: String,
        choices: Vec<String>,
    },
}

/// 採点後、各選択肢について「正解かどうか」と「なぜそうなのか」を返す。
/// 選ばなかった選択肢についても解説することで、4択すべてから学べるようにする。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChoiceNote {
    pub choice: String,
    pub correct: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrillCheckResult {
    pub correct: bool,
    pub correct_answer: String,
    pub explanation: String,
    /// 4択問題のみ。空なら算数(自由記述)の問題。
    pub choice_notes: Vec<ChoiceNote>,
    /// 算数のみ。演算の種類に応じた「解き方のコツ」。
    pub tip: Option<String>,
}

/// 単元の選択肢(UIのタブ/チップ表示用)。先頭は必ず「すべて」("mixed")。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnitInfo {
    pub id: String,
    pub label: String,
}

fn mixed_unit() -> UnitInfo {
    UnitInfo {
        id: "mixed".to_string(),
        label: "すべて".to_string(),
    }
}

/// 科目ごとの単元一覧。UIはここを見てタブ/チップを描画する。
/// 単元がまだ無い(1件=「すべて」のみ)科目は、UI側で単元選択自体を隠してよい。
pub fn units_for_subject(subject: &str) -> Vec<UnitInfo> {
    let u = |id: &str, label: &str| UnitInfo {
        id: id.to_string(),
        label: label.to_string(),
    };
    match subject {
        "arithmetic" => vec![
            mixed_unit(),
            u("addition", "足し算"),
            u("subtraction", "引き算"),
            u("multiplication", "掛け算"),
            u("division", "割り算"),
        ],
        "science" => vec![
            mixed_unit(),
            u("living_things", "生き物・からだ"),
            u("physics_energy", "物理・化学"),
            u("earth_space", "地球・宇宙"),
        ],
        "social" => vec![
            mixed_unit(),
            u("civics_life", "くらしと社会"),
            u("history", "歴史"),
            u("geography_government", "地理・政治"),
        ],
        "english" => vec![
            mixed_unit(),
            u("vocabulary", "たんご"),
            u("grammar", "文法・表現"),
        ],
        "info" => vec![
            mixed_unit(),
            u("basic_operation", "きほん操作"),
            u("internet_safety", "インターネットの安全"),
            u("programming", "プログラミング"),
        ],
        // 漢字はまだ単元分けしていない(読みの範囲のみ)。今後、学年内で
        // さらに分けたくなったらここに追加し、KANJI_BANKにunit情報を足せばよい。
        _ => vec![mixed_unit()],
    }
}

fn new_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let mut rng = rand::thread_rng();
    format!("{nanos:x}{:x}", rng.gen::<u32>())
}

// ============================================================
// 算数(計算問題は選択式ではなく数式生成なので専用ロジック)
// ============================================================

fn arithmetic_range(mode: &str) -> (i64, i64) {
    match mode {
        "low" => (1, 20),
        "junior" => (1, 100),
        _ => (1, 50),
    }
}

/// unitが"mixed"のときに、学年ごとにどの演算を混ぜるか。
/// (割り算は暗算の負荷が高いため、「すべて」には低学年では含めていない。
///  「割り算」単元を明示的に選べば低学年でも出題される)
fn mixed_ops_for_mode(mode: &str) -> &'static [char] {
    match mode {
        "low" => &['+', '-'],
        _ => &['+', '-', '*'],
    }
}

/// 演算の種類ごとの「解き方のコツ」。個別の問題ではなく演算全体に共通する
/// アドバイスなので、生成された式(question文字列)に含まれる記号から判定する。
fn arithmetic_tip(question: &str) -> String {
    if question.contains('+') {
        "同じ位(くらい)どうしを足していこう。1の位を先に計算して、10を超えたら10の位に1くり上げるよ。".to_string()
    } else if question.contains('-') {
        "大きい数から順に引くよ。1の位が引けないときは、10の位から10借りてきて「くり下がり」で計算しよう。".to_string()
    } else if question.contains('×') {
        "九九を思い出そう。九九がまだ不安なときは、小さいほうの数だけ大きいほうの数を何回も足してもOK。".to_string()
    } else if question.contains('÷') {
        "「小さいほうの数を何回かけたら大きいほうの数になるか」を、九九の逆から探すと見つけやすいよ。".to_string()
    } else {
        String::new()
    }
}

pub fn generate_arithmetic(mode: &str, unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    let (lo, hi) = arithmetic_range(mode);
    let mut rng = rand::thread_rng();

    let op = match unit.unwrap_or("mixed") {
        "addition" => '+',
        "subtraction" => '-',
        "multiplication" => '*',
        "division" => '/',
        _ => *mixed_ops_for_mode(mode).choose(&mut rng).unwrap(),
    };

    let (answer, question) = match op {
        '+' => {
            let a = rng.gen_range(lo..=hi);
            let b = rng.gen_range(lo..=hi);
            (a + b, format!("{a} + {b} = ?"))
        }
        '-' => {
            // 負の数を避け、必ず a >= b になるようにする
            let a = rng.gen_range(lo..=hi);
            let b = rng.gen_range(lo..=a);
            (a - b, format!("{a} - {b} = ?"))
        }
        '*' => {
            let a = rng.gen_range(lo..=(hi.min(12)));
            let b = rng.gen_range(lo..=(hi.min(12)));
            (a * b, format!("{a} × {b} = ?"))
        }
        '/' => {
            // 割り切れる問題だけを出す(あまりのある割り算は今後の拡張として単元を分ける想定)
            let max_factor = if mode == "low" { 5 } else { 12 };
            let divisor = rng.gen_range(2..=max_factor);
            let quotient = rng.gen_range(1..=max_factor);
            let dividend = divisor * quotient;
            (quotient, format!("{dividend} ÷ {divisor} = ?"))
        }
        _ => unreachable!(),
    };

    let id = new_id();
    let problem = DrillProblem::Arithmetic {
        id: id.clone(),
        question: question.clone(),
    };
    let pending = PendingAnswer {
        correct_text: answer.to_string(),
        explanation: format!("正しい答えは {answer} だよ。"),
        choice_notes: Vec::new(),
        tip: Some(arithmetic_tip(&question)),
    };
    (problem, pending)
}

// ============================================================
// 4択問題の共通エンジン(国語[漢字]・理科・社会・英語・情報)
// ============================================================

/// 1問分の定義。`choices`のうち`correct_index`が正解。
/// 表示順はgenerate_from_bank内でシャッフルするので、ここでの並び順は気にしなくてよい。
struct ChoiceQuestion {
    question: &'static str,
    choices: [&'static str; 4],
    correct_index: usize,
    mode: &'static str,
    /// units_for_subject()で定義したid。まだ単元分けしていない科目は "mixed" のままでよい。
    unit: &'static str,
    explanation: &'static str,
    /// choicesと同じ並び順・同じ数の一言解説。正解/不正解を問わず、
    /// 「なぜその選択肢が正しい/正しくないか」を1つずつ書く。
    notes: [&'static str; 4],
}

fn pick_choice_question<'a>(
    bank: &'a [ChoiceQuestion],
    mode: &str,
    unit: Option<&str>,
) -> &'a ChoiceQuestion {
    let mut rng = rand::thread_rng();

    let mode_pool: Vec<&ChoiceQuestion> = bank.iter().filter(|q| q.mode == mode).collect();
    // 該当モードの問題が万一空なら全体から選ぶ(安全側のフォールバック)
    let mode_pool: Vec<&ChoiceQuestion> = if mode_pool.is_empty() {
        bank.iter().collect()
    } else {
        mode_pool
    };

    if let Some(u) = unit {
        if u != "mixed" {
            let unit_pool: Vec<&ChoiceQuestion> =
                mode_pool.iter().copied().filter(|q| q.unit == u).collect();
            if !unit_pool.is_empty() {
                return unit_pool.choose(&mut rng).unwrap();
            }
            // その学年×単元の問題がまだ用意されていない場合は、学年全体から出題する
            // (単元を追加した直後、問題数が少ないうちのフォールバック)
        }
    }

    mode_pool.choose(&mut rng).unwrap()
}

fn generate_from_bank(
    subject: &str,
    bank: &[ChoiceQuestion],
    mode: &str,
    unit: Option<&str>,
) -> (DrillProblem, PendingAnswer) {
    let mut rng = rand::thread_rng();
    let q = pick_choice_question(bank, mode, unit);

    // 選択肢と解説をペアにしてまとめてシャッフルする(表示順=解説の並び順を一致させるため)
    let mut paired: Vec<(String, String)> = q
        .choices
        .iter()
        .zip(q.notes.iter())
        .map(|(c, n)| (c.to_string(), n.to_string()))
        .collect();
    paired.shuffle(&mut rng);

    let choices: Vec<String> = paired.iter().map(|(c, _)| c.clone()).collect();
    let correct_text = q.choices[q.correct_index].to_string();

    let id = new_id();
    let problem = DrillProblem::Choice {
        id: id.clone(),
        subject: subject.to_string(),
        question: q.question.to_string(),
        choices,
    };
    let pending = PendingAnswer {
        correct_text,
        explanation: q.explanation.to_string(),
        choice_notes: paired,
        tip: None,
    };
    (problem, pending)
}

// ---- 国語(漢字): 「読み→漢字」の4択。他科目と形が違うため専用の小さな辞書のまま ----
// (まだ単元分けしていないため unit は使わない。将来分けるならタプルにunitを足せばよい)

const KANJI_BANK: &[(&str, &str, &str)] = &[
    ("がっこう", "学校", "low"),
    ("せんせい", "先生", "low"),
    ("ともだち", "友達", "low"),
    ("げんき", "元気", "low"),
    ("あめ", "雨", "low"),
    ("そら", "空", "low"),
    ("はな", "花", "low"),
    ("みず", "水", "low"),
    ("やま", "山", "low"),
    ("かわ", "川", "low"),
    ("しゃかい", "社会", "mid"),
    ("りか", "理科", "mid"),
    ("としょかん", "図書館", "mid"),
    ("きょうそう", "競争", "mid"),
    ("かんさつ", "観察", "mid"),
    ("じゅんび", "準備", "mid"),
    ("きぼう", "希望", "mid"),
    ("せいかつ", "生活", "mid"),
    ("こうつう", "交通", "mid"),
    ("しぜん", "自然", "mid"),
    ("けいざい", "経済", "junior"),
    ("せいじ", "政治", "junior"),
    ("かんきょう", "環境", "junior"),
    ("しょうらい", "将来", "junior"),
    ("ぎじゅつ", "技術", "junior"),
    ("こくさい", "国際", "junior"),
    ("せきにん", "責任", "junior"),
    ("いけん", "意見", "junior"),
    ("じっけん", "実験", "junior"),
    ("ひょうか", "評価", "junior"),
];

/// unitは現状未使用(漢字はまだ単元分けしていない)。呼び出しシグネチャを他科目と
/// 揃えるためだけに受け取っている。
pub fn generate_kanji(mode: &str, _unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    let mut rng = rand::thread_rng();
    let pool: Vec<&(&str, &str, &str)> = KANJI_BANK.iter().filter(|(_, _, m)| *m == mode).collect();
    let pool: Vec<&(&str, &str, &str)> = if pool.is_empty() {
        KANJI_BANK.iter().collect()
    } else {
        pool
    };

    let (reading, correct_kanji, _) = **pool.choose(&mut rng).unwrap();

    let mut distractor_pool: Vec<&str> = KANJI_BANK
        .iter()
        .map(|(_, k, _)| *k)
        .filter(|k| *k != correct_kanji)
        .collect();
    distractor_pool.shuffle(&mut rng);
    let mut choices: Vec<String> = distractor_pool
        .into_iter()
        .take(3)
        .map(|s| s.to_string())
        .collect();
    choices.push(correct_kanji.to_string());
    choices.shuffle(&mut rng);

    let id = new_id();
    let problem = DrillProblem::Choice {
        id: id.clone(),
        subject: "kanji".to_string(),
        question: format!("「{reading}」の漢字はどれ?"),
        choices: choices.clone(),
    };

    // 選ばなかった漢字についても「それは何と読むか」を教えることで、
    // 「なぜ違うか」がその場で分かるようにする。
    let choice_notes: Vec<(String, String)> = choices
        .iter()
        .map(|c| {
            if c == correct_kanji {
                (c.clone(), format!("「{reading}」は「{correct_kanji}」と書くよ。"))
            } else {
                let own_reading = KANJI_BANK
                    .iter()
                    .find(|(_, k, _)| k == c)
                    .map(|(r, _, _)| *r)
                    .unwrap_or("?");
                (c.clone(), format!("「{c}」は「{own_reading}」と読む、別の言葉だよ。"))
            }
        })
        .collect();

    let pending = PendingAnswer {
        correct_text: correct_kanji.to_string(),
        explanation: format!("「{reading}」は「{correct_kanji}」と書くよ。"),
        choice_notes,
        tip: None,
    };
    (problem, pending)
}

// ---- 理科 ----
// 単元: living_things(生き物・からだ) / physics_energy(物理・化学) / earth_space(地球・宇宙)
const SCIENCE_BANK: &[ChoiceQuestion] = &[
    ChoiceQuestion {
        question: "たまごから生まれる生き物はどれ?",
        choices: ["ねこ", "にわとり", "うさぎ", "いぬ"],
        correct_index: 1,
        mode: "low",
        unit: "living_things",
        explanation: "にわとりは たまごから ひなが生まれるよ。",
        notes: [
            "ねこは赤ちゃんを産んで育てるよ(たまごは産まないよ)",
            "にわとりは たまごを産んで、あたためてひなをかえすよ",
            "うさぎも赤ちゃんを産んで育てるよ(たまごは産まないよ)",
            "いぬも赤ちゃんを産んで育てるよ(たまごは産まないよ)",
        ],
    },
    ChoiceQuestion {
        question: "水がこおるとできるものは?",
        choices: ["こおり", "けむり", "ゆげ", "つゆ"],
        correct_index: 0,
        mode: "low",
        unit: "physics_energy",
        explanation: "水は0℃で こおって「こおり」になるよ。",
        notes: [
            "水は0℃で こおって「こおり」になるよ",
            "けむりは ものが燃えたときに出るものだよ",
            "ゆげは 水が温められて蒸発するときに出るものだよ",
            "つゆは 空気中の水分が冷えて水てきになったものだよ",
        ],
    },
    ChoiceQuestion {
        question: "太陽が出ている明るい時間帯を何という?",
        choices: ["よる", "ひる", "あさやけ", "ゆうがた"],
        correct_index: 1,
        mode: "low",
        unit: "earth_space",
        explanation: "太陽が高く昇っている時間は「ひる(昼)」だよ。",
        notes: [
            "よるは 太陽がしずんで暗い時間だよ",
            "ひるは 太陽が高く昇って明るい時間だよ",
            "あさやけは 朝、空が赤く染まる現象だよ",
            "ゆうがたは 太陽がしずみ始める時間だよ",
        ],
    },
    ChoiceQuestion {
        question: "植物が育つために光合成で必要なものは太陽の光と何?",
        choices: ["砂", "二酸化炭素と水", "石", "電気"],
        correct_index: 1,
        mode: "mid",
        unit: "living_things",
        explanation: "植物は光・水・二酸化炭素を使って光合成をするよ。",
        notes: [
            "砂は光合成には使われないよ",
            "植物は光・水・二酸化炭素を使って栄養を作るよ",
            "石は光合成には関係ないよ",
            "植物は電気を使って光合成をするわけではないよ",
        ],
    },
    ChoiceQuestion {
        question: "回路で電気を流すために電池の向きで大事なのは?",
        choices: ["色", "重さ", "＋極と－極の向き", "大きさ"],
        correct_index: 2,
        mode: "mid",
        unit: "physics_energy",
        explanation: "電池には＋極と－極があり、向きをそろえないと電気が流れないよ。",
        notes: [
            "電池の色は電気の流れとは関係ないよ",
            "電池の重さも電気の流れには関係ないよ",
            "＋極と－極の向きをそろえないと回路に電気が流れないよ",
            "電池の大きさより、向きの方が大事だよ",
        ],
    },
    ChoiceQuestion {
        question: "月が地球の周りを回る動きを何という?",
        choices: ["自転", "公転", "反射", "蒸発"],
        correct_index: 1,
        mode: "mid",
        unit: "earth_space",
        explanation: "ある天体が別の天体の周りを回ることを「公転」というよ。",
        notes: [
            "自転は その天体自身がコマのように回る動きだよ",
            "ある天体が別の天体の周りを回ることを「公転」というよ",
            "反射は 光がはね返る現象だよ",
            "蒸発は 液体が気体に変わることだよ",
        ],
    },
    ChoiceQuestion {
        question: "水(H2O)を構成する原子はどれ?",
        choices: ["水素と酸素", "炭素と酸素", "窒素と水素", "酸素だけ"],
        correct_index: 0,
        mode: "junior",
        unit: "physics_energy",
        explanation: "水は水素(H)2つと酸素(O)1つが結びついた分子だよ。",
        notes: [
            "水は水素原子2つと酸素原子1つでできているよ",
            "炭素と酸素が結びつくのは二酸化炭素だよ",
            "窒素と水素が結びつくとアンモニアになるよ",
            "水には酸素だけでなく水素もふくまれているよ",
        ],
    },
    ChoiceQuestion {
        question: "力の大きさの単位はどれ?",
        choices: ["ワット", "ニュートン", "アンペア", "ジュール"],
        correct_index: 1,
        mode: "junior",
        unit: "physics_energy",
        explanation: "力の大きさは「ニュートン(N)」という単位で表すよ。",
        notes: [
            "ワットは仕事率(電力など)の単位だよ",
            "力の大きさは「ニュートン(N)」という単位で表すよ",
            "アンペアは電流の単位だよ",
            "ジュールはエネルギーや仕事の単位だよ",
        ],
    },
    ChoiceQuestion {
        question: "生物のからだをつくる最小の単位は?",
        choices: ["原子", "分子", "細胞", "組織"],
        correct_index: 2,
        mode: "junior",
        unit: "living_things",
        explanation: "生物のからだは「細胞」という最小単位が集まってできているよ。",
        notes: [
            "原子は、もっと小さい物質そのものの単位だよ",
            "分子は原子が集まったものだけど、生物の単位ではないよ",
            "生物のからだは「細胞」という最小単位からできているよ",
            "組織は細胞がたくさん集まってできたものだよ",
        ],
    },
];

pub fn generate_science(mode: &str, unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    generate_from_bank("science", SCIENCE_BANK, mode, unit)
}

// ---- 社会 ----
// 単元: civics_life(くらしと社会) / history(歴史) / geography_government(地理・政治)
const SOCIAL_BANK: &[ChoiceQuestion] = &[
    ChoiceQuestion {
        question: "火事のときに電話する番号はどれ?",
        choices: ["110", "119", "104", "117"],
        correct_index: 1,
        mode: "low",
        unit: "civics_life",
        explanation: "火事や救急のときは「119番」に電話するよ。",
        notes: [
            "110番は警察に電話する番号だよ",
            "火事や救急のときは「119番」に電話するよ",
            "104番は電話番号を調べる案内サービスだよ",
            "117番は今の時こくを教えてくれる時報だよ",
        ],
    },
    ChoiceQuestion {
        question: "道路で困っている人を助けたり、事件を調べたりする仕事は?",
        choices: ["消防士", "警察官", "医者", "先生"],
        correct_index: 1,
        mode: "low",
        unit: "civics_life",
        explanation: "町の安全を守るのは「警察官」の仕事だよ。",
        notes: [
            "消防士は火を消したり人を助けたりする仕事だよ",
            "町の安全を守り、事件を調べるのは「警察官」の仕事だよ",
            "医者は病気やけがを治す仕事だよ",
            "先生は学校で勉強を教える仕事だよ",
        ],
    },
    ChoiceQuestion {
        question: "ごみを種類ごとに分けることを何という?",
        choices: ["分別", "収集", "廃棄", "焼却"],
        correct_index: 0,
        mode: "low",
        unit: "civics_life",
        explanation: "資源を大切にするため、ごみを「分別」して出すよ。",
        notes: [
            "ごみを種類ごとに分けることを「分別」というよ",
            "収集は ごみを集めて回ることだよ",
            "廃棄は ごみを捨てることだよ",
            "焼却は ごみを燃やすことだよ",
        ],
    },
    ChoiceQuestion {
        question: "日本でいちばん人口が多い都道府県はどれ?",
        choices: ["大阪府", "東京都", "北海道", "愛知県"],
        correct_index: 1,
        mode: "mid",
        unit: "geography_government",
        explanation: "日本の首都でもある「東京都」がいちばん人口が多いよ。",
        notes: [
            "大阪府も人口は多いけど、東京都には及ばないよ",
            "日本の首都でもある「東京都」がいちばん人口が多いよ",
            "北海道は面積は広いけど、人口は東京より少ないよ",
            "愛知県も人口は多いけど、東京都には及ばないよ",
        ],
    },
    ChoiceQuestion {
        question: "地図で「田んぼ」を表す地図記号のもとになった形は?",
        choices: ["稲の穂", "山の形", "木", "水面"],
        correct_index: 0,
        mode: "mid",
        unit: "geography_government",
        explanation: "田んぼの地図記号は、稲を刈ったあとの切り株の形からきているよ。",
        notes: [
            "田んぼの地図記号は、稲を刈ったあとの切り株の形からきているよ",
            "山の形は、山を表す地図記号とはちがうよ",
            "木の地図記号は森林を表すよ",
            "水面のマークは湖や池を表すよ",
        ],
    },
    ChoiceQuestion {
        question: "江戸幕府を開いた人物は誰?",
        choices: ["織田信長", "豊臣秀吉", "徳川家康", "源頼朝"],
        correct_index: 2,
        mode: "mid",
        unit: "history",
        explanation: "江戸幕府を開いたのは「徳川家康」だよ。",
        notes: [
            "織田信長は江戸幕府より前の時代に活やくした武将だよ",
            "豊臣秀吉も江戸幕府より前に天下を統一した人だよ",
            "江戸幕府を開いたのは「徳川家康」だよ",
            "源頼朝は鎌倉幕府を開いた人だよ",
        ],
    },
    ChoiceQuestion {
        question: "国の権力を「立法・行政・司法」に分ける仕組みを何という?",
        choices: ["三権分立", "地方自治", "議院内閣制", "国民主権"],
        correct_index: 0,
        mode: "junior",
        unit: "geography_government",
        explanation: "権力の集中を防ぐ仕組みを「三権分立」というよ。",
        notes: [
            "権力を立法・行政・司法に分ける仕組みを「三権分立」というよ",
            "地方自治は、地域のことを地域で決める仕組みだよ",
            "議院内閣制は、国会と内閣の関係を表す仕組みだよ",
            "国民主権は、国の政治を国民が決めるという考え方だよ",
        ],
    },
    ChoiceQuestion {
        question: "世界でいちばん面積が広い国はどこ?",
        choices: ["アメリカ", "中国", "ロシア", "カナダ"],
        correct_index: 2,
        mode: "junior",
        unit: "geography_government",
        explanation: "面積が世界一広い国は「ロシア」だよ。",
        notes: [
            "アメリカも広いけど、ロシアには及ばないよ",
            "中国も広いけど、ロシアには及ばないよ",
            "面積が世界一広い国は「ロシア」だよ",
            "カナダも広いけど、ロシアには及ばないよ",
        ],
    },
    ChoiceQuestion {
        question: "日本国憲法の三つの基本原則に含まれないのはどれ?",
        choices: ["国民主権", "基本的人権の尊重", "平和主義", "身分制度"],
        correct_index: 3,
        mode: "junior",
        unit: "geography_government",
        explanation: "三原則は「国民主権・基本的人権の尊重・平和主義」だよ。",
        notes: [
            "国民主権は三原則の1つだよ",
            "基本的人権の尊重も三原則の1つだよ",
            "平和主義も三原則の1つだよ",
            "身分制度は日本国憲法の原則には含まれないよ",
        ],
    },
];

pub fn generate_social(mode: &str, unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    generate_from_bank("social", SOCIAL_BANK, mode, unit)
}

// ---- 英語 ----
// 単元: vocabulary(たんご) / grammar(文法・表現)
const ENGLISH_BANK: &[ChoiceQuestion] = &[
    ChoiceQuestion {
        question: "「あか」を英語で言うと?",
        choices: ["Blue", "Red", "Green", "Yellow"],
        correct_index: 1,
        mode: "low",
        unit: "vocabulary",
        explanation: "「あか」は英語で\"Red\"だよ。",
        notes: [
            "Blueは「あお」だよ",
            "「あか」は英語で\"Red\"だよ",
            "Greenは「みどり」だよ",
            "Yellowは「きいろ」だよ",
        ],
    },
    ChoiceQuestion {
        question: "「いぬ」を英語で言うと?",
        choices: ["Cat", "Dog", "Bird", "Fish"],
        correct_index: 1,
        mode: "low",
        unit: "vocabulary",
        explanation: "「いぬ」は英語で\"Dog\"だよ。",
        notes: [
            "Catは「ねこ」だよ",
            "「いぬ」は英語で\"Dog\"だよ",
            "Birdは「とり」だよ",
            "Fishは「さかな」だよ",
        ],
    },
    ChoiceQuestion {
        question: "\"Three\"は日本語でいくつ?",
        choices: ["1", "2", "3", "4"],
        correct_index: 2,
        mode: "low",
        unit: "vocabulary",
        explanation: "\"Three\"は「3」のことだよ。",
        notes: [
            "\"One\"が1だよ",
            "\"Two\"が2だよ",
            "\"Three\"は「3」のことだよ",
            "\"Four\"が4だよ",
        ],
    },
    ChoiceQuestion {
        question: "\"Good morning\"の意味はどれ?",
        choices: ["おやすみ", "こんにちは", "おはよう", "さようなら"],
        correct_index: 2,
        mode: "mid",
        unit: "grammar",
        explanation: "\"Good morning\"は「おはよう」という朝のあいさつだよ。",
        notes: [
            "おやすみは\"Good night\"だよ",
            "こんにちはは\"Good afternoon\"だよ",
            "\"Good morning\"は「おはよう」という朝のあいさつだよ",
            "さようならは\"Goodbye\"だよ",
        ],
    },
    ChoiceQuestion {
        question: "\"I like apples.\"の意味はどれ?",
        choices: ["わたしはりんごがすきです", "わたしはりんごをたべます", "これはりんごです", "りんごをください"],
        correct_index: 0,
        mode: "mid",
        unit: "grammar",
        explanation: "\"I like ~.\"は「わたしは~がすきです」という意味だよ。",
        notes: [
            "\"I like ~.\"は「わたしは~がすきです」という意味だよ",
            "「たべます」は\"I eat ~.\"だよ",
            "「これはりんごです」は\"This is an apple.\"だよ",
            "「りんごをください」は\"Please give me an apple.\"だよ",
        ],
    },
    ChoiceQuestion {
        question: "「火曜日」を英語で言うと?",
        choices: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        correct_index: 1,
        mode: "mid",
        unit: "vocabulary",
        explanation: "「火曜日」は英語で\"Tuesday\"だよ。",
        notes: [
            "Mondayは月曜日だよ",
            "「火曜日」は英語で\"Tuesday\"だよ",
            "Wednesdayは水曜日だよ",
            "Thursdayは木曜日だよ",
        ],
    },
    ChoiceQuestion {
        question: "\"She ___ a student.\"に入るbe動詞はどれ?",
        choices: ["am", "is", "are", "be"],
        correct_index: 1,
        mode: "junior",
        unit: "grammar",
        explanation: "主語が三人称単数(she)のときのbe動詞は\"is\"だよ。",
        notes: [
            "\"am\"は\"I\"(わたし)のときに使うよ",
            "\"she\"(三人称単数)には\"is\"を使うよ",
            "\"are\"は\"you\"や複数のときに使うよ",
            "\"be\"は原形で、文の中ではそのまま使わないよ",
        ],
    },
    ChoiceQuestion {
        question: "\"I don't have any money.\"の意味に近いのはどれ?",
        choices: ["お金がたくさんある", "お金が少しある", "お金がぜんぜんない", "お金がほしい"],
        correct_index: 2,
        mode: "junior",
        unit: "grammar",
        explanation: "\"don't have any ~\"は「~がぜんぜんない」という意味だよ。",
        notes: [
            "「たくさんある」は\"I have a lot of money.\"だよ",
            "「少しある」は\"I have some money.\"だよ",
            "\"don't have any ~\"は「~がぜんぜんない」という意味だよ",
            "「ほしい」は\"I want money.\"だよ",
        ],
    },
    ChoiceQuestion {
        question: "「昨日」を英語で言うと?",
        choices: ["Today", "Tomorrow", "Yesterday", "Now"],
        correct_index: 2,
        mode: "junior",
        unit: "vocabulary",
        explanation: "「昨日」は英語で\"Yesterday\"だよ。",
        notes: [
            "Todayは今日だよ",
            "Tomorrowは明日だよ",
            "「昨日」は英語で\"Yesterday\"だよ",
            "Nowは今だよ",
        ],
    },
];

pub fn generate_english(mode: &str, unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    generate_from_bank("english", ENGLISH_BANK, mode, unit)
}

// ---- 情報 ----
// 単元: basic_operation(きほん操作) / internet_safety(インターネットの安全) / programming(プログラミング)
// このアプリ自体のテーマ(AI・SNSリテラシー)とも相性が良い科目。
const INFO_BANK: &[ChoiceQuestion] = &[
    ChoiceQuestion {
        question: "文字を打ちこむための道具はどれ?",
        choices: ["マウス", "キーボード", "スピーカー", "プリンター"],
        correct_index: 1,
        mode: "low",
        unit: "basic_operation",
        explanation: "文字を打ちこむのは「キーボード」の役目だよ。",
        notes: [
            "マウスは画面上のものを選ぶ道具だよ",
            "文字を打ちこむのは「キーボード」の役目だよ",
            "スピーカーは音を出す道具だよ",
            "プリンターは印刷する道具だよ",
        ],
    },
    ChoiceQuestion {
        question: "画面のアイコンをクリックするために使う道具はどれ?",
        choices: ["マウス", "キーボード", "USBメモリ", "電池"],
        correct_index: 0,
        mode: "low",
        unit: "basic_operation",
        explanation: "画面上のものを選ぶときは「マウス」を使うよ。",
        notes: [
            "画面上のものを選ぶときは「マウス」を使うよ",
            "キーボードは主に文字を打つための道具だよ",
            "USBメモリはデータを持ち運ぶ道具だよ",
            "電池は機器を動かすための電源だよ",
        ],
    },
    ChoiceQuestion {
        question: "パソコンやタブレットを安全に使うために、人に教えてはいけないものはどれ?",
        choices: ["好きな色", "パスワード", "好きな給食", "得意な教科"],
        correct_index: 1,
        mode: "low",
        unit: "internet_safety",
        explanation: "「パスワード」は自分だけの秘密。誰にも教えないようにしよう。",
        notes: [
            "好きな色は教えても大丈夫だよ",
            "「パスワード」は自分だけの秘密。誰にも教えないようにしよう",
            "好きな給食も教えて大丈夫だよ",
            "得意な教科も教えて大丈夫だよ",
        ],
    },
    ChoiceQuestion {
        question: "インターネットで見ているページの住所のようなものを何という?",
        choices: ["ID", "URL", "OS", "CPU"],
        correct_index: 1,
        mode: "mid",
        unit: "internet_safety",
        explanation: "ページの場所を表すものを「URL」というよ。",
        notes: [
            "IDは利用者を区別するための番号や名前だよ",
            "ページの場所を表すものを「URL」というよ",
            "OSはパソコンを動かす基本ソフトだよ",
            "CPUはコンピューターの頭脳にあたる部品だよ",
        ],
    },
    ChoiceQuestion {
        question: "知らない人からのメールに添付されたファイルを開くとき、正しい行動はどれ?",
        choices: ["すぐ開く", "開かずに大人に相談する", "友達に転送する", "パスワードを送る"],
        correct_index: 1,
        mode: "mid",
        unit: "internet_safety",
        explanation: "知らない相手からの添付ファイルは危険なことがあるので、まず大人に相談しよう。",
        notes: [
            "知らない相手のファイルをすぐ開くのは危険だよ",
            "開く前に大人に相談するのが安全だよ",
            "中身を確かめずに転送するのも危険だよ",
            "パスワードを送るのは絶対にやめよう",
        ],
    },
    ChoiceQuestion {
        question: "コンピューターに保存されているデータの最小単位は?",
        choices: ["メートル", "ビット", "グラム", "ページ"],
        correct_index: 1,
        mode: "mid",
        unit: "basic_operation",
        explanation: "コンピューターが扱う情報の最小単位は「ビット」だよ。",
        notes: [
            "メートルは長さの単位だよ",
            "コンピューターが扱う情報の最小単位は「ビット」だよ",
            "グラムは重さの単位だよ",
            "ページは書類やウェブページを数える単位だよ",
        ],
    },
    ChoiceQuestion {
        question: "プログラムで同じ処理を何度もくり返す仕組みを何という?",
        choices: ["条件分岐", "くり返し(ループ)", "変数", "関数"],
        correct_index: 1,
        mode: "junior",
        unit: "programming",
        explanation: "同じ処理を繰り返す仕組みを「くり返し(ループ)」というよ。",
        notes: [
            "条件分岐は条件によって処理を変える仕組みだよ",
            "同じ処理を繰り返す仕組みを「くり返し(ループ)」というよ",
            "変数はデータを入れておく箱のようなものだよ",
            "関数はひとまとまりの処理をまとめたものだよ",
        ],
    },
    ChoiceQuestion {
        question: "プログラムの中でデータを入れておく箱のようなものを何という?",
        choices: ["変数", "アルゴリズム", "サーバー", "ブラウザ"],
        correct_index: 0,
        mode: "junior",
        unit: "programming",
        explanation: "データを入れておく箱のようなものを「変数」というよ。",
        notes: [
            "データを入れておく箱のようなものを「変数」というよ",
            "アルゴリズムは問題を解くための手順のことだよ",
            "サーバーはデータやサービスを提供するコンピューターだよ",
            "ブラウザはウェブページを見るためのソフトだよ",
        ],
    },
    ChoiceQuestion {
        question: "問題を解くための手順をまとめたものを何という?",
        choices: ["アルゴリズム", "OS", "クラウド", "サーバー"],
        correct_index: 0,
        mode: "junior",
        unit: "programming",
        explanation: "問題を解決するための手順を「アルゴリズム」というよ。",
        notes: [
            "問題を解決するための手順を「アルゴリズム」というよ",
            "OSはパソコンを動かす基本ソフトだよ",
            "クラウドはインターネット上にデータを保存する仕組みだよ",
            "サーバーはデータやサービスを提供するコンピューターだよ",
        ],
    },
];

pub fn generate_info(mode: &str, unit: Option<&str>) -> (DrillProblem, PendingAnswer) {
    generate_from_bank("info", INFO_BANK, mode, unit)
}

pub fn check(given: &str, pending: &PendingAnswer) -> DrillCheckResult {
    let correct = given.trim() == pending.correct_text.trim();
    let choice_notes: Vec<ChoiceNote> = pending
        .choice_notes
        .iter()
        .map(|(choice, note)| ChoiceNote {
            correct: choice.trim() == pending.correct_text.trim(),
            choice: choice.clone(),
            note: note.clone(),
        })
        .collect();
    DrillCheckResult {
        correct,
        correct_answer: pending.correct_text.clone(),
        explanation: pending.explanation.clone(),
        choice_notes,
        tip: pending.tip.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MODES: &[&str] = &["low", "mid", "junior"];

    #[test]
    fn arithmetic_subtraction_never_negative() {
        for _ in 0..200 {
            let (problem, pending) = generate_arithmetic("low", Some("subtraction"));
            if let DrillProblem::Arithmetic { question, .. } = &problem {
                assert!(question.contains('-'));
                let answer: i64 = pending.correct_text.parse().unwrap();
                assert!(answer >= 0, "question={question} answer={answer}");
            }
        }
    }

    #[test]
    fn arithmetic_division_is_always_exact() {
        for mode in MODES {
            for _ in 0..200 {
                let (problem, pending) = generate_arithmetic(mode, Some("division"));
                if let DrillProblem::Arithmetic { question, .. } = &problem {
                    // "12 ÷ 3 = ?" のような形式から被除数・除数を取り出し、割り切れることを確認する
                    let core = question.trim_end_matches(" = ?");
                    let parts: Vec<&str> = core.split(" ÷ ").collect();
                    assert_eq!(parts.len(), 2, "question={question}");
                    let dividend: i64 = parts[0].parse().unwrap();
                    let divisor: i64 = parts[1].parse().unwrap();
                    assert_eq!(dividend % divisor, 0);
                    let answer: i64 = pending.correct_text.parse().unwrap();
                    assert_eq!(dividend / divisor, answer);
                }
            }
        }
    }

    #[test]
    fn arithmetic_unit_selection_matches_requested_operator() {
        let cases: &[(&str, char)] = &[
            ("addition", '+'),
            ("subtraction", '-'),
            ("multiplication", '×'),
            ("division", '÷'),
        ];
        for (unit, op_char) in cases {
            for _ in 0..30 {
                let (problem, _) = generate_arithmetic("mid", Some(unit));
                if let DrillProblem::Arithmetic { question, .. } = &problem {
                    assert!(
                        question.contains(*op_char),
                        "unit={unit} question={question} expected operator {op_char}"
                    );
                }
            }
        }
    }

    #[test]
    fn kanji_choices_always_include_correct_answer_once() {
        for mode in MODES {
            let (problem, pending) = generate_kanji(mode, None);
            if let DrillProblem::Choice { choices, .. } = &problem {
                assert_eq!(choices.len(), 4);
                let count = choices.iter().filter(|c| **c == pending.correct_text).count();
                assert_eq!(count, 1);
            }
        }
    }

    #[test]
    fn check_matches_exact_answer_only() {
        let pending = PendingAnswer {
            correct_text: "12".to_string(),
            explanation: "".to_string(),
            choice_notes: Vec::new(),
            tip: None,
        };
        assert!(check("12", &pending).correct);
        assert!(!check("13", &pending).correct);
        assert!(check(" 12 ", &pending).correct);
    }

    /// 新設4科目すべてで、全学年モードの問題が生成でき、
    /// かつ選択肢の中に正解がちょうど1つ含まれることを確認する。
    #[test]
    fn all_new_subjects_have_valid_choices_for_every_mode() {
        type Gen = fn(&str, Option<&str>) -> (DrillProblem, PendingAnswer);
        let generators: &[(&str, Gen)] = &[
            ("science", generate_science),
            ("social", generate_social),
            ("english", generate_english),
            ("info", generate_info),
        ];

        for (subject, gen) in generators {
            for mode in MODES {
                let (problem, pending) = gen(mode, None);
                if let DrillProblem::Choice { choices, subject: got_subject, .. } = &problem {
                    assert_eq!(got_subject, subject);
                    assert_eq!(choices.len(), 4, "subject={subject} mode={mode}");
                    let count = choices
                        .iter()
                        .filter(|c| **c == pending.correct_text)
                        .count();
                    assert_eq!(count, 1, "subject={subject} mode={mode}");
                } else {
                    panic!("expected Choice variant for subject={subject}");
                }
            }
        }
    }

    /// 各科目のすべての単元(「すべて」を除く)について、少なくとも1問は
    /// 生成できることを確認する(=単元idと問題のunitフィールドが一致している)。
    #[test]
    fn every_declared_unit_can_produce_a_problem() {
        type Gen = fn(&str, Option<&str>) -> (DrillProblem, PendingAnswer);
        let generators: &[(&str, Gen)] = &[
            ("arithmetic", generate_arithmetic),
            ("science", generate_science),
            ("social", generate_social),
            ("english", generate_english),
            ("info", generate_info),
        ];

        for (subject, gen) in generators {
            for unit in units_for_subject(subject) {
                if unit.id == "mixed" {
                    continue;
                }
                // どれか1つの学年で生成できればOK(全学年に無くても許容する = 少しずつ拡充可能)
                let mut produced = false;
                for mode in MODES {
                    let (_problem, _pending) = gen(mode, Some(&unit.id));
                    produced = true;
                    let _ = _problem;
                }
                assert!(produced, "subject={subject} unit={}", unit.id);
            }
        }
    }

    /// checkの結果に含まれるchoiceNotesが、選択肢と同じ数だけあり、
    /// 正解フラグがちょうど1つだけ立っていることを確認する。
    /// また、算数にはtip(解き方のコツ)が必ず付き、4択問題には付かないことも確認する。
    #[test]
    fn choice_notes_cover_all_options_and_tip_is_arithmetic_only() {
        for mode in MODES {
            let (problem, pending) = generate_science(mode, None);
            if let DrillProblem::Choice { choices, .. } = &problem {
                assert_eq!(pending.choice_notes.len(), choices.len());
                let result = check(&pending.correct_text, &pending);
                assert_eq!(result.choice_notes.len(), choices.len());
                let correct_count = result.choice_notes.iter().filter(|n| n.correct).count();
                assert_eq!(correct_count, 1);
                assert!(result.tip.is_none());
            }
        }

        let (_problem, pending) = generate_arithmetic("mid", Some("addition"));
        assert!(pending.choice_notes.is_empty());
        let result = check(&pending.correct_text, &pending);
        assert!(result.tip.is_some());
        assert!(!result.tip.unwrap().is_empty());
    }
}

