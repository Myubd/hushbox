//! ローカルLLM推論エンジン。
//!
//! Candle(Hugging Face製のRust製ML基盤)を使い、量子化済みQwen2.5モデルを
//! この端末のCPU/GPU上で直接実行する。ネットワーク通信が発生するのは
//! 「初回起動時、モデルファイルをHugging Face Hubからダウンロードする瞬間」のみ。
//! 一度キャッシュされた後は、推論中に一切の通信が発生しない。
//!
//! 注意: Candleのモデル別API(quantized_qwen2 等)はクレートのバージョンによって
//! 細部が変わることがある。ビルド時にエラーが出た場合は、使用している
//! candle-transformers のバージョンのドキュメント/exampleを確認して調整すること。
//!
//! 注意2: hf-hub v1.0はデフォルトでHugging Faceの「Xet」チャンク転送プロトコル
//! (hf-xetクレート経由)を使う。一部のネットワーク環境ではこのXet専用の通信
//! (cas-server.xethub.hf.co 等への複数コネクション)がハングし、ネットワーク使用量が
//! 0のまま進捗が一切出ないことが確認されている(2026-08時点、hf-hub/hf-xet側の既知の問題。
//! Python版の`HF_HUB_DISABLE_XET`環境変数はこのRustクレートには効かない)。
//! そのため、hf-hubクレートは使わず、Hugging Faceの`/resolve/main/<file>`エンドポイントに
//! `reqwest`で直接プレーンなHTTP GETを行う方式に変更した。このエンドポイントはXetでない
//! クライアントからのリクエストに対してはCDN側でファイルを再構成し、通常のHTTPレスポンス
//! として返してくれる(curlでの動作確認済み)。

use std::path::{Path, PathBuf};
use std::sync::Arc;

use candle_core::quantized::gguf_file;
use candle_core::{Device, Tensor};
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::quantized_qwen2::ModelWeights as QuantizedQwen2;
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use thiserror::Error;
use tokenizers::Tokenizer;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

// デフォルトモデル(既存ユーザー向けの後方互換用。available_models()の"qwen1_5b"と一致させる)
const MODEL_REPO: &str = "Qwen/Qwen2.5-1.5B-Instruct-GGUF";
const MODEL_FILE: &str = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
const TOKENIZER_REPO: &str = "Qwen/Qwen2.5-1.5B-Instruct";
const TOKENIZER_FILE: &str = "tokenizer.json";
// リポジトリのHEADが動く"main"ブランチを指すと、キャッシュ済みファイルが
// 実際にはどのバージョンなのか特定できなくなる。revisionを明示することで、
// 「このアプリが期待しているのはどの時点のファイルか」をmanifestで検証可能にする。
const DEFAULT_REVISION: &str = "main";

/// 切り替え可能なモデルの定義。
/// Candle(GGUF量子化推論)はモデル全体を1つのデバイス(CPU/GPU)に載せる方式のため、
/// 「VRAM/RAMに完全に収まるか」で選択肢を絞っている。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSpec {
    pub id: String,
    pub label: String,
    pub repo: String,
    pub file: String,
    pub tokenizer_repo: String,
    pub tokenizer_file: String,
    /// Q4_K_M量子化後のおおよそのファイルサイズ(MB)。UIの目安表示用。
    pub approx_size_mb: u32,
    pub note: String,
    /// ダウンロード元のリポジトリrevision(ブランチ名 or commit SHA)。
    /// "main"のような可変ブランチを指す限り「同じrepo/fileでも中身が変わりうる」
    /// ことは避けられないため、可能な限りcommit SHAへの固定を推奨する。
    /// ここでは後方互換のため既定値として"main"を許容しつつ、キャッシュ側では
    /// このrevisionをmanifestに記録し、次回起動時に一致を検証する。
    #[serde(default = "default_revision")]
    pub revision: String,
}

fn default_revision() -> String {
    DEFAULT_REVISION.to_string()
}

/// ダウンロード済みファイルの由来を記録するmanifest。
/// キャッシュヒット判定を「ファイルが存在するか」ではなく
/// 「期待しているrepo/revision/fileと一致し、サイズも記録時と変わっていないか」
/// で行うために使う。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct CacheManifest {
    repo: String,
    revision: String,
    file: String,
    sha256: String,
    size: u64,
    downloaded_at_unix: u64,
}

fn manifest_path(dest_path: &Path) -> PathBuf {
    let mut name = dest_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    name.push_str(".manifest.json");
    dest_path.with_file_name(name)
}

