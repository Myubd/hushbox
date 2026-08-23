//! 日本語PII(個人情報)検出ガードレール。
//!
//! 完全な精度は狙わない(自然言語処理として現実的に不可能)。
//! 典型的なパターンを検出し、生徒にその場で気づかせる
//! 「教育的デモンストレーション」として設計する。
//! 誤検知は許容し、見逃しよりも多めに拾って確認させる方針。

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PiiType {
    Name,
    Address,
    Phone,
    Email,
    School,
    Postal,
}

impl PiiType {
    pub fn label(&self) -> &'static str {
        match self {
            PiiType::Name => "名前",
            PiiType::Address => "住所",
            PiiType::Phone => "電話番号",
            PiiType::Email => "メールアドレス",
            PiiType::School => "学校名",
            PiiType::Postal => "郵便番号",
        }
    }

    fn placeholder(&self) -> &'static str {
        match self {
            PiiType::Name => "[生徒名]",
            PiiType::Address => "[住所]",
            PiiType::Phone => "[電話番号]",
            PiiType::Email => "[メール]",
            PiiType::School => "[学校名]",
            PiiType::Postal => "[郵便番号]",
        }
    }
}

/// 検出結果。フロントエンド(JS)側の文字インデックスはUTF-16、
/// Rust側はバイトオフセットで単位が異なるため、インデックスは
/// 内部の redact() 処理にのみ使い、外部へは一致した文字列そのものを返す。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiMatch {
    #[serde(rename = "type")]
    pub kind: PiiType,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub matches: Vec<PiiMatch>,
    pub redacted: String,
}

struct RangeMatch {
    kind: PiiType,
    start: usize, // バイトオフセット
    end: usize,
}

static POSTAL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"〒?\d{3}-\d{4}").unwrap());
static PHONE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10}").unwrap());
static EMAIL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+").unwrap());
static SCHOOL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[一-龠ぁ-んァ-ヶー]{2,10}(立)?(小学校|中学校)").unwrap()
});
static SELF_INTRO_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(私|僕|ぼく|わたし)は([一-龠ぁ-んァ-ヶー]{2,8})(です|だよ|といいます|と言います)")
        .unwrap()
});

