#!/usr/bin/env python3
"""
P0対応: llm_engine::available_models() の各ModelSpecに埋め込むべき
「revision(commit SHA)」と「expected_sha256 / tokenizer_expected_sha256」を
Hugging Face Hub APIから取得し、そのままコピペできるRustコードとして出力する。

## なぜこのスクリプトが必要か

open-source なコード審査環境(このリポジトリをレビューしたCIやAIツールなど)は
huggingface.co に到達できないネットワークで動いていることが多い。
そのため「正しい値を確認しながらModelSpecに書き込む」作業はできず、
誤った値を勘で埋めると「アプリが誰の環境でも起動できなくなる」という
P0の変更が別のP0の障害を生む結果になりかねない。

このスクリプトは、huggingface.co に到達できる開発者のマシン上で実行することを
前提にしている。実行するとavailable_models()の各エントリに対応する
- revision (そのファイルが存在する時点のcommit SHA)
- expected_sha256 (LFSオブジェクトのSHA-256。small file の場合はダウンロードして計算)
- tokenizer_expected_sha256 (同上、トークナイザファイル用)
を取得し、Rustの `ModelSpec { ... }` に貼り付けられる形式で標準出力に出す。

## 使い方

    pip install requests
    python3 scripts/fetch_model_pins.py            # 全モデル
    python3 scripts/fetch_model_pins.py qwen1_5b    # 特定モデルのみ

出力されたブロックで、`src-tauri/src/llm_engine.rs` の `available_models()` 内の
該当する `revision: default_revision(), expected_sha256: None, tokenizer_expected_sha256: None,`
を置き換える。置き換えたら `cargo test` で `unpinned_model_ids()` の変化を確認し、
`llm_engine::tests::unpinned_models_are_reported_until_pins_are_filled` は
そのモデルIDが減った分だけ更新が必要になる(テストのassertが「まだ全部unpinned」
前提のため、pinを埋めたモデル分はテストから外すか、別の「pinned側」テストを足すこと)。
"""
from __future__ import annotations

import sys
import json
import urllib.request
import urllib.error

API_BASE = "https://huggingface.co/api/models"
RESOLVE_BASE = "https://huggingface.co"

# available_models() (src-tauri/src/llm_engine.rs) と同じ内容をここに複製している。
# Rust側を変更したら、このリストも合わせて更新すること。
MODELS = {
    "qwen1_5b": {
        "repo": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "file": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "tokenizer_repo": "Qwen/Qwen2.5-1.5B-Instruct",
        "tokenizer_file": "tokenizer.json",
    },
    "qwen3b": {
        "repo": "Qwen/Qwen2.5-3B-Instruct-GGUF",
        "file": "qwen2.5-3b-instruct-q4_k_m.gguf",
        "tokenizer_repo": "Qwen/Qwen2.5-3B-Instruct",
        "tokenizer_file": "tokenizer.json",
    },
    "qwen7b": {
        "repo": "bartowski/Qwen2.5-7B-Instruct-GGUF",
        "file": "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
        "tokenizer_repo": "Qwen/Qwen2.5-7B-Instruct",
        "tokenizer_file": "tokenizer.json",
    },
}


def http_get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "hushbox-pin-fetcher"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_head_commit(repo: str) -> str:
    """指定リポジトリの現在のmainブランチが指すcommit SHAを取得する。"""
    info = http_get_json(f"{API_BASE}/{repo}")
    sha = info.get("sha")
    if not sha:
        raise RuntimeError(f"{repo}: APIレスポンスにshaが含まれていません: {info}")
    return sha