async fn sha256_of_file(path: &Path) -> Result<String, EngineError> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|e| EngineError::Download(e.to_string()))?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1024 * 1024];
    loop {
        let n = file
            .read(&mut buf)
            .await
            .map_err(|e| EngineError::Download(e.to_string()))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// 既存のキャッシュファイルが「期待しているrepo/revision/fileと一致し、
/// manifest記録時からサイズが変わっていないか」を検証する。
/// 一致すればそのまま信頼して使い、一致しなければ再ダウンロードを行う
/// (壊れたファイル・別バージョン・手動での置き換えを無条件に信用しない)。
async fn verify_cached_file(
    dest_path: &Path,
    repo: &str,
    revision: &str,
    file: &str,
) -> bool {
    if !dest_path.exists() {
        return false;
    }
    let manifest_p = manifest_path(dest_path);
    let manifest_bytes = match tokio::fs::read(&manifest_p).await {
        Ok(b) => b,
        Err(_) => {
            eprintln!("[llm_engine] manifestが見つからないためキャッシュを再検証します: {}", dest_path.display());
            return false;
        }
    };
    let manifest: CacheManifest = match serde_json::from_slice(&manifest_bytes) {
        Ok(m) => m,
        Err(_) => return false,
    };
    if manifest.repo != repo || manifest.revision != revision || manifest.file != file {
        eprintln!(
            "[llm_engine] キャッシュのmanifestが期待値と不一致(repo/revision/fileが違う)のため再ダウンロードします: {}",
            dest_path.display()
        );
        return false;
    }
    let actual_size = match tokio::fs::metadata(dest_path).await {
        Ok(m) => m.len(),
        Err(_) => return false,
    };
    if actual_size != manifest.size {
        eprintln!(
            "[llm_engine] キャッシュファイルのサイズがmanifestと不一致(壊れている可能性)のため再ダウンロードします: {}",
            dest_path.display()
        );
        return false;
    }
    true
}

/// 選択可能なモデルの一覧(表示順)。
pub fn available_models() -> Vec<ModelSpec> {
    vec![
        ModelSpec {
            id: "qwen1_5b".to_string(),
            label: "Qwen2.5 1.5B(標準・高速)".to_string(),
            repo: MODEL_REPO.to_string(),
            file: MODEL_FILE.to_string(),
            tokenizer_repo: TOKENIZER_REPO.to_string(),
            tokenizer_file: TOKENIZER_FILE.to_string(),
            approx_size_mb: 1100,
            note: "どの端末でも快適に動く軽量モデル。回答の精度は控えめ。".to_string(),
            revision: default_revision(),
        },
        ModelSpec {
            id: "qwen3b".to_string(),
            label: "Qwen2.5 3B(バランス)".to_string(),
            repo: "Qwen/Qwen2.5-3B-Instruct-GGUF".to_string(),
            file: "qwen2.5-3b-instruct-q4_k_m.gguf".to_string(),
            tokenizer_repo: "Qwen/Qwen2.5-3B-Instruct".to_string(),
            tokenizer_file: TOKENIZER_FILE.to_string(),
            approx_size_mb: 2100,
            note: "精度と速度のバランス型。16GB RAM・CPU推論でも実用範囲。".to_string(),
            revision: default_revision(),
        },
        ModelSpec {
            id: "qwen7b".to_string(),
            label: "Qwen2.5 7B(高精度)".to_string(),
            repo: "bartowski/Qwen2.5-7B-Instruct-GGUF".to_string(),
            file: "Qwen2.5-7B-Instruct-Q4_K_M.gguf".to_string(),
            tokenizer_repo: "Qwen/Qwen2.5-7B-Instruct".to_string(),
            tokenizer_file: TOKENIZER_FILE.to_string(),
            approx_size_mb: 4700,
            note: "8GB以上のVRAM(NVIDIA/Apple Silicon)推奨。CPUのみだと遅い場合あり。"
                .to_string(),
            revision: default_revision(),
        },
    ]
}

pub fn default_model_id() -> &'static str {
    "qwen1_5b"
}

pub fn find_model(id: &str) -> Option<ModelSpec> {
    available_models().into_iter().find(|m| m.id == id)
}

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("モデルのダウンロードに失敗しました: {0}")]
    Download(String),
    #[error("モデルの読み込みに失敗しました: {0}")]
    Load(String),
    #[error("推論中にエラーが発生しました: {0}")]
    Inference(String),
    #[error("トークナイザの読み込みに失敗しました: {0}")]
    Tokenizer(String),
}

pub struct GenerationChunk {
    pub token: String,
    pub done: bool,
}

/// ダウンロード進捗をフロントエンドへ伝えるための状態
#[derive(Debug, Clone, serde::Serialize)]
pub struct LoadProgress {
    pub stage: String, // "downloading" | "loading" | "ready"
    pub detail: String,
}

pub struct LlmEngine {
    model: QuantizedQwen2,
    tokenizer: Tokenizer,
    device: Device,
}

/// OS標準のHugging Faceキャッシュディレクトリ(~/.cache/huggingface/hub 相当)。
fn cache_dir() -> PathBuf {
    dirs_cache_root().join("huggingface").join("hub-simple")
}

fn dirs_cache_root() -> PathBuf {
    // dirsクレートを増やさず、標準の環境変数だけで解決する簡易実装。
    if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
        return PathBuf::from(home).join(".cache");
    }
    std::env::temp_dir()
}

