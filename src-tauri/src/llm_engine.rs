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
use thiserror::Error;
use tokenizers::Tokenizer;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;

// デフォルトモデル(既存ユーザー向けの後方互換用。available_models()の"qwen1_5b"と一致させる)
const MODEL_REPO: &str = "Qwen/Qwen2.5-1.5B-Instruct-GGUF";
const MODEL_FILE: &str = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
const TOKENIZER_REPO: &str = "Qwen/Qwen2.5-1.5B-Instruct";
const TOKENIZER_FILE: &str = "tokenizer.json";

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

/// `owner/name` 形式のリポジトリ指定から `/resolve/main/<file>` の実ダウンロードURLを組み立てる。
fn resolve_url(repo: &str, file: &str) -> String {
    format!("https://huggingface.co/{repo}/resolve/main/{file}")
}

/// Hugging Faceの`resolve`エンドポイントへ素朴なHTTP GETでアクセスし、進捗つきでファイルへ保存する。
/// hf-hubクレートのXet経由ダウンロードで発生していたハング(ネットワーク使用量0のまま無応答)を
/// 避けるため、プレーンなreqwestストリーミングダウンロードに統一している。
async fn download_plain(
    repo: &str,
    file: &str,
    dest_dir: &Path,
    label: &str,
    progress_tx: &mpsc::UnboundedSender<LoadProgress>,
) -> Result<PathBuf, EngineError> {
    std::fs::create_dir_all(dest_dir).map_err(|e| EngineError::Download(e.to_string()))?;
    let dest_path = dest_dir.join(file);

    // 既にキャッシュ済みならそのまま使う
    if dest_path.exists() {
        let _ = progress_tx.send(LoadProgress {
            stage: "downloading".into(),
            detail: format!("{label}はキャッシュ済みです"),
        });
        return Ok(dest_path);
    }

    let url = resolve_url(repo, file);
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

    /// Qwen2.5のChat ML形式でプロンプトを組み立てる
    fn build_prompt(system: &str, history: &[(String, String)], user_input: &str) -> String {
        let mut prompt = format!("<|im_start|>system\n{system}<|im_end|>\n");
        for (role, content) in history {
            prompt.push_str(&format!("<|im_start|>{role}\n{content}<|im_end|>\n"));
        }
        prompt.push_str(&format!(
            "<|im_start|>user\n{user_input}<|im_end|>\n<|im_start|>assistant\n"
        ));
        prompt
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
        let prompt = Self::build_prompt(system_prompt, history, user_input);

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
        let mut logits_processor = LogitsProcessor::new(299792458, Some(0.4), Some(0.85));

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

            let piece = self
                .tokenizer
                .decode(&[next_token], false)
                .map_err(|e| EngineError::Tokenizer(e.to_string()))?;

            if chunk_tx
                .send(GenerationChunk {
                    token: piece,
                    done: false,
                })
                .is_err()
            {
                break; // 受信側(フロントエンド)が切断された
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
