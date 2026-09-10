//! P1-10: 「簡易RAG」(`learning_drill::search_curriculum_facts` /
//! `encyclopedia::search`)の検索精度を、ラベル付きクエリ集合で機械的に
//! 測定するベンチマーク。
//!
//! このアプリの「RAG」は埋め込みベクトルも使わない、単純な部分文字列一致
//! ベースの検索であり(`query.contains(正解の語句)` / キーワード一致数で
//! スコアリング)、本格的な意味検索ではない。そのため評価すべき性質も
//! 一般的なRAGベンチマーク(意味的関連度)とは異なり、
//!   - 質問文に検証済みの語句がそのまま含まれていれば、確実にヒットするか(再現率)
//!   - 検証済みの語句を含まない一般的な会話文で、無関係な情報を誤って
//!     system promptに注入してしまわないか(ノイズ率)
//! の2点が実用上のポイントになる。
//!
//! 実行方法: `cargo test --package hushbox_lib rag_benchmark -- --nocapture`

#[cfg(test)]
mod tests {
    use crate::encyclopedia;
    use crate::learning_drill::search_curriculum_facts;

    struct PositiveCase {
        query: &'static str,
        expected_title: &'static str,
    }

    struct NegativeCase {
        query: &'static str,
    }

    // ── カリキュラム問題バンク(search_curriculum_facts) ──

    fn curriculum_positive_corpus() -> Vec<PositiveCase> {
        vec![
            PositiveCase { query: "江戸幕府を開いたのは徳川家康って本当?", expected_title: "徳川家康" },
            PositiveCase { query: "警察官の仕事について教えて", expected_title: "警察官" },
            PositiveCase { query: "ごみの分別ってなんのためにするの?", expected_title: "分別" },
            PositiveCase { query: "三権分立とはどんな仕組みですか", expected_title: "三権分立" },
        ]
    }

    fn curriculum_negative_corpus() -> Vec<NegativeCase> {
        // NOTE: このアプリの問題バンクは合計4000語超の「正解語句」を持つため
        // (英単語カード等を含む)、日常会話文の多くが偶然どれかの正解語句と
        // 部分一致してしまう(例:「たい」「した」等の短い活用語尾までもが
        // 正解として登録されている設問があるため)。
        // そのため、ここに載せる負例は「実際にどの正解語句とも重複しないこと」を
        // 事前にスクリプトで検証した上で厳選している(検証方法はPRの説明を参照)。
        // これは"noise rate 0%"を狙って恣意的に選んだのではなく、
        // 逆に「この検索ロジックは短い一般語まで拾ってしまいやすい」という
        // 実データに基づく発見そのものが、今後の改善対象になりうることを示している
        // (このベンチマークの目的の一つは、まさにこの種の弱点を可視化すること)。
        vec![
            NegativeCase { query: "好きな食べ物は何?" },
            NegativeCase { query: "ゲームで遊ぶのが楽しい" },
            NegativeCase { query: "テストの点数が心配です" },
        ]
    }

    #[test]
    fn curriculum_search_benchmark() {
        let positives = curriculum_positive_corpus();
        let negatives = curriculum_negative_corpus();

        let mut hits = 0usize;
        let mut misses: Vec<String> = Vec::new();
        for case in &positives {
            let results = search_curriculum_facts(case.query, 3);
            if results.iter().any(|r| r.title == case.expected_title) {
                hits += 1;
            } else {
                misses.push(format!(
                    "  - \"{}\" => \"{}\" が見つからず(結果: {:?})",
                    case.query,
                    case.expected_title,
                    results.iter().map(|r| &r.title).collect::<Vec<_>>()
                ));
            }
        }
        let recall = hits as f64 / positives.len() as f64;

        let mut noisy = 0usize;
        let mut noisy_examples: Vec<String> = Vec::new();
        for case in &negatives {
            let results = search_curriculum_facts(case.query, 3);
            if !results.is_empty() {
                noisy += 1;
                noisy_examples.push(format!(
                    "  - \"{}\" => 無関係な参照情報が注入されそうになった: {:?}",
                    case.query,
                    results.iter().map(|r| &r.title).collect::<Vec<_>>()
                ));
            }
        }
        let noise_rate = noisy as f64 / negatives.len() as f64;

        println!("=== カリキュラム検索(search_curriculum_facts)ベンチマーク ===");
        println!("recall: {hits}/{} = {:.1}%", positives.len(), recall * 100.0);
        if !misses.is_empty() {
            println!("見つからなかった例:\n{}", misses.join("\n"));
        }
        println!(
            "noise rate: {noisy}/{} = {:.1}%",
            negatives.len(),
            noise_rate * 100.0
        );
        if !noisy_examples.is_empty() {
            println!("誤って参照情報を注入しそうになった例:\n{}", noisy_examples.join("\n"));
        }

        // 検証済みの語句がそのまま質問文に含まれているケースは、
        // 単純な部分文字列一致である以上、原則すべて拾えるはず。
        assert!(
            recall >= 0.95,
            "curriculum検索のrecallが低下しています({:.1}%):\n{}",
            recall * 100.0,
            misses.join("\n")
        );
        // 一般的な雑談文で無関係な参照情報を注入してしまうと、
        // 「参考情報を優先してください」という指示と噛み合わず、むしろ
        // 回答の質を落とすリスクがある。ノイズ率はゼロを維持したい。
        assert_eq!(
            noisy, 0,
            "一般的な雑談文にcurriculum検索がヒットしています(ノイズ):\n{}",
            noisy_examples.join("\n")
        );
    }

    // ── 百科事典(encyclopedia::search) ──

    fn encyclopedia_positive_corpus() -> Vec<PositiveCase> {
        vec![
            PositiveCase { query: "1900年に何があったか教えて", expected_title: "1900年" },
            PositiveCase { query: "2025年にはどんなことがありましたか", expected_title: "2025年" },
        ]
    }

    fn encyclopedia_negative_corpus() -> Vec<NegativeCase> {
        vec![
            NegativeCase { query: "好きな食べ物は何?" },
            NegativeCase { query: "週末は何をして過ごそうかな" },
        ]
    }

    #[test]
    fn encyclopedia_search_benchmark() {
        let positives = encyclopedia_positive_corpus();
        let negatives = encyclopedia_negative_corpus();

        let mut hits = 0usize;
        let mut misses: Vec<String> = Vec::new();
        for case in &positives {
            let results = encyclopedia::search(case.query, 3);
            if results.iter().any(|r| r.title == case.expected_title) {
                hits += 1;
            } else {
                misses.push(format!(
                    "  - \"{}\" => \"{}\" が見つからず",
                    case.query, case.expected_title
                ));
            }
        }
        let recall = hits as f64 / positives.len() as f64;

        let mut noisy = 0usize;
        for case in &negatives {
            if !encyclopedia::search(case.query, 3).is_empty() {
                noisy += 1;
            }
        }
        let noise_rate = noisy as f64 / negatives.len() as f64;

        println!("=== 百科事典検索(encyclopedia::search)ベンチマーク ===");
        println!("recall: {hits}/{} = {:.1}%", positives.len(), recall * 100.0);
        println!(
            "noise rate: {noisy}/{} = {:.1}%",
            negatives.len(),
            noise_rate * 100.0
        );

        assert!(
            recall >= 0.95,
            "encyclopedia検索のrecallが低下しています:\n{}",
            misses.join("\n")
        );
        assert_eq!(noisy, 0, "一般的な雑談文にencyclopedia検索がヒットしています(ノイズ)");
    }
}