/// `owner/name` 形式のリポジトリ指定から `/resolve/<revision>/<file>` の実ダウンロードURLを組み立てる。
fn resolve_url(repo: &str, revision: &str, file: &str) -> String {
    format!("https://huggingface.co/{repo}/resolve/{revision}/{file}")
}

/// Hugging Faceの`resolve`エンドポイントへ素朴なHTTP GETでアクセスし、進捗つきでファイルへ保存する。
/// hf-hubクレートのXet経由ダウンロードで発生していたハング(ネットワーク使用量0のまま無応答)を
/// 避けるため、プレーンなreqwestストリーミングダウンロードに統一している。
///
/// キャッシュヒット判定は「ファイルが存在するか」だけでは行わない。
/// ダウンロード成功時に repo/revision/file/sha256/size を記録したmanifestを
/// 同じディレクトリに残し、次回以降はそのmanifestが今回のリクエストと一致し、
/// かつファイルサイズが記録時から変化していない場合にのみキャッシュを信頼する。
/// 一致しなければ「壊れている/別バージョン/手動で置き換えられた」ファイルとみなし、
/// 再ダウンロードする。
async fn download_plain(
    repo: &str,
    revision: &str,
    file: &str,
    dest_dir: &Path,
    label: &str,
    progress_tx: &mpsc::UnboundedSender<LoadProgress>,
) -> Result<PathBuf, EngineError> {
    std::fs::create_dir_all(dest_dir).map_err(|e| EngineError::Download(e.to_string()))?;
    let dest_path = dest_dir.join(file);

    // 既にキャッシュ済み「かつ」manifestの内容が今回の期待値と一致する場合のみ再利用する。
    if verify_cached_file(&dest_path, repo, revision, file).await {
        let _ = progress_tx.send(LoadProgress {
            stage: "downloading".into(),
            detail: format!("{label}はキャッシュ済みです(検証OK)"),
        });
        return Ok(dest_path);
    }

    let url = resolve_url(repo, revision, file);
    eprintln!("[llm_engine] {label}のダウンロードを開始: {url}");
    let http = reqwest::Client::builder()
        .user_agent("privacy-buddy-desktop")
        .build()
        .map_err(|e| EngineError::Download(e.to_string()))?;
    eprintln!("[llm_engine] HTTPクライアント作成OK。GETリクエストを送信します…");

    let response = http
        .get(&url)
        .send()
        .await
        .map_err(|e| EngineError::Download(format!("{label}への接続に失敗: {e}")))?
        .error_for_status()
        .map_err(|e| EngineError::Download(format!("{label}のダウンロードでエラー応答: {e}")))?;
    eprintln!(
        "[llm_engine] レスポンス受信OK。ステータス: {}, content-length: {:?}",
        response.status(),
        response.content_length()
    );

    let total_size = response.content_length().unwrap_or(0);
    let tmp_path = dest_path.with_extension("part");
    let mut out = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| EngineError::Download(e.to_string()))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_reported_mb: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| EngineError::Download(format!("{label}の受信中にエラー: {e}")))?;
        out.write_all(&chunk)
            .await
            .map_err(|e| EngineError::Download(e.to_string()))?;
        downloaded += chunk.len() as u64;

        let downloaded_mb = downloaded / (1024 * 1024);
        if downloaded_mb != last_reported_mb {
            last_reported_mb = downloaded_mb;
            let detail = if total_size > 0 {
                let total_mb = total_size / (1024 * 1024);
                let pct = (downloaded as f64 / total_size as f64 * 100.0).round();
                format!("{label}をダウンロード中… {downloaded_mb}MB / {total_mb}MB ({pct:.0}%)")
            } else {
                format!("{label}をダウンロード中… {downloaded_mb}MB")
            };
            let _ = progress_tx.send(LoadProgress {
                stage: "downloading".into(),
                detail,
            });
        }
    }

    out.flush().await.map_err(|e| EngineError::Download(e.to_string()))?;
    drop(out);
    tokio::fs::rename(&tmp_path, &dest_path)
        .await
        .map_err(|e| EngineError::Download(e.to_string()))?;

    // ダウンロード直後にハッシュを計算し、以後のキャッシュヒット判定に使うmanifestとして
    // 保存する。これにより「ファイルが存在する」ではなく「記録済みのサイズ・由来と一致する」
    // ことをキャッシュ再利用の条件にできる。
    let sha256 = sha256_of_file(&dest_path).await?;
    let size = tokio::fs::metadata(&dest_path)
        .await
        .map(|m| m.len())
        .unwrap_or(downloaded);
    let manifest = CacheManifest {
        repo: repo.to_string(),
        revision: revision.to_string(),
        file: file.to_string(),
        sha256,
        size,
        downloaded_at_unix: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
    };
    if let Ok(json) = serde_json::to_vec_pretty(&manifest) {
        let _ = tokio::fs::write(manifest_path(&dest_path), json).await;
    }

    Ok(dest_path)
}

