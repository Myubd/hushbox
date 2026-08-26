//! 学年モード別のシステムプロンプト。
//! TypeScript版(src/lib/llmEngine.ts)のロジックをRustへ移植。

use crate::knowledge::KnowledgeSnippet;

pub fn system_prompt_for(mode: &str) -> String {
    let base = "あなたは日本の義務教育段階の生徒と対話する、プライバシーに配慮したAI学習パートナーです。\n\
以下のルールを厳守してください。\n\
- やさしい日本語で、短く分かりやすく答える\n\
- 生徒の個人情報(氏名・住所・電話番号・学校名など)を尋ねたり、覚えたふりをしたりしない\n\
- 宿題の「答えだけ」を渡すのではなく、考え方のヒントを段階的に示す\n\
- わからないことは正直に「わからない」と言う。特に年号・人名・地名・作品名などの\
固有名詞や数字は、自信が無い場合に「たぶんこうだったはず」と作り話をせず、\
「正確には分からないから、大人や図書館・辞書で確認してね」と伝える\n\
- 不適切な内容(暴力・性的表現・自傷行為など)には応じず、大人に相談するよう伝える";

    let addition = match mode {
        "low" => {
            "\n- 相手は小学校低学年です。ひらがなを多めに、1文を短く、絵文字は使わず優しい口調で話してください。"
        }
        "mid" => {
            "\n- 相手は小学校中〜高学年です。「まず自分で考えてみよう」と一言添えてからヒントを出してください。"
        }
        "junior" => {
            "\n- 相手は中学生です。答えを一方的に与えるのではなく、「なぜそう言えると思う?」と問い返し、根拠を一緒に確認する対話を心がけてください。"
        }
        _ => "",
    };

    format!("{base}{addition}")
}

/// 問題バンク/百科事典の検索結果を、システムプロンプトに追記する
/// 「参照情報ブロック」として整形する。該当が無ければNoneを返す。
///
/// ここで渡した内容の範囲を超えて具体的な事実(特に年号・固有名詞)を
/// 創作しないよう明示的に指示することで、簡易的なRAG(検索拡張生成)として
/// 機能させている。参照情報が無い一般的な雑談では、この関数はNoneを返し、
/// system_prompt_for()の基本ルール(「わからないと正直に言う」)だけに委ねる。
pub fn build_reference_block(snippets: &[KnowledgeSnippet]) -> Option<String> {
    if snippets.is_empty() {
        return None;
    }

    let mut block = String::from(
        "\n\n[参考情報]\n\
以下は事前に確認済みの正確な情報です。回答する際はこの内容を優先して使い、\
ここに書かれていない具体的な年号・人名・数字などを新しく作り出さないでください。\
参考情報だけでは質問に十分答えられない場合は、分かる範囲だけ答えたうえで\
「それ以上は正確には分からない」と正直に伝えてください。\n",
    );
    for s in snippets {
        block.push_str(&format!("・{}: {}\n", s.title, s.body));
    }
    Some(block)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn includes_base_rules_for_all_modes() {
        for mode in ["low", "mid", "junior"] {
            let p = system_prompt_for(mode);
            assert!(p.contains("個人情報"));
        }
    }

    #[test]
    fn low_mode_mentions_hiragana() {
        assert!(system_prompt_for("low").contains("ひらがな"));
    }

    #[test]
    fn base_prompt_warns_against_fabricating_facts() {
        // ハルシネーション対策の指示が実際に含まれていることを確認
        let p = system_prompt_for("mid");
        assert!(p.contains("年号"));
        assert!(p.contains("作り話"));
    }

    #[test]
    fn reference_block_is_none_when_no_snippets() {
        assert!(build_reference_block(&[]).is_none());
    }

    #[test]
    fn reference_block_includes_snippet_content_and_guardrail_instruction() {
        let snippets = vec![KnowledgeSnippet {
            source: "encyclopedia",
            title: "1900年".to_string(),
            body: "1900年は19世紀最後の年です。".to_string(),
        }];
        let block = build_reference_block(&snippets).unwrap();
        assert!(block.contains("1900年は19世紀最後の年です"));
        assert!(block.contains("新しく作り出さないで"));
    }
}
