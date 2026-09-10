//! P1-6/7: PII検出(`pii_guard::scan`)のrecall(見逃し率の裏返し)と
//! false positive rate(誤検知率)を、ラベル付きコーパスに対して機械的に
//! 測定するベンチマーク。
//!
//! pii_guard.rs内の既存ユニットテストは「この1文でこの種類が拾えるか」を
//! 個別に確認するものだが、こちらは「一定量の多様な例文に対して全体として
//! どれくらいの検出率か」を数値(%)として可視化し、リグレッション
//! (何かを直したら別のパターンを壊した、など)を早期発見することを目的とする。
//!
//! 実行方法: `cargo test --package hushbox_lib pii_benchmark -- --nocapture`
//! (`--nocapture`を付けないとレポートの`println!`が表示されない)
//!
//! 設計方針(pii_guard.rs冒頭のコメントを踏襲):
//!   - 「誤検知は許容し、見逃しよりも多めに拾って確認させる方針」なので、
//!     recall(見逃さない率)には高い閾値を課す一方、
//!     false positive rate(何もないのに誤って拾ってしまう率)は
//!     大きく壊れていないかの「天井」チェックに留める(下げること自体は歓迎)。
//!   - コーパスは実際にありそうな小中高生の発話を想定した例文で構成し、
//!     姓のバリエーション・全角/半角・文脈の有無(住所は文脈が要る)などを
//!     意図的に混ぜている。

#[cfg(test)]
mod tests {
    use crate::pii_guard::{scan, PiiType};

    /// 「この文には少なくともこの種類のPIIが1つ以上検出されるべき」という
    /// 正例(true positive)コーパス。
    struct PositiveCase {
        text: &'static str,
        expected: &'static [PiiType],
    }

    /// 「この文にはPIIが何も検出されるべきではない」という
    /// 負例(true negative)コーパス。false positive rateの測定に使う。
    struct NegativeCase {
        text: &'static str,
    }

    fn positive_corpus() -> Vec<PositiveCase> {
        vec![
            // ── 氏名: 自己紹介パターン ──
            PositiveCase { text: "私は田中太郎です。よろしくお願いします。", expected: &[PiiType::Name] },
            PositiveCase { text: "僕は鈴木一郎だよ。", expected: &[PiiType::Name] },
            PositiveCase { text: "わたしは高橋さゆりって言います。", expected: &[PiiType::Name] },
            PositiveCase { text: "僕の名前は山田花子です。", expected: &[PiiType::Name] },
            PositiveCase { text: "名前は佐藤健といいます。", expected: &[PiiType::Name] },
            PositiveCase { text: "名前はけんとです。よろしくね", expected: &[PiiType::Name] },
            // ── 氏名: 姓+名パターン(自己紹介の文脈が無くても検出される設計) ──
            PositiveCase { text: "今日、伊藤先生に褒められた渡辺くんがすごく嬉しそうだった。", expected: &[PiiType::Name] },
            PositiveCase { text: "中村美咲ちゃんと一緒に宿題をやりました。", expected: &[PiiType::Name] },
            // ── 住所: 都道府県から始まるもの ──
            PositiveCase { text: "東京都渋谷区に住んでいます。", expected: &[PiiType::Address] },
            PositiveCase { text: "大阪府大阪市北区梅田1-1-1です。", expected: &[PiiType::Address] },
            PositiveCase { text: "北海道札幌市中央区に引っ越しました。", expected: &[PiiType::Address] },
            // ── 住所: 都道府県が無い「市区町村+居住」パターン ──
            PositiveCase { text: "松本市に住んでいます。", expected: &[PiiType::Address] },
            PositiveCase { text: "渋谷区在住です。", expected: &[PiiType::Address] },
            // 都道府県の略称(P1「住所検出の精度」で追加)
            PositiveCase { text: "東京に住んでいます。", expected: &[PiiType::Address] },
            PositiveCase { text: "神奈川出身です。", expected: &[PiiType::Address] },
            PositiveCase { text: "浦安市出身です。", expected: &[PiiType::Address] },
            // ── 電話番号: 半角/全角、ハイフン種別違い ──
            PositiveCase { text: "電話は090-1234-5678です。", expected: &[PiiType::Phone] },
            PositiveCase { text: "連絡先は０９０－１２３４－５６７８までお願いします。", expected: &[PiiType::Phone] },
            PositiveCase { text: "家の電話は03ー1234ー5678だよ。", expected: &[PiiType::Phone] },
            // ── 郵便番号 ──
            PositiveCase { text: "〒150-0001に住んでいます。", expected: &[PiiType::Postal] },
            PositiveCase { text: "郵便番号は１００ー０００１です。", expected: &[PiiType::Postal] },
            // ── メールアドレス ──
            PositiveCase { text: "メールはtaro.yamada@example.comまで。", expected: &[PiiType::Email] },
            PositiveCase { text: "連絡先: kento_2010@gmail.com", expected: &[PiiType::Email] },
            // ── 学校名 ──
            PositiveCase { text: "私は青葉台小学校に通っています。", expected: &[PiiType::School] },
            PositiveCase { text: "みどり中学校の2年生です。", expected: &[PiiType::School] },
            PositiveCase { text: "県立ひばり高等学校を目指しています。", expected: &[PiiType::School] },
            PositiveCase { text: "兄は緑ヶ丘高校に通っています。", expected: &[PiiType::School] },
            // ── 複合(1文に複数種類のPII) ──
            PositiveCase {
                text: "私は田中太郎です。東京都渋谷区に住んでいて、電話は090-1234-5678、\
                       青葉台小学校に通っています。",
                expected: &[PiiType::Name, PiiType::Address, PiiType::Phone, PiiType::School],
            },
        ]
    }

