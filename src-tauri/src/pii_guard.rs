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

// 電話番号・郵便番号は、タブレット/スマホのIME変換で全角数字になっているケースが多い
// (例:「０９０－１２３４－５６７８」)。半角\dだけでは見逃すため、
// 全角数字(U+FF10-FF19)・全角ハイフン(－ U+FF0D)・長音記号の誤用(ー)も許容する。
static POSTAL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"〒?[0-9\x{FF10}-\x{FF19}]{3}[-－ー][0-9\x{FF10}-\x{FF19}]{4}").unwrap()
});
static PHONE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"[0\x{FF10}][0-9\x{FF10}-\x{FF19}]{1,4}[-－ー][0-9\x{FF10}-\x{FF19}]{1,4}[-－ー][0-9\x{FF10}-\x{FF19}]{3,4}|[0\x{FF10}][0-9\x{FF10}-\x{FF19}]{9,10}",
    )
    .unwrap()
});
static EMAIL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+").unwrap());
// 高校(高等学校)を見逃していたため追加。小中学生モードが主対象だが、
// 兄姉の高校名や将来の進学先など、会話中に高校名が出るケースはある。
static SCHOOL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[一-龠ぁ-んァ-ヶー]{2,10}(立)?(小学校|中学校|高等学校|高校)").unwrap()
});
// 自己紹介パターン: 「私は/僕はXXです」に加え、
// 「僕の名前はXXです」「私はXXって言います」のような、間に語が挟まる/末尾が
// 「って(言います|いいます)」になる自然な言い回しも拾う。
// (name)は非キャプチャ化した前後の飾り語を跨いで単一のキャプチャグループ(1)に統一。
static SELF_INTRO_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?:私|僕|ぼく|わたし)(?:の名前)?は([一-龠ぁ-んァ-ヶー]{2,8})(?:です|だよ|といいます|と言います|って(?:いいます|言います))",
    )
    .unwrap()
});
// 「(私は/僕は等が無くても)名前は○○です」のように、pronounを省略しつつ
// 「名前は」という明確な自己紹介の文脈があるケースを別パターンとして拾う。
static NAME_DECLARATION_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"名前は([一-龠ぁ-んァ-ヶー]{2,8})(?:です|だよ|といいます|と言います)").unwrap()
});
// 都道府県名が無い住所表現(例:「松本市に住んでいます」「渋谷区在住」)。
// 「市区町村名+居住を示す語」というセットで初めてマッチさせることで、
// 単なる地名の言及(例:「松本市は寒いところです」)を誤検知しにくくしている。
static CITY_RESIDENCE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"[一-龠ぁ-んァ-ヶー]{1,10}(市|区|町|村)(に住んで|に住んでいます|に住んでる|在住|出身です|出身だよ)",
    )
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
    // 見逃しが多かったため追加(いずれも上位100位以内によく入る一般的な姓)
    "遠藤", "藤原", "岡本", "村田", "坂本", "原田", "西村", "福田", "竹内",
    "金子", "三浦", "藤井", "岩崎", "青木", "西田", "増田", "谷口", "新井",
    "浅野", "平野", "千葉", "菅原", "武田", "上田", "杉山", "菊地", "今井",
    "小野", "河野", "野口", "松尾", "安藤", "和田", "横山", "水野", "中島",
    "石田", "宮崎", "内田", "柴田", "本田", "高木", "荒木", "栗原", "北村",
    "坂井", "土屋", "小川", "太田", "工藤", "宮本", "中野", "大野", "田村",
    "中山", "小山", "浜田", "岸田", "久保", "岩本", "山下", "松田", "宮田",
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

