//! ログに生の会話内容・PIIを出力していないことを`cargo test`のたびに
//! 機械的に検証する統合テスト。`network_boundary_test.rs`と同じ発想
//! (「主張をコードで検証する」)を、通信境界ではなくログ出力に適用したもの。
//!
//! このアプリは完全ローカル完結だが、`eprintln!`/`println!`/`tracing::*!`等の
//! デバッグ出力はターミナルやログファイルに残り得る。生徒の入力・AIの応答・
//! チャット履歴などをうっかりログに出してしまうと、「外部には送信しないが
//! 端末のログには生のPIIが残る」という抜け道になってしまう。
//!
//! アプローチ: `src/`以下のログ出力マクロ呼び出しを静的にスキャンし、
//! フォーマット文字列内の`{変数名}`インライン補間(このコードベースの
//! 主流のログの書き方)が、会話内容を保持していそうな変数名
//! (`message`/`content`/`text`/`reply`/`prompt`等)を含んでいないかを確認する。
//!
//! 制限事項(network_boundary_test.rs同様、これは補助的なガードレールであり
//! 完全な証明ではない):
//! - フォーマット文字列の外(`, some_var.field`のような位置引数)までは解析しない。
//!   このコードベースの既存ログは一貫してインライン補間`{ident}`を使っているため、
//!   まずその書き方をカバーする。
//! - 変数名ベースのヒューリスティックなので、`content_length`のように紛らわしくない
//!   複合語は誤検知しない一方、意図的に紛らわしい変数名を付ければすり抜けられる。
//!   レビュー時の注意も引き続き必要。
//! - 該当行に`// log-safety: allow`コメントがあれば意図した例外として許可する
//!   (その場合は「なぜ生データではないか」を併記すること)。

use std::fs;
use std::path::Path;

/// ログ出力マクロとみなす識別子(呼び出し開始位置の検出に使う)。
const LOG_MACROS: &[&str] = &[
    "println!",
    "eprintln!",
    "print!",
    "eprint!",
    "info!",
    "warn!",
    "error!",
    "debug!",
    "trace!",
];

/// フォーマット文字列中の`{ident}`補間で、会話内容やPIIを保持していそうな変数名
/// (末尾のドット区切りセグメントで比較する。例: `msg.content` → `content`)。
const SUSPICIOUS_IDENTS: &[&str] = &[
    "content",
    "message",
    "messages",
    "text",
    "reply",
    "prompt",
    "input",
    "answer",
    "response",
    "query",
    "conversation",
    "history",
    "user_input",
    "raw_text",
    "chat_text",
];

const ALLOW_MARKER: &str = "log-safety: allow";

fn src_dir() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("src")
}

fn collect_rs_files(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_rs_files(&path, out);
        } else if path.extension().map(|e| e == "rs").unwrap_or(false) {
            out.push(path);
        }
    }
}

/// `{ident}` / `{ident:fmt}` 形式の補間箇所から識別子だけを取り出す
/// (`{{`/`}}`のエスケープされた波括弧はここでは対象にしない=無視される)。
fn extract_inline_idents(format_str: &str) -> Vec<String> {
    let mut out = Vec::new();
    let bytes = format_str.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'{' {
            if i + 1 < bytes.len() && bytes[i + 1] == b'{' {
                i += 2;
                continue;
            }
            if let Some(rel_end) = format_str[i + 1..].find('}') {
                let inner = &format_str[i + 1..i + 1 + rel_end];
                let ident_part = inner.split(':').next().unwrap_or("");
                if !ident_part.is_empty()
                    && ident_part
                        .chars()
                        .next()
                        .map(|c| c.is_alphabetic() || c == '_')
                        .unwrap_or(false)
                {
                    out.push(ident_part.to_string());
                }
                i = i + 1 + rel_end + 1;
                continue;
            }
        }
        i += 1;
    }
    out
}

#[test]
fn no_raw_conversation_content_in_log_macros() {
    let mut files = Vec::new();
    collect_rs_files(&src_dir(), &mut files);
    assert!(
        !files.is_empty(),
        "src/ 以下の.rsファイルが1つも見つかりませんでした(テスト自体の前提が壊れています)"
    );

    let mut violations: Vec<String> = Vec::new();

    for path in &files {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for (line_no, line) in content.lines().enumerate() {
            if line.contains(ALLOW_MARKER) {
                continue;
            }
            let is_log_call = LOG_MACROS.iter().any(|m| line.contains(m));
            if !is_log_call {
                continue;
            }
            // フォーマット文字列(最初の"..."リテラル)だけを対象にする。
            // このコードベースのログ呼び出しは1行に収まっているものが大半なので、
            // 複数行にまたがる呼び出しは対象外(見逃しはあり得るが、
            // network_boundary_test.rs同様「早期検知の補助」として割り切る)。
            let Some(start) = line.find('"') else { continue };
            let rest = &line[start + 1..];
            let Some(rel_end) = rest.find('"') else { continue };
            let format_str = &rest[..rel_end];

            for ident in extract_inline_idents(format_str) {
                let last_segment = ident.rsplit('.').next().unwrap_or(&ident).to_lowercase();
                if SUSPICIOUS_IDENTS.contains(&last_segment.as_str()) {
                    violations.push(format!(
                        "{}:{}: ログ出力に \"{{{ident}}}\" が含まれています(変数名 \"{last_segment}\" は会話内容/PIIを保持していそうです)",
                        path.display(),
                        line_no + 1,
                    ));
                }
            }
        }
    }

    assert!(
        violations.is_empty(),
        "\n生の会話内容・PIIをログに出力している可能性がある箇所が見つかりました:\n{}\n\
         意図的で安全と確認できる場合は、該当行に `// log-safety: allow` コメントを付け、\
         なぜ生データではないか(例: 既に匿名化済み/固定文言/メタデータのみ)を書いてください。",
        violations.join("\n")
    );
}