impl LlmEngine {
    /// 初回はHugging Face Hubからモデルをダウンロード(以降はローカルキャッシュから読込)。
    /// キャッシュ先はOS標準のキャッシュディレクトリ(例: ~/.cache/huggingface/hub-simple)。
    /// `spec`で指定されたモデルを読み込む(モデル切り替え機能に対応)。
    pub async fn load(
        spec: &ModelSpec,
        progress_tx: mpsc::UnboundedSender<LoadProgress>,
    ) -> Result<Self, EngineError> {
        eprintln!("[llm_engine] LlmEngine::load() 開始: {}", spec.id);
        let _ = progress_tx.send(LoadProgress {
            stage: "downloading".into(),
            detail: format!("{}を確認しています…", spec.label),
        });

        let model_dir = cache_dir().join(spec.repo.replace('/', "--"));
        let model_path = download_plain(
            &spec.repo,
            &spec.revision,
            &spec.file,
            &model_dir,
            "モデルファイル",
            &progress_tx,
        )
        .await?;

        let _ = progress_tx.send(LoadProgress {
            stage: "downloading".into(),
            detail: "トークナイザを確認しています…".into(),
        });

        let tokenizer_dir = cache_dir().join(spec.tokenizer_repo.replace('/', "--"));
        let tokenizer_path = download_plain(
            &spec.tokenizer_repo,
            &spec.revision,
            &spec.tokenizer_file,
            &tokenizer_dir,
            "トークナイザ",
            &progress_tx,
        )
        .await?;

        let _ = progress_tx.send(LoadProgress {
            stage: "loading".into(),
            detail: "モデルをメモリに読み込んでいます…".into(),
        });

        // GPUが使えるならMetal/CUDAを、無ければCPUにフォールバック
        let device = Self::pick_device();

        let mut file = std::fs::File::open(&model_path)
            .map_err(|e| EngineError::Load(e.to_string()))?;
        let gguf_content = gguf_file::Content::read(&mut file)
            .map_err(|e| EngineError::Load(format!("GGUF解析エラー: {e}")))?;

        let model = QuantizedQwen2::from_gguf(gguf_content, &mut file, &device)
            .map_err(|e| EngineError::Load(e.to_string()))?;

        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| EngineError::Tokenizer(e.to_string()))?;

        let _ = progress_tx.send(LoadProgress {
            stage: "ready".into(),
            detail: "準備完了".into(),
        });