/// 氏名: 自己紹介パターン(pronoun付き/pronoun省略の「名前は」型) + 一般的な姓+名パターン
fn detect_name(text: &str) -> Vec<RangeMatch> {
    let mut out = Vec::new();

    for caps in SELF_INTRO_RE.captures_iter(text) {
        if let Some(name) = caps.get(1) {
            out.push(RangeMatch {
                kind: PiiType::Name,
                start: name.start(),
                end: name.end(),
            });
        }
    }

    for caps in NAME_DECLARATION_RE.captures_iter(text) {
        if let Some(name) = caps.get(1) {
            let overlaps = out.iter().any(|r| name.start() < r.end && name.end() > r.start);
            if !overlaps {
                out.push(RangeMatch {
                    kind: PiiType::Name,
                    start: name.start(),
                    end: name.end(),
                });
            }
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
    all.extend(detect_regex(text, &CITY_RESIDENCE_RE, PiiType::Address));
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

    // ── ここから false negative(見逃し)対策の検証 ──

    #[test]
    fn detects_fullwidth_phone_number() {
        // タブレット/スマホのIME変換で全角数字になりがちな電話番号
        let r = scan("電話は０９０－１２３４－５６７８だよ");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Phone));
    }

    #[test]
    fn detects_fullwidth_postal_code() {
        let r = scan("〒３９０－０８０１に住んでいます");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Postal));
    }

    #[test]
    fn detects_name_with_no_prefix_phrase() {
        // 「僕は」ではなく「僕の名前は」という、以前は拾えなかった言い回し
        let r = scan("僕の名前は太郎です");
        let name = r.matches.iter().find(|m| m.kind == PiiType::Name);
        assert!(name.is_some());
        assert_eq!(name.unwrap().text, "太郎");
    }

    #[test]
    fn detects_name_with_tte_iimasu_ending() {
        // 「と言います」ではなく「って言います」という話し言葉的な言い回し
        let r = scan("私は花子って言います");
        let name = r.matches.iter().find(|m| m.kind == PiiType::Name);
        assert!(name.is_some());
        assert_eq!(name.unwrap().text, "花子");
    }

    #[test]
    fn detects_name_declaration_without_pronoun() {
        // 「私は/僕は」等の主語が省略され、「名前は」だけで名乗るケース
        let r = scan("名前はけんとです。よろしくね");
        let name = r.matches.iter().find(|m| m.kind == PiiType::Name);
        assert!(name.is_some());
        assert_eq!(name.unwrap().text, "けんと");
    }

    #[test]
    fn detects_high_school_name() {
        // 従来は小学校/中学校のみ対応で、高校が抜けていた
        let r = scan("松本第一高等学校に通っています");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::School));
    }

    #[test]
    fn detects_city_level_address_without_prefecture() {
        // 都道府県名が無いと住所とみなせなかったケース
        let r = scan("松本市に住んでいます");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Address));
    }

    #[test]
    fn detects_ward_level_address_without_prefecture() {
        let r = scan("渋谷区在住です");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Address));
    }

    #[test]
    fn city_mention_without_residence_context_is_not_flagged_as_address() {
        // 「住んでいる」等の文脈が無い単なる地名の言及は、拾いすぎ(誤検知)を避ける
        let r = scan("松本市はりんごが有名です");
        assert!(!r.matches.iter().any(|m| m.kind == PiiType::Address));
    }

    #[test]
    fn expanded_surname_dictionary_catches_more_names() {
        // 以前の35件の辞書には含まれていなかった一般的な姓
        let r = scan("遠藤さんと一緒に帰った");
        assert!(r.matches.iter().any(|m| m.kind == PiiType::Name));
    }

    /// 既知の残存ギャップ(今回はスコープ外として意図的に対応していない)。
    /// - LINE ID/InstagramなどのSNS ID(「IDは○○だよ」)はPII検出の対象にしていない
    ///   (safety_drill.rs側の訓練シナリオでは扱っているが、pii_guardの正規表現的な
    ///   検出には馴染まないため)。
    /// - ランドマーク経由の間接的な位置情報(例:「○○公園の近くに住んでる」)は
    ///   自然言語理解が必要でregexベースでは非現実的なため対象外。
    /// - 電話番号を仮名/漢数字で書く(「ゼロキュウゼロの…」)ようなケースも対象外。
    #[test]
    fn known_limitation_sns_id_not_detected_documented() {
        let r = scan("LINEのIDはtaro_1234だよ");
        // これは「検出されるべき」ではなく、「現状は検出されない」ことを明示するテスト。
        // 将来この挙動を変える場合は、このテストごと更新すること。
        assert!(!r.matches.iter().any(|m| m.kind == PiiType::Name));
    }
}
