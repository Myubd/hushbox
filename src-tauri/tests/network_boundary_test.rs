//! P0-5: 「外部ネットワーク通信を行うコードは llm_engine.rs のみ」という
//! README/コード内コメントの主張(commands.rsの`send_message`にある
//! 「この関数の中に外部ネットワーク呼び出しは一切存在しない」等)を、
//! 目視確認ではなく毎回のCIで機械的に検証するための統合テスト。
//!
//! アプローチ: `cargo test`実行時にネットワークへ実際に接続するわけではなく、
//! `src/`以下のソースコードを静的にスキャンし、"通信を行いうるAPIの呼び出しや
//! URLリテラル" が `llm_engine.rs` 以外に出現していないかを確認する。
//! こうすることで、
//!   - 実ネットワークが無い/不安定なCI環境でも安定して実行できる
//!   - 新しいファイルで誰かがうっかり`reqwest`等を呼んでしまった場合に、
//!     レビューでの見落としに頼らずこのテストが落ちて気づける
//! というメリットがある。
//!
//! 逆に「本当に通信していないこと」の証明にはならない(README記載の
//! Wi-Fi切断テストやタスクマネージャー監視のような実機検証を置き換えるものではない)
//! ことには注意。あくまで「意図しない通信コードの混入」を早期検知するための
//! 補助的なガードレール。

use std::fs;
use std::path::Path;

/// 通信を行いうると判断するパターン。
/// 大文字小文字を区別せず、コメント/コード問わず単純な部分文字列一致で検出する
/// (誤検知よりも見逃しを避けることを優先したホワイトリスト式ではなくブラックリスト式)。
const NETWORK_INDICATORS: &[&str] = &[
    "reqwest",
    "tcpstream",
    "udpsocket",
    "std::net::",
    "hyper::",
    "http://",
    "https://",
];

/// 通信を行うことが許可されている唯一のファイル(相対パス、`src/`基準)。
/// ここに書かれたファイル以外でNETWORK_INDICATORSに一致した場合、テストは失敗する。
const ALLOWED_NETWORK_FILES: &[&str] = &["llm_engine.rs"];

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

#[test]
fn only_llm_engine_contains_network_code() {
    let mut files = Vec::new();
    collect_rs_files(&src_dir(), &mut files);
    assert!(
        !files.is_empty(),
        "src/ 以下の.rsファイルが1つも見つかりませんでした(テスト自体の前提が壊れています)"
    );

    let mut violations: Vec<String> = Vec::new();

    for path in &files {
        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        if ALLOWED_NETWORK_FILES.contains(&file_name.as_str()) {
            continue;
        }
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue, // 非UTF-8等は対象外(通常のRustソースには起こらない想定)
        };
        let lower = content.to_lowercase();
        for indicator in NETWORK_INDICATORS {
            if lower.contains(indicator) {
                violations.push(format!(
                    "{}: \"{}\" を含む行が見つかりました(通信コードは llm_engine.rs に閉じ込める設計のはず)",
                    path.display(),
                    indicator
                ));
            }
        }
    }

    assert!(
        violations.is_empty(),
        "\n通信の可能性があるコードが llm_engine.rs 以外に見つかりました:\n{}\n\
         意図した変更であれば ALLOWED_NETWORK_FILES にファイルを追加し、\
         なぜ通信が必要なのかをコメントで説明してください。",
        violations.join("\n")
    );
}

/// llm_engine.rs自体は「Hugging Faceのresolveエンドポイントへのプレーンな
/// HTTP GETのみ」を行う設計のはずなので、想定外のプロトコル/ドメインへの
/// アクセスをコード上で示唆する記述が無いかも軽くチェックしておく。
/// (完全な検証ではないが、"手元でついでにcurlで別のホストを叩いてみる"
/// ようなデバッグコードの消し忘れを拾う程度の安全網)
#[test]
fn llm_engine_only_targets_huggingface_resolve_endpoint() {
    let path = src_dir().join("llm_engine.rs");
    let content = fs::read_to_string(&path).expect("llm_engine.rs が読めませんでした");

    assert!(
        content.contains("https://huggingface.co/"),
        "llm_engine.rs にHugging FaceのURLが見つかりません。resolve_url()の実装を確認してください。"
    );

    // "http://"(非TLS)が紛れ込んでいないか。resolve_url()は必ずhttps固定のはず。
    let has_plain_http = content
        .lines()
        .filter(|line| !line.trim_start().starts_with("//"))
        .any(|line| line.contains("\"http://") || line.contains("'http://"));
    assert!(
        !has_plain_http,
        "llm_engine.rs に非TLS(http://)のURLリテラルが見つかりました。https固定を維持してください。"
    );
}