def get_lfs_sha256(repo: str, revision: str, file: str) -> str:
    """
    LFS管理されているファイル(GGUFやtokenizer.jsonなど大きめのファイルは大抵LFS)の
    SHA-256を、実ファイルをダウンロードせずにHubのメタデータから取得する。
    LFSでない小さいファイルの場合は、実際にダウンロードしてローカルでハッシュ計算する
    フォールバックを行う。
    """
    tree = http_get_json(f"{API_BASE}/{repo}/tree/{revision}")
    for entry in tree:
        if entry.get("path") == file:
            lfs = entry.get("lfs")
            if lfs and lfs.get("oid"):
                # HFのtree APIはoidをそのまま返す(sha256:プレフィックス無し)ことが多い
                oid = lfs["oid"]
                return oid[len("sha256:"):] if oid.startswith("sha256:") else oid
            # LFSでない(=小さい)ファイルはダウンロードして計算する
            return sha256_by_download(repo, revision, file)
    raise RuntimeError(f"{repo}@{revision} に {file} が見つかりませんでした")


def sha256_by_download(repo: str, revision: str, file: str) -> str:
    import hashlib

    url = f"{RESOLVE_BASE}/{repo}/resolve/{revision}/{file}"
    req = urllib.request.Request(url, headers={"User-Agent": "hushbox-pin-fetcher"})
    hasher = hashlib.sha256()
    with urllib.request.urlopen(req, timeout=120) as resp:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def fetch_pin(model_id: str, spec: dict) -> dict:
    print(f"# {model_id}: revisionを取得中…", file=sys.stderr)
    revision = get_head_commit(spec["repo"])
    tokenizer_revision = get_head_commit(spec["tokenizer_repo"])

    print(f"# {model_id}: モデルファイルのSHA-256を取得中…(数分かかる場合があります)", file=sys.stderr)
    model_sha256 = get_lfs_sha256(spec["repo"], revision, spec["file"])

    print(f"# {model_id}: トークナイザのSHA-256を取得中…", file=sys.stderr)
    tokenizer_sha256 = get_lfs_sha256(
        spec["tokenizer_repo"], tokenizer_revision, spec["tokenizer_file"]
    )

    return {
        "revision": revision,
        "tokenizer_revision": tokenizer_revision,
        "expected_sha256": model_sha256,
        "tokenizer_expected_sha256": tokenizer_sha256,
    }


def main():
    targets = sys.argv[1:] or list(MODELS.keys())
    for model_id in targets:
        if model_id not in MODELS:
            print(f"不明なモデルID: {model_id}(有効な値: {', '.join(MODELS)})", file=sys.stderr)
            sys.exit(1)

    for model_id in targets:
        spec = MODELS[model_id]
        try:
            pin = fetch_pin(model_id, spec)
        except (urllib.error.URLError, RuntimeError) as e:
            print(f"# {model_id}: 取得に失敗しました: {e}", file=sys.stderr)
            continue

        # NOTE: モデルrevisionとtokenizer revisionは別リポジトリなので本来別々の値だが、
        # llm_engine::ModelSpec.revision は単一フィールドで両方に使い回している。
        # そのため、両方のrevisionをコメントとして出力しつつ、モデル側のrevisionを
        # 採用する(tokenizer側が違う場合は手動でModelSpecの構造を見直すこと)。
        if pin["revision"] != pin["tokenizer_revision"]:
            print(
                f"# 警告: {model_id} はモデルrevision({pin['revision']})とtokenizer revision"
                f"({pin['tokenizer_revision']})が別リポジトリのため異なります。"
                f"llm_engine::ModelSpec は revision を1つしか持てないため、"
                f"tokenizer_repo 側の resolve URL 生成に問題がないか確認してください。",
                file=sys.stderr,
            )

        print(f"        // === {model_id} (fetch_model_pins.py で生成) ===")
        print(f'        revision: "{pin["revision"]}".to_string(),')
        print(f'        expected_sha256: Some("{pin["expected_sha256"]}".to_string()),')
        print(
            f'        tokenizer_expected_sha256: Some("{pin["tokenizer_expected_sha256"]}".to_string()),'
        )
        print()


if __name__ == "__main__":
    main()