const PREFECTURES: &[&str] = &[
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const COMMON_SURNAMES: &[&str] = &[
    "佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林",
    "加藤", "吉田", "山田", "佐々木", "山口", "松本", "井上", "木村", "林",
    "斎藤", "清水", "山崎", "森", "阿部", "池田", "橋本", "石川", "前田",
    "藤田", "後藤", "岡田", "長谷川", "村上", "近藤", "石井", "斉藤",
];

fn detect_regex(text: &str, re: &Regex, kind: PiiType) -> Vec<RangeMatch> {
    re.find_iter(text)
        .map(|m| RangeMatch {
            kind,
            start: m.start(),
            end: m.end(),
        })
        .collect()
}

/// 都道府県名から始まる、句読点までの文字列を住所とみなす
fn detect_address(text: &str) -> Vec<RangeMatch> {
    let mut out = Vec::new();
    for pref in PREFECTURES {
        let mut search_from = 0;
        while let Some(rel_idx) = text[search_from..].find(pref) {
            let start = search_from + rel_idx;
            let window_end = (start + 90).min(text.len());
            // 文字境界に安全にそろえる
            let mut window_end = window_end;
            while window_end < text.len() && !text.is_char_boundary(window_end) {
                window_end += 1;
            }
            let window = &text[start..window_end];
            let cut = window.find(['。', '\n', '、']);
            let full_len = cut.unwrap_or(window.len());
            let end = start + full_len;
            out.push(RangeMatch {
                kind: PiiType::Address,
                start,
                end,
            });
            search_from = end.max(start + pref.len());
            if search_from >= text.len() {
                break;
            }
        }
    }
    out
}

/// 氏名: 自己紹介パターン + 一般的な姓+名パターン
fn detect_name(text: &str) -> Vec<RangeMatch> {
    let mut out = Vec::new();

    for caps in SELF_INTRO_RE.captures_iter(text) {
        if let Some(name) = caps.get(2) {
            out.push(RangeMatch {
                kind: PiiType::Name,
                start: name.start(),
                end: name.end(),
            });
        }
    }

    for surname in COMMON_SURNAMES {
        let mut search_from = 0;
        while let Some(rel_idx) = text[search_from..].find(surname) {
            let start = search_from + rel_idx;
            let after_start = start + surname.len();
            let mut window_end = (after_start + 12).min(text.len());
            while window_end < text.len() && !text.is_char_boundary(window_end) {
                window_end += 1;
            }
            let after = &text[after_start..window_end];
            let given_len = given_name_len(after);
            let end = after_start + given_len;

            let overlaps = out
                .iter()
                .any(|r| start < r.end && end > r.start);
            if !overlaps && (end - start) >= surname.len() {
                out.push(RangeMatch {
                    kind: PiiType::Name,
                    start,
                    end,
                });
            }
            search_from = after_start;
            if search_from >= text.len() {
                break;
            }
        }
    }

    out
}

/// 姓の直後にひらがな/カタカナ/漢字が最大3文字続く分を「名」とみなす
fn given_name_len(after: &str) -> usize {
    let mut len = 0;
    let mut chars_taken = 0;
    for ch in after.chars() {
        if chars_taken >= 3 {
            break;
        }
        let is_kanji_kana = ('\u{4E00}'..='\u{9FFF}').contains(&ch)
            || ('\u{3040}'..='\u{309F}').contains(&ch)
            || ('\u{30A0}'..='\u{30FF}').contains(&ch)
            || ch == 'ー';
        if !is_kanji_kana {
            break;
        }
        len += ch.len_utf8();
        chars_taken += 1;
    }
    len
}

/// 重なり合う検出結果を整理する(開始位置順、重なりは長い方を優先)
fn dedupe(mut matches: Vec<RangeMatch>) -> Vec<RangeMatch> {
    matches.sort_by(|a, b| {
        a.start
            .cmp(&b.start)
            .then((b.end - b.start).cmp(&(a.end - a.start)))
    });
    let mut result: Vec<RangeMatch> = Vec::new();
    for m in matches {
        let overlaps = result.iter().any(|r| m.start < r.end && m.end > r.start);
        if !overlaps {
            result.push(m);
        }
    }
    result.sort_by_key(|m| m.start);
    result
}

pub fn scan(text: &str) -> ScanResult {
    if text.trim().is_empty() {
        return ScanResult {
            matches: vec![],
            redacted: text.to_string(),
        };
    }

    let mut all = Vec::new();
    all.extend(detect_regex(text, &POSTAL_RE, PiiType::Postal));
    all.extend(detect_regex(text, &PHONE_RE, PiiType::Phone));
    all.extend(detect_regex(text, &EMAIL_RE, PiiType::Email));
    all.extend(detect_regex(text, &SCHOOL_RE, PiiType::School));
    all.extend(detect_address(text));
    all.extend(detect_name(text));

    let ranges = dedupe(all);

    let matches: Vec<PiiMatch> = ranges
        .iter()
        .map(|r| PiiMatch {
            kind: r.kind,
            text: text[r.start..r.end].to_string(),
        })
        .collect();

    // 後ろから置換してオフセットのズレを防ぐ
    let mut redacted = text.to_string();
    for r in ranges.iter().rev() {
        redacted.replace_range(r.start..r.end, r.kind.placeholder());
    }

    ScanResult { matches, redacted }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_postal_code() {
        let r = scan("〒390-0801に住んでいます");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Postal));
        assert!(r.redacted.contains("[郵便番号]"));
    }

    #[test]
    fn detects_phone_number() {
        let r = scan("電話は090-1234-5678です");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Phone));
    }

    #[test]
    fn detects_email() {
        let r = scan("taro.tanaka@example.co.jp に送って");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Email));
    }

    #[test]
    fn detects_school_name() {
        let r = scan("松本第一小学校に通っています");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::School));
    }

    #[test]
    fn detects_address_with_prefecture() {
        let r = scan("長野県松本市本庁1-1-1に住んでいます。よろしく。");
        let addr = r.matches.iter().find(|m| m.kind == PiiType::Address);
        assert!(addr.is_some());
        assert!(addr.unwrap().text.starts_with("長野県"));
    }

    #[test]
    fn detects_self_intro_name() {
        let r = scan("私は田中太郎です。よろしくお願いします。");
        let name = r.matches.iter().find(|m| m.kind == PiiType::Name);
        assert!(name.is_some());
        assert_eq!(name.unwrap().text, "田中太郎");
    }

    #[test]
    fn detects_surname_pattern_without_self_intro() {
        let r = scan("鈴木さんが宿題を手伝ってくれた");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Name));
    }

    #[test]
    fn no_false_positive_on_clean_text() {
        let r = scan("今日の天気について教えてください");
        assert!(r.matches.is_empty());
        assert_eq!(r.redacted, "今日の天気について教えてください");
    }

    #[test]
    fn redacted_string_has_no_original_pii() {
        let original = "私は山田花子です。〒100-0001 東京都千代田区にいます。連絡は090-1111-2222まで。";
        let r = scan(original);
        assert!(!r.redacted.contains("山田花子"));
        assert!(!r.redacted.contains("090-1111-2222"));
        assert!(!r.redacted.contains("100-0001"));
    }

    #[test]
    fn handles_multibyte_boundaries_without_panicking() {
        // 絵文字や記号混じりでもバイト境界エラーでpanicしないことを確認
        let r = scan("こんにちは🌸私は佐藤あゆみです!〒123-4567 北海道札幌市です。");
        assert!(!r.matches.is_empty());
    }
}