        Ok(Self {
            model,
            tokenizer,
            device,
        })
    }

    fn pick_device() -> Device {
        #[cfg(feature = "metal")]
        {
            if let Ok(d) = Device::new_metal(0) {
                return d;
            }
        }
        #[cfg(feature = "cuda")]
        {
            if let Ok(d) = Device::new_cuda(0) {
                return d;
            }
        }
        Device::Cpu
    }

    /// 1回の応答で生成する最大トークン数。
    /// 生徒向けチャットの応答としては長すぎても読みづらいため、
    /// ここで上限を決め打ちしている(マジックナンバーでcommands.rs側に
    /// 埋め込まれていたものを、根拠のある名前付き定数として引き上げた)。
    pub const DEFAULT_MAX_GENERATION_TOKENS: usize = 512;

    /// Qwen2.5-1.5B/3B/7BのGGUF量子化モデルはいずれも長いコンテキストに対応するが、
    /// この端末内推論では「メモリ使用量・レイテンシを予測可能な範囲に保つ」ことを優先し、
    /// アプリとして使う実効コンテキスト長に上限を設ける。
    /// 会話履歴が無制限に増えると、この上限を超えて推論が破綻したり
    /// (トークン列がモデルの許容範囲を超える)、応答が極端に遅くなったりするため、
    /// 古い履歴から切り詰めて上限内に収める。
    const MAX_CONTEXT_TOKENS: usize = 3072;

    /// system/user部分(常に含める固定部分)を除いた予算の中に収まるよう、
    /// historyを新しい方から遡って採用し、古いターンを切り詰めてプロンプトを組み立てる。
    /// `max_tokens`(生成予定トークン数)ぶんの余白も予算から差し引く。
    fn build_prompt_truncated(
        &self,
        system: &str,
        history: &[(String, String)],
        user_input: &str,
        max_tokens: usize,
    ) -> Result<String, EngineError> {
        let fixed_head = format!("<|im_start|>system\n{system}<|im_end|>\n");
        let fixed_tail = format!(
            "<|im_start|>user\n{user_input}<|im_end|>\n<|im_start|>assistant\n"
        );

        let count_tokens = |s: &str| -> Result<usize, EngineError> {
            self.tokenizer
                .encode(s, true)
                .map(|e| e.get_ids().len())
                .map_err(|e| EngineError::Tokenizer(e.to_string()))
        };

        let fixed_tokens = count_tokens(&fixed_head)? + count_tokens(&fixed_tail)?;
        let history_budget = Self::MAX_CONTEXT_TOKENS
            .saturating_sub(max_tokens)
            .saturating_sub(fixed_tokens);

        // 各ターンのテキストとトークン数のペアを作り、実際の「どれを含めるか」の
        // 判断はトークナイザに依存しない純粋関数(select_turns_within_budget)に委譲する。
        // こうすることで、実モデル/トークナイザなしにアルゴリズム部分だけを
        // ユニットテストで検証できる。
        let mut turns_with_counts: Vec<(String, usize)> = Vec::with_capacity(history.len());
        for (role, content) in history {
            let turn = format!("<|im_start|>{role}\n{content}<|im_end|>\n");
            let turn_tokens = count_tokens(&turn)?;
            turns_with_counts.push((turn, turn_tokens));
        }
        let included = Self::select_turns_within_budget(&turns_with_counts, history_budget);

        let mut prompt = fixed_head;
        for turn in included {
            prompt.push_str(turn);
        }
        prompt.push_str(&fixed_tail);
        Ok(prompt)
    }

    /// `turns`(新しい順ではなく元の会話順)を後ろ(新しい方)から遡り、
    /// 合計トークン数が`budget`を超えない範囲で採用する。
    /// 固定部分だけで予算を超えている場合(非常に長い1メッセージなど)でも
    /// panicせず、履歴なしの結果を返す(生成側で長さの問題が起きる可能性は
    /// あるが、それはモデル側のエラーとして通常のエラー処理に乗る)。
    ///
    /// トークナイザに依存しない純粋関数にしてあるのは、実モデルなしで
    /// 「新しい会話を優先し、古い履歴から切り詰める」という不変条件を
    /// ユニットテストで直接検証するため。
    fn select_turns_within_budget<'a>(
        turns: &'a [(String, usize)],
        budget: usize,
    ) -> Vec<&'a str> {
        let mut included_reversed: Vec<&str> = Vec::new();
        let mut used = 0usize;
        for (turn, turn_tokens) in turns.iter().rev() {
            if used + turn_tokens > budget {
                // これより古いターンは全て切り詰める(新しい会話の流れを優先)
                break;
            }
            used += turn_tokens;
            included_reversed.push(turn.as_str());
        }
        included_reversed.reverse();
        included_reversed
    }

    /// ストリーミング中の文字化け対策の核心ロジック。
    /// decode()の結果が「空」または「末尾が不完全なマルチバイト文字(U+FFFD)」で
    /// あれば、まだフロントエンドへ送出すべきではない(=もっとトークンを待つべき)。
    /// トークナイザに依存しない純粋関数にすることで、実モデルなしでこの
    /// 判定ロジック単体をユニットテストできるようにしている。
    fn should_flush_decoded_text(decoded: &str) -> bool {
        !decoded.is_empty() && !decoded.ends_with('\u{FFFD}')
    }

    /// ストリーミング生成。トークンが生成されるたびにチャンネルへ送出する。
    pub fn generate_stream(
        &mut self,
        system_prompt: &str,
        history: &[(String, String)],
        user_input: &str,
        max_tokens: usize,
        chunk_tx: mpsc::UnboundedSender<GenerationChunk>,
    ) -> Result<(), EngineError> {
        let prompt = self.build_prompt_truncated(system_prompt, history, user_input, max_tokens)?;

        let encoding = self
            .tokenizer
            .encode(prompt, true)
            .map_err(|e| EngineError::Tokenizer(e.to_string()))?;
        let mut tokens = encoding.get_ids().to_vec();

        let eos_token = self
            .tokenizer
            .token_to_id("<|im_end|>")
            .unwrap_or(u32::MAX);

        // temperatureとtop_pは、学習サポート用途として「多少単調でも正確さ優先」に
        // 寄せている。デフォルトの0.7/0.9だと、小規模モデル(1.5B)では
        // 支離滅裂な回答(例:「サマスの漢字」に対する意味不明な返答)が増えやすい。
        // シードは固定値だと同じ入力に対して常に同一の応答になってしまう
        // (学習パートナーとして「聞くたびに同じ返答」は不自然かつ、生徒が
        // 「決まった答えを覚える」だけになりかねない)ため、呼び出しごとに乱数で決める。
        let seed: u64 = rand::random();
        let mut logits_processor = LogitsProcessor::new(seed, Some(0.4), Some(0.85));

        // ストリーミング中の文字化け対策:
        // QwenのバイトレベルBPEでは、日本語1文字が複数トークンに分割されることが多い。
        // 生成された新トークンを毎回「単独で」decode()すると、マルチバイト文字の
        // 途中のバイト列だけを渡すことになり、tokenizerの内部UTF-8変換が
        // 不完全なバイト列をU+FFFD(�)に置き換えてしまう(=文字化けの直接原因)。
        //
        // 対策として、新トークンをpending_idsに溜め、decode結果が「末尾が
        // 不完全なマルチバイト文字(=末尾がU+FFFD)」である間は送出を保留し、
        // 文字が完成してから初めてフロントエンドへ送る。
        let mut pending_ids: Vec<u32> = Vec::new();

        for index in 0..max_tokens {
            let context_size = if index == 0 { tokens.len() } else { 1 };
            let start = tokens.len().saturating_sub(context_size);
            let input_ids = &tokens[start..];

            let input = Tensor::new(input_ids, &self.device)
                .map_err(|e| EngineError::Inference(e.to_string()))?
                .unsqueeze(0)
                .map_err(|e| EngineError::Inference(e.to_string()))?;

            let logits = self
                .model
                .forward(&input, start)
                .map_err(|e| EngineError::Inference(e.to_string()))?;
            let logits = logits
                .squeeze(0)
                .map_err(|e| EngineError::Inference(e.to_string()))?;

            let next_token = logits_processor
                .sample(&logits)
                .map_err(|e| EngineError::Inference(e.to_string()))?;

            if next_token == eos_token {
                break;
            }
            tokens.push(next_token);
            pending_ids.push(next_token);

            let decoded = self
                .tokenizer
                .decode(&pending_ids, false)
                .map_err(|e| EngineError::Tokenizer(e.to_string()))?;

            if !Self::should_flush_decoded_text(&decoded) {
                // 末尾が置換文字(U+FFFD)の場合、まだマルチバイト文字が完成していない
                // ため、ここでは送出せず次のトークンを待つ。
                continue;
            }

            if chunk_tx
                .send(GenerationChunk {
                    token: decoded,
                    done: false,
                })
                .is_err()
            {
                break; // 受信側(フロントエンド)が切断された
            }
            pending_ids.clear();
        }

        // 生成がmax_tokens到達やEOSで終わった時点で、まだ送出できていない
        // 断片が残っていれば、ベストエフォートで送る(通常はここに来ない)。
        if !pending_ids.is_empty() {
            if let Ok(decoded) = self.tokenizer.decode(&pending_ids, false) {
                if !decoded.is_empty() {
                    let _ = chunk_tx.send(GenerationChunk {
                        token: decoded,
                        done: false,
                    });
                }
            }
        }

        let _ = chunk_tx.send(GenerationChunk {
            token: String::new(),
            done: true,
        });

        Ok(())
    }
}