    fn negative_corpus() -> Vec<NegativeCase> {
        vec![
            // 単なる地名の言及(居住を示す語が伴わない)
            NegativeCase { text: "松本市は寒いところです。" },
            NegativeCase { text: "渋谷は人が多いね。" },
            // 都道府県の略称(P1で対応)についても、居住文脈が無ければ誤検知しないこと
            // (社会科の質問等、このアプリの主要な用途を壊さないための回帰チェック)
            NegativeCase { text: "京都には金閣寺があります。" },
            NegativeCase { text: "東京について教えて。" },
            // 一般的な数字(電話番号のパターンに一致しない桁数・区切り)
            NegativeCase { text: "リンゴを3個買いました。" },
            NegativeCase { text: "テストは100点満点です。" },
            // 学校の一般論(学校名の固有名詞が無い)
            NegativeCase { text: "学校のグラウンドは広いです。" },
            NegativeCase { text: "今日は小学校で運動会がありました。" },
            // 「先生」等、氏名検出の姓リストに含まれない一般語
            NegativeCase { text: "先生に褒められて嬉しかったです。" },
            NegativeCase { text: "友達と公園で遊びました。" },
            // 「〜さんが」のような、姓リストに載っていない苗字や敬称のみ
            NegativeCase { text: "隣のクラスの子と仲良くなりました。" },
            // メールのようで実は違う(@が無い)
            NegativeCase { text: "サンプルの例文です。example.comというサイトを見ました。" },
        ]
    }

    #[test]
    fn pii_detection_benchmark() {
        let positives = positive_corpus();
        let negatives = negative_corpus();

        let mut total_pairs = 0usize;
        let mut matched_pairs = 0usize;
        let mut missed: Vec<String> = Vec::new();

        for case in &positives {
            let result = scan(case.text);
            for expected_type in case.expected {
                total_pairs += 1;
                let found = result.matches.iter().any(|m| m.kind == *expected_type);
                if found {
                    matched_pairs += 1;
                } else {
                    missed.push(format!("  - \"{}\" => {:?} が未検出", case.text, expected_type));
                }
            }
        }

        let mut false_positive_count = 0usize;
        let mut false_positives: Vec<String> = Vec::new();
        for case in &negatives {
            let result = scan(case.text);
            if !result.matches.is_empty() {
                false_positive_count += 1;
                let kinds: Vec<&str> = result.matches.iter().map(|m| m.kind.label()).collect();
                false_positives.push(format!("  - \"{}\" => 誤検知: {:?}", case.text, kinds));
            }
        }

        let recall = matched_pairs as f64 / total_pairs as f64;
        let fp_rate = false_positive_count as f64 / negatives.len() as f64;

        println!("=== PII検出ベンチマーク ===");
        println!(
            "recall(正例の検出率): {matched_pairs}/{total_pairs} = {:.1}%",
            recall * 100.0
        );
        if !missed.is_empty() {
            println!("未検出の例:\n{}", missed.join("\n"));
        }
        println!(
            "false positive rate(負例での誤検知率): {false_positive_count}/{} = {:.1}%",
            negatives.len(),
            fp_rate * 100.0
        );
        if !false_positives.is_empty() {
            println!("誤検知の例:\n{}", false_positives.join("\n"));
        }

        // 「見逃しよりも多めに拾う」設計方針なので、recallは高い閾値を要求する。
        // (このコーパスに対して95%を切ったら、既存パターンを壊すリグレッションが
        // 入った可能性が高いので調査すること)
        assert!(
            recall >= 0.95,
            "recallが低下しています({:.1}%)。見逃しが増えていないか確認してください:\n{}",
            recall * 100.0,
            missed.join("\n")
        );

        // false positiveは設計上許容されているが、際限なく増えてよいわけではない。
        // 半分以上の負例で誤検知するようなら、実用上ノイズが多すぎるので天井を設ける。
        assert!(
            fp_rate <= 0.5,
            "false positive rateが高すぎます({:.1}%)。誤検知パターンを見直してください:\n{}",
            fp_rate * 100.0,
            false_positives.join("\n")
        );
    }
}
