# HushBox(プライバシー・バディ / Rustデスクトップ版)

生徒(小中学生)向けの、**完全ローカル動作のAI学習パートナー**。
[Tauri](https://tauri.app/) + [Candle](https://github.com/huggingface/candle)によるRust製デスクトップアプリ。
ブラウザ版([privacy-ai-buddy](../privacy-ai-buddy))からの移植版。

**Windows 11 + `npm run tauri build`のリリースビルドで、実際にモデルダウンロード→ローカル推論→PII匿名化まで一通り動作確認済みです。**

## セキュリティモデル(保護者・先生向け)

「本当にネット上に会話内容が送られていないの?」という確認は、技術に詳しくなくても以下の手順でご自身で行えます。

### このアプリが通信するタイミングは1回だけ

通信が発生するのは**初回起動時のモデルダウンロードのみ**です。この時、Hugging Face(AIモデルを配布している海外の公開サービス)からモデルファイル(1〜5GB程度)を1回だけダウンロードします。これは生徒の名前や会話内容を含みません(単にAIモデルのファイルをダウンロードするだけです)。

ダウンロードが完了した後は、**チャットも学習ドリルもすべてこの端末の中だけで完結**します。生徒の入力・AIの応答・PII(個人情報)検出の判定結果は、いずれもこの端末の外へは一切送信されません。

### ご自身で確認する方法

**方法1: Wi-Fiを切って使ってみる**
1. 初回起動時にモデルのダウンロードを完了させる(進捗バーが100%になるまで待つ)
2. いったんアプリを終了し、端末のWi-Fi(またはLANケーブル)を切断する
3. もう一度アプリを起動し、チャットや学習ドリルを試す
4. 通信がなくても普通に使えることを確認できます(2回目以降はモデルがキャッシュ済みのため、ネットが無くても起動できます)

**方法2: タスクマネージャー / アクティビティモニタで確認する**
- Windows: タスクマネージャー →「パフォーマンス」タブ →「イーサネット」または「Wi-Fi」
- macOS: アクティビティモニタ →「ネットワーク」タブ
- チャット中・学習ドリル中に、このアプリ(`hushbox` / `HushBox`)の通信量が0のままであることを確認できます

### なぜ技術的に「送信できない」と言えるのか

このアプリのソースコードの中で、外部にHTTP通信を行っている箇所は`src-tauri/src/llm_engine.rs`の`download_plain`関数(モデルファイルのダウンロード専用)**1箇所のみ**です。チャットの生成(`generate_stream`)やPII検出(`pii_guard.rs`)、学習ドリルの採点(`safety_drill.rs`, `learning_drill.rs`)は、いずれもこの端末上のCPU/GPU(Candleクレート)や正規表現処理のみで完結しており、ネットワーク呼び出しを一切含みません。ソースコードは公開されているので、`reqwest`(HTTP通信ライブラリ)の呼び出し箇所を検索すれば、この1箇所しか無いことをどなたでも確認できます。

## アーキテクチャ

```
┌─────────────────────────────┐
│  フロントエンド (React/TS)      │  ← 画面表示・入力
│  src/                        │
└──────────────┬───────────────┘
               │ Tauri IPC (プロセス内通信。ネットワークではない)
┌──────────────▼───────────────┐
│  バックエンド (Rust)            │
│  src-tauri/src/               │
│  ├─ pii_guard.rs   PII検出     │  ← regexクレート、10件のユニットテストで検証済み
│  ├─ prompts.rs     プロンプト生成│  ← ユニットテストで検証済み
│  ├─ llm_engine.rs  LLM推論     │  ← Candle(WebGPUではなくネイティブGPU/CPU)。reqwestで直接HTTPダウンロード
│  └─ commands.rs    IPC窓口     │
└───────────────────────────────┘
```

ブラウザ版はWebGPU上でWebLLMを動かしていましたが、こちらは**ブラウザすら経由しません**。
生徒のPC上でネイティブプロセスとして動くデスクトップアプリなので、「プライバシー」の説得力という点ではむしろ強くなっています(タブを閉じる/開くという概念すら不要)。

## 動作状況

### ✅ 実機(Windows 11)で動作確認済み

- PII検出ロジック(`pii_guard.rs`): `cargo test`で21件のユニットテストが全て通過(全角数字・自己紹介の言い回し違い・都道府県名なし住所など、見逃しやすいケースも重点的にカバー)
- プロンプト生成(`prompts.rs`): ユニットテストで検証済み
- モデルロード周りの安全性(`llm_engine.rs`): キャッシュ検証・モデル切替時のatomicなスワップ・同時ロード時の排他制御・会話履歴のトークン予算管理を、計12件のユニットテストで検証済み(実モデル不要、ネットワーク不要で実行可能)
- モデルダウンロード → GGUF読み込み → Candleでのローカル推論 → ストリーミング応答
- PII検出→匿名化した上でモデルに渡す一連のフロー(名前・学校名などを`[生徒名]`のように伏せてから送信)
- 外部通信量が常に0MBであることをタスクマネージャーで確認済み(推論中に一切通信しない設計が実際に機能している)

### 既知の課題(今後直したい点)

- **PII検出は依然として完全ではない**: `pii_guard.rs`は正規表現・辞書ベースのヒューリスティックであり、「教育的デモンストレーション」として意図的に完全性より見逃しの少なさを優先している。都道府県名・市区町村名を伴わない住所(「都道府県も市区町村名も出さずに、公園の名前など目印だけで場所を伝える」ケース)や、LINE ID等のSNS上のIDは現状検出対象外(詳細は`pii_guard.rs`のコード内コメントを参照)。
- **MSIインストーラーのビルドが失敗する**: `npm run tauri build`で実行ファイル(`.exe`)自体は問題なく生成されるが、WiXによるMSIパッケージ化の工程でエラーになる。`productName`に含まれる日本語・記号(「プライバシー・バディ」)がWiXと相性が悪い可能性がある。配布用インストーラーが必要になったら、`productName`を英数字にする/`bundle.targets`を`nsis`のみにするなどの対応が必要。

## つまずいたポイントと直した内容(記録)

Windows環境で実機ビルドしたときに、以下の問題に当たって直しました。同じ道を辿る人(未来の自分含む)向けのメモです。

1. **`icons/icon.ico`が無くてビルド失敗**: リポジトリに実アイコンを同梱していなかったため。`npm run tauri icon <元画像.png>`で`src-tauri/icons/`一式を生成する必要がある。
2. **`hf_hub::api::Api`が存在しない**: `hf-hub` v1.0でAPIが刷新され、旧`api::sync::Api`は廃止された。
3. **モデルダウンロードがネットワーク使用量0のまま無限にハングする**: Hugging Faceの新しい「Xet」チャンク転送方式(`hf-xet`クレート)が、一部のネットワーク環境で応答なしにハングする既知の不具合に遭遇。Python版の`HF_HUB_DISABLE_XET`環境変数はRustの`hf-hub`クレートには効かない。**`hf-hub`クレート自体を使うのをやめ、`reqwest`で`/resolve/main/<file>`エンドポイントに直接HTTP GETする方式に変更**(`llm_engine.rs`の`download_plain`関数)。進捗もバイト数ベースで自前計算するようにした。
4. **`init_model`が一度も呼ばれない(バックエンドのログが完全に無音)**: `src-tauri/capabilities/`ディレクトリごと欠落しており、Tauri v2のデフォルト権限では`event.listen`が許可されずフロントエンドの`listen()`呼び出しが例外を投げていた(その結果、後続の`invoke("init_model")`にすら到達していなかった)。`capabilities/default.json`を追加し、`core:event:allow-listen`等を明示的に許可して解決。
5. **推論がめちゃくちゃ遅い(1往復5分近く)**: `npm run tauri dev`のデバッグビルドで動かしていたのが主因。さらに`Cargo.toml`に**Tauri標準の`custom-protocol`フィーチャー定義自体が欠落**しており、`cargo build --release`を直接叩いても本番用アセットが埋め込まれず`ERR_CONNECTION_REFUSED`になっていた。`[features] default = ["custom-protocol"]` を追加し、`npm run tauri build`で正しくリリースビルドし、さらに`opt-level`を`"s"`(サイズ優先)から`3`(速度優先)に変更したところ、体感5分→15秒程度まで改善。

## セットアップ

### 1. Rustのインストール(rustup推奨)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustc --version   # 1.96以降を推奨(2026年8月時点、実際にビルド・全テスト通過を確認済みのバージョン。Cargo.tomlのrust-versionと合わせて更新すること)
```

### 2. OS別の追加依存関係

**macOS**: Xcode Command Line Tools (`xcode-select --install`)

**Linux (Ubuntu/Debian)**:
```bash
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev libgtk-3-dev libsoup-3.0-dev build-essential
```

**Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2(Windows 11は標準搭載)

### 3. フロントエンド依存関係

```bash
npm install
```

### 4. アイコンの生成(初回のみ)

`src-tauri/icons/`が無い状態だとビルドに失敗します。適当な正方形画像(1024×1024推奨)を用意して:

```bash
npm run tauri icon path/to/your-icon.png
```

### 5. 開発モードで起動

```bash
npm run tauri dev
```

初回ビルドはCandle関連クレートのコンパイルでかなり時間がかかります(数分〜十数分)。
起動後、初回のみモデルファイル(Qwen2.5-1.5B-Instruct GGUF、約1GB)をHugging Face Hubからダウンロードします。2回目以降はキャッシュ(`~/.cache/huggingface/hub-simple`)から読み込むため通信は発生しません。

**注意**: `npm run tauri dev`はRustのデバッグビルドで動くため、推論速度がかなり遅く感じます(数分待つこともある)。速度を確認したい場合は下記のリリースビルドを使ってください。

### 6. 本番(リリース)ビルドで速度を確認する

```bash
npm run tauri build
```

MSIインストーラーの生成でエラーが出ても、実行ファイル自体は `src-tauri/target/release/hushbox.exe`(Windowsの場合)に生成されているので、それを直接起動すれば問題ありません。

### GPUアクセラレーションを使う場合

```bash
# Apple Silicon
npm run tauri dev -- --features metal

# NVIDIA GPU
npm run tauri dev -- --features cuda
```

## プロジェクト構成

```
hushbox/
├── src/                      # フロントエンド(React + TypeScript)
│   ├── lib/tauriClient.ts    # Rustバックエンドを呼び出す唯一の窓口
│   ├── hooks/useChatEngine.ts
│   └── components/
├── src-tauri/                 # バックエンド(Rust)
│   ├── Cargo.toml
│   ├── Cargo.lock              # アプリなので意図的にコミット(動作確認済みバージョンを固定)
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json       # フロントエンドに許可するTauri IPC権限
│   ├── icons/                  # tauri iconコマンドで生成
│   └── src/
│       ├── main.rs
│       ├── lib.rs             # アプリ初期化・状態管理・IPCコマンド登録
│       ├── commands.rs        # フロントエンドから呼べるIPCコマンド
│       ├── pii_guard.rs       # PII検出(検証済み)
│       ├── prompts.rs         # 学年別システムプロンプト(検証済み)
│       └── llm_engine.rs      # Candleによるローカル推論 + reqwestでのモデルダウンロード
└── README.md
```

## 既知の制約

- PII検出は正規表現・辞書ベースのヒューリスティックであり、完全ではありません(教育的デモンストレーションとして設計。上記「既知の課題」も参照)。
- ネイティブCPU推論は、GPUアクセラレーションを使わない場合、モデルサイズによってはやや時間がかかります(リリースビルドで1.5Bモデルなら数秒〜十数秒程度が目安)。
- モデル自体(Qwen2.5)の学習データに起因するバイアスや誤情報のリスクは、ローカル実行でも解消されません。
- これは教育目的のプロトタイプです。実際に学校などで生徒に使わせる前には、追加のセキュリティレビュー・PII検出精度の検証を行ってください。