pub type SharedEngine = Arc<tokio::sync::Mutex<Option<LlmEngine>>>;
/// 現在ロードされているモデルのid(未ロード時はNone)。モデル切り替え機能用。
pub type SharedModelId = Arc<tokio::sync::Mutex<Option<String>>>;
/// init_model / switch_model の呼び出し全体を直列化するための専用ロック。
/// `()` を保持するだけのMutexで、ロード処理中は他の呼び出しをブロックする用途にのみ使う。
/// engine自体のMutex(SharedEngine)は「スワップの瞬間」だけを保護するのに対し、
/// こちらは「ダウンロード〜構築〜スワップまでの一連の処理全体」を1回に1つに制限する。
pub type ModelLoadLock = Arc<tokio::sync::Mutex<()>>;

/// P0-2の核心ロジック: 「新しい値の構築(ロード)が成功した場合にのみ、
/// 状態(engine/current_model)を新しい値に置き換える」というatomicスワップを、
/// Tauriの `AppHandle`/`State` から独立した汎用関数として切り出したもの。
///
/// こうすることで、実際のGGUFモデルのダウンロードやTauriランタイムを用意せずに、
/// 「ロード失敗時に旧モデルが失われない」という最重要の不変条件を
/// ユニットテストで直接検証できるようにしている(モックの`Result`を渡すだけでよい)。
///
/// `T`は`LlmEngine`本体を想定しているが、テストでは`i32`等の軽量な型で代用できる。
pub async fn apply_load_result<T>(
    shared_value: &Arc<tokio::sync::Mutex<Option<T>>>,
    shared_id: &Arc<tokio::sync::Mutex<Option<String>>>,
    result: Result<T, String>,
    target_id: String,
) -> Result<(), String> {
    match result {
        Ok(loaded) => {
            // 新しい値の構築が完全に成功したことがここで確定する。
            // 旧値の解放とのスワップを1つのロック区間内で行うことで、
            // 「一瞬どちらも存在しない」状態を他タスクが観測することを防ぐ。
            let mut guard = shared_value.lock().await;
            let mut cur = shared_id.lock().await;
            *guard = Some(loaded); // 旧値はここでdropされ、成功後にのみ解放される
            *cur = Some(target_id);
            Ok(())
        }
        Err(e) => {
            // 失敗時はshared_value/shared_idに一切触れない。
            // 呼び出し前に何かが読み込まれていた場合、そのまま使い続けられる。
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::Duration;

    // ── P0-1: キャッシュ検証(manifest)の統合テスト ──
    // 実際のGGUFファイルはダウンロードせず、ファイルI/O部分だけを
    // 一時ディレクトリ上で検証する。ネットワーク不要で実行できる。

    #[tokio::test]
    async fn cache_is_rejected_when_no_manifest_exists() {
        let dir = std::env::temp_dir().join(format!("hushbox_test_{}", uuid_like()));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        let dest = dir.join("model.gguf");
        tokio::fs::write(&dest, b"dummy-model-bytes").await.unwrap();

        // manifestを書いていない状態では、ファイルが存在してもキャッシュとして
        // 信頼してはいけない(旧実装の「existsだけで判定」バグの再発防止)。
        let ok = verify_cached_file(&dest, "some/repo", "main", "model.gguf").await;
        assert!(!ok);

        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[tokio::test]
    async fn cache_is_accepted_when_manifest_matches() {
        let dir = std::env::temp_dir().join(format!("hushbox_test_{}", uuid_like()));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        let dest = dir.join("model.gguf");
        let content = b"dummy-model-bytes";
        tokio::fs::write(&dest, content).await.unwrap();

        let manifest = CacheManifest {
            repo: "some/repo".to_string(),
            revision: "main".to_string(),
            file: "model.gguf".to_string(),
            sha256: "irrelevant-for-this-test".to_string(),
            size: content.len() as u64,
            downloaded_at_unix: 0,
        };
        tokio::fs::write(
            manifest_path(&dest),
            serde_json::to_vec_pretty(&manifest).unwrap(),
        )
        .await
        .unwrap();

        let ok = verify_cached_file(&dest, "some/repo", "main", "model.gguf").await;
        assert!(ok);

        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[tokio::test]
    async fn cache_is_rejected_when_revision_differs() {
        let dir = std::env::temp_dir().join(format!("hushbox_test_{}", uuid_like()));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        let dest = dir.join("model.gguf");
        let content = b"dummy-model-bytes";
        tokio::fs::write(&dest, content).await.unwrap();

        let manifest = CacheManifest {
            repo: "some/repo".to_string(),
            revision: "old-revision".to_string(), // 期待するrevisionと不一致
            file: "model.gguf".to_string(),
            sha256: "irrelevant".to_string(),
            size: content.len() as u64,
            downloaded_at_unix: 0,
        };
        tokio::fs::write(
            manifest_path(&dest),
            serde_json::to_vec_pretty(&manifest).unwrap(),
        )
        .await
        .unwrap();

        let ok = verify_cached_file(&dest, "some/repo", "main", "model.gguf").await;
        assert!(!ok, "revisionが違うキャッシュは再ダウンロードすべき");

        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[tokio::test]
    async fn cache_is_rejected_when_file_size_changed_after_manifest_written() {
        // 手動でのファイル置き換えや破損をシミュレート:
        // manifestに記録されたサイズと、実際のファイルサイズが食い違うケース
        let dir = std::env::temp_dir().join(format!("hushbox_test_{}", uuid_like()));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        let dest = dir.join("model.gguf");
        tokio::fs::write(&dest, b"dummy-model-bytes").await.unwrap();

        let manifest = CacheManifest {
            repo: "some/repo".to_string(),
            revision: "main".to_string(),
            file: "model.gguf".to_string(),
            sha256: "irrelevant".to_string(),
            size: 999_999, // 実際のファイルサイズと故意に不一致にする
            downloaded_at_unix: 0,
        };
        tokio::fs::write(
            manifest_path(&dest),
            serde_json::to_vec_pretty(&manifest).unwrap(),
        )
        .await
        .unwrap();

        let ok = verify_cached_file(&dest, "some/repo", "main", "model.gguf").await;
        assert!(!ok, "サイズが食い違うキャッシュ(壊れている可能性)は再ダウンロードすべき");

        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    fn uuid_like() -> String {
        // テスト用の衝突しにくいディレクトリ名(外部crateへの新規依存を避けるため簡易実装)
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        format!("{nanos}_{}", std::process::id())
    }

    // ── P0-2: atomicスワップの統合テスト ──

    #[tokio::test]
    async fn apply_load_result_updates_state_on_success() {
        let engine: Arc<tokio::sync::Mutex<Option<i32>>> = Arc::new(tokio::sync::Mutex::new(None));
        let current_id: SharedModelId = Arc::new(tokio::sync::Mutex::new(None));

        let result = apply_load_result(&engine, &current_id, Ok(42), "model-a".to_string()).await;

        assert!(result.is_ok());
        assert_eq!(*engine.lock().await, Some(42));
        assert_eq!(*current_id.lock().await, Some("model-a".to_string()));
    }

    #[tokio::test]
    async fn apply_load_result_preserves_old_value_on_failure() {
        // P0-2で修正した最重要の不変条件:
        // 「新モデルのロードに失敗しても、既にロード済みの旧モデルは失われない」
        let engine: Arc<tokio::sync::Mutex<Option<i32>>> =
            Arc::new(tokio::sync::Mutex::new(Some(1)));
        let current_id: SharedModelId =
            Arc::new(tokio::sync::Mutex::new(Some("model-a".to_string())));

        let result = apply_load_result(
            &engine,
            &current_id,
            Err("ダウンロード失敗".to_string()),
            "model-b".to_string(),
        )
        .await;

        assert!(result.is_err());
        // 旧モデル(1, "model-a")がそのまま残っていること
        assert_eq!(*engine.lock().await, Some(1));
        assert_eq!(*current_id.lock().await, Some("model-a".to_string()));
    }

    // ── P1: モデルロード排他ロックの統合テスト ──

    #[tokio::test]
    async fn model_load_lock_serializes_concurrent_loads() {
        let load_lock: ModelLoadLock = Arc::new(tokio::sync::Mutex::new(()));
        let concurrent_count = Arc::new(AtomicUsize::new(0));
        let max_observed = Arc::new(AtomicUsize::new(0));

        let mut handles = Vec::new();
        for _ in 0..5 {
            let lock = load_lock.clone();
            let concurrent = concurrent_count.clone();
            let max_observed = max_observed.clone();
            handles.push(tokio::spawn(async move {
                let _guard = lock.lock().await;
                // ロード処理のシミュレーション(ダウンロード+構築を模す)
                let now = concurrent.fetch_add(1, Ordering::SeqCst) + 1;
                max_observed.fetch_max(now, Ordering::SeqCst);
                tokio::time::sleep(Duration::from_millis(20)).await;
                concurrent.fetch_sub(1, Ordering::SeqCst);
            }));
        }
        for h in handles {
            h.await.unwrap();
        }

        // ロックが効いていれば、同時に「ロード処理中」だったタスクは常に1つだけのはず
        assert_eq!(
            max_observed.load(Ordering::SeqCst),
            1,
            "model_load_lockが機能していれば、ロード処理は直列化されるはず"
        );
    }

    // ── P1: 会話履歴truncationアルゴリズムの統合テスト ──
    // トークナイザ(実モデル)なしで、予算内選択ロジックだけを検証する。

    #[test]
    fn history_selection_keeps_all_turns_when_within_budget() {
        let turns = vec![
            ("turn1".to_string(), 10),
            ("turn2".to_string(), 10),
            ("turn3".to_string(), 10),
        ];
        let selected = LlmEngine::select_turns_within_budget(&turns, 100);
        assert_eq!(selected, vec!["turn1", "turn2", "turn3"]);
    }

    #[test]
    fn history_selection_drops_oldest_turns_first_when_over_budget() {
        let turns = vec![
            ("oldest".to_string(), 10),
            ("middle".to_string(), 10),
            ("newest".to_string(), 10),
        ];
        // 予算20: newest(10)+middle(10)=20で収まるが、oldestを足すと超過するため
        // oldestだけが切り詰められるはず
        let selected = LlmEngine::select_turns_within_budget(&turns, 20);
        assert_eq!(selected, vec!["middle", "newest"]);
    }

    #[test]
    fn history_selection_returns_empty_when_budget_is_zero() {
        let turns = vec![("only".to_string(), 5)];
        let selected = LlmEngine::select_turns_within_budget(&turns, 0);
        assert!(selected.is_empty());
    }

    #[test]
    fn history_selection_does_not_panic_when_single_turn_exceeds_budget() {
        // 固定部分だけで予算を超えるような極端なケースでもpanicしないことを確認
        let turns = vec![("huge-turn".to_string(), 10_000)];
        let selected = LlmEngine::select_turns_within_budget(&turns, 100);
        assert!(selected.is_empty());
    }

    #[test]
    fn history_selection_preserves_conversation_order() {
        let turns = vec![
            ("t1".to_string(), 5),
            ("t2".to_string(), 5),
            ("t3".to_string(), 5),
            ("t4".to_string(), 5),
        ];
        let selected = LlmEngine::select_turns_within_budget(&turns, 15);
        // 予算15なら新しい3ターン(t2,t3,t4)が残るはずで、かつ会話順(古い→新しい)を保つ
        assert_eq!(selected, vec!["t2", "t3", "t4"]);
    }

    // ── ストリーミング文字化け対策(should_flush_decoded_text)の統合テスト ──
    // 実際にはQwenのバイトレベルBPEトークナイザが、マルチバイト文字の途中で
    // decode結果の末尾にU+FFFDを生成するケースを再現している。

    #[test]
    fn should_not_flush_empty_decoded_text() {
        assert!(!LlmEngine::should_flush_decoded_text(""));
    }

    #[test]
    fn should_not_flush_when_ends_with_replacement_char() {
        // マルチバイト文字(例: 日本語1文字)の途中までしかトークンが
        // 揃っていない場合、tokenizerのdecode()は末尾にU+FFFDを返す
        let incomplete = "こんにちは\u{FFFD}";
        assert!(!LlmEngine::should_flush_decoded_text(incomplete));
    }

    #[test]
    fn should_flush_complete_ascii_text() {
        assert!(LlmEngine::should_flush_decoded_text("Hello"));
    }

    #[test]
    fn should_flush_complete_japanese_text() {
        // マルチバイト文字が完全に揃っていれば、置換文字は現れない
        assert!(LlmEngine::should_flush_decoded_text("こんにちは"));
    }

    #[test]
    fn should_flush_text_with_replacement_char_not_at_the_end() {
        // 万一、文中(末尾以外)に置換文字が含まれるケース(通常は起きないが)は
        // 「末尾が不完全」という判定条件には該当しないため送出してよい
        assert!(LlmEngine::should_flush_decoded_text("あ\u{FFFD}い"));
    }
}
