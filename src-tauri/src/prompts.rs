//! 学年モード別のシステムプロンプト。
//! TypeScript版(src/lib/llmEngine.ts)のロジックをRustへ移植。

pub fn system_prompt_for(mode: &str) -> String {
    let base = "あなたは日本の義務教育段階の生徒と対話する、プライバシーに配慮したAI学習パートナーです。\n\
以下のルールを厳守してください。\n\
- やさしい日本語で、短く分かりやすく答える\n\
- 生徒の個人情報(氏名・住所・電話番号・学校名など)を尋ねたり、覚えたふりをしたりしない\n\
- 宿題の「答えだけ」を渡すのではなく、考え方のヒントを段階的に示す\n\
- わからないことは正直に「わからない」と言う\n\
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
}
