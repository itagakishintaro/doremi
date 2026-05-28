# Cloud Run Jobs: omr-job セットアップ＆デプロイ手順

楽譜PDFをoemerで解析し、結果を直接Firestoreに書き込む Cloud Run Job `omr-job` の手順書。
Firebase Functions（Node 20）から Cloud Run Admin API 経由で実行される。

**アーキテクチャ**: Cloud Run Jobs（バッチ実行）。

```
ブラウザ → parsePdfScore Function（即返却 1-2秒）
              ↓ projects.locations.jobs.run（execution overrides で env vars 注入）
            Cloud Run Job omr-job execution
              - oemer 処理（最大1時間）
              - MusicXML → ParsedScore 変換
              - Firestore に parts 書き込み + status="ready"
ブラウザ ← onSnapshot で status 変化を検知して UI 更新
```

**なぜ Service ではなく Jobs か**:
Cloud Run Service の HTTP モデルは「リクエスト処理＝インスタンス生存」のため、202即返却 + バックグラウンド処理だと **instance idle timeout（実測 28分）でインスタンスが殺される**。Jobs は実行時間中インスタンスが生かされ続けることが保証されている（task-timeout の範囲内）。

## 前提

- Google Cloud / Firebase プロジェクト ID: `doremi-2d517`
- 利用アカウント: `itagaki.shintaro@gmail.com`
- リージョン: `asia-northeast1`
- 料金プラン: Firebase Blaze
- ローカル: `gcloud` CLI と `docker` がインストール済み

> **重要**: gcloud のグローバル設定を書き換えない。全コマンドに `--project doremi-2d517` 付与。

## ディレクトリ構成

```
omr-service/                 # Cloud Run Job 用イメージのソース
  Dockerfile                 # python:3.12-slim + libgl/poppler + oemer + onnx モデル焼き込み
  requirements.txt
  server.py                  # _process 関数（ジョブの本体ロジック）
  runner.py                  # oemer ラッパー（np 互換パッチ + pdftoppm + extract）
  musicxml_parser.py         # MusicXML → NoteEntry[] 変換
  job_main.py                # Cloud Run Job のエントリポイント（env vars 読み取り）
  .dockerignore
  eval/                      # OMR 検証用サンプル（.gitignore対象）
```

## 0. 初回セットアップ（1回だけ）

```bash
# 認証確認
gcloud auth list

# 必要なAPIを有効化
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project doremi-2d517

# Artifact Registry リポジトリ作成
gcloud artifacts repositories create omr \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="OMR job images" \
  --project doremi-2d517

# Cloud Run ランタイム用サービスアカウント作成
gcloud iam service-accounts create omr-runner \
  --display-name="OMR Cloud Run runtime" \
  --project doremi-2d517

# 楽譜PDFバケット読み取り権限を付与
gcloud projects add-iam-policy-binding doremi-2d517 \
  --member="serviceAccount:omr-runner@doremi-2d517.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Firestore 書き込み権限を付与
gcloud projects add-iam-policy-binding doremi-2d517 \
  --member="serviceAccount:omr-runner@doremi-2d517.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Functions ランタイムSA（Compute Engine デフォルトSA）に Jobs 実行権限を付与
PROJECT_NUMBER=$(gcloud projects describe doremi-2d517 --format='value(projectNumber)' --project doremi-2d517)

gcloud projects add-iam-policy-binding doremi-2d517 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.developer" \
  --project doremi-2d517

# Functions SA から omr-runner SA を impersonate する権限（Jobs 実行時の serviceAccountActAs に必要）
gcloud iam service-accounts add-iam-policy-binding \
  omr-runner@doremi-2d517.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project doremi-2d517
```

## 1. ビルド & デプロイ

```bash
cd omr-service/

# Cloud Build でイメージビルド（Dockerfile を読んで Artifact Registry へ push）
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/doremi-2d517/omr/omr-service:latest \
  --project doremi-2d517

# 初回のみ: Cloud Run Job を新規作成
gcloud run jobs create omr-job \
  --image asia-northeast1-docker.pkg.dev/doremi-2d517/omr/omr-service:latest \
  --region asia-northeast1 \
  --service-account omr-runner@doremi-2d517.iam.gserviceaccount.com \
  --command python --args /app/job_main.py \
  --memory 8Gi --cpu 2 \
  --task-timeout 3600 \
  --max-retries 0 \
  --parallelism 1 --tasks 1 \
  --project doremi-2d517

# 2回目以降の更新: イメージを上書きビルドして job を更新
# gcloud run jobs update omr-job \
#   --image asia-northeast1-docker.pkg.dev/doremi-2d517/omr/omr-service:latest \
#   --region asia-northeast1 \
#   --project doremi-2d517
```

## 2. Functions に PROJECT_ID を設定してデプロイ

`functions/.env.doremi-2d517`:
```
PROJECT_ID=doremi-2d517
```

```bash
firebase deploy --only functions --project doremi-2d517
```

## 動作確認

### ローカルで Job を手動実行

実 PDF を使った動作確認:

```bash
# GCS にテスト PDF をアップロード（既にある場合は不要）
gsutil cp <local.pdf> gs://doremi-2d517.firebasestorage.app/debug/test.pdf

# Job を環境変数で実行
gcloud run jobs execute omr-job \
  --region asia-northeast1 \
  --update-env-vars \
    BUCKET=doremi-2d517.firebasestorage.app,OBJECT=debug/test.pdf,SCORE_ID=<your-firestore-doc-id>,USER_ID=<your-uid> \
  --wait \
  --project doremi-2d517
```

### Job 実行ログ

```bash
# 最新の実行を確認
gcloud run jobs executions list \
  --job omr-job --region asia-northeast1 \
  --project doremi-2d517

# 特定実行のログ
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="omr-job"' \
  --project doremi-2d517 --limit 30 \
  --format='value(timestamp,severity,textPayload)'
```

### Functions ログ

```bash
firebase functions:log --project doremi-2d517 --only parsePdfScore
# または
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="parsepdfscore"' \
  --project doremi-2d517 --limit 20
```

## トラブルシュート

| 症状 | 対処 |
|---|---|
| `np.int` AttributeError | numpy 2.x の互換性問題。`runner.py` 冒頭の `setattr(np, ...)` パッチで対応済 |
| opencv `libGL.so.1` not found | Dockerfile で `apt-get install libgl1` 済 |
| oemer がモデルダウンロードで SSL エラー | Dockerfile ビルド時に `curl` で取得済。実行時の再ダウンロードは発生しない |
| Functions から PERMISSION_DENIED で Jobs 実行不可 | Functions SA に `roles/run.developer` ＋ omr-runner SA に対する `roles/iam.serviceAccountUser` が必要 |
| Job 実行が60秒で切れる | `--task-timeout 3600` 指定漏れ |
| 4GiB でメモリ不足（実測） | 楽譜画像 + U-Net 推論で 8GiB 必須 |
| Cloud Run Service で 20分後 ECONNRESET、28分後 SIGTERM | Service の HTTP モデルが長時間バッチに不適。Jobs に移行することで根本解決（このアーキテクチャ） |

## 運用メモ

- **課金モデル**: 実行時間ベース。アイドル時は完全に $0
- **メモリ 8GiB**: U-Net 推論 + 高解像度ページ画像のため
- **task-timeout 3600秒（1時間）**: 1ページ約5分、4ページ楽譜で約20分
- **max-retries 0**: 失敗時の自動リトライなし（楽譜パース失敗は同じPDFで何度試しても同じ結果になりがちなので、Firestore に status=error を残してユーザー操作を促す）
- **完了通知**: Firestore 経由（`score.status: parsing → ready/error`）。フロントは `onSnapshot` で自動反映
- **更新**: コード変更後は `gcloud builds submit` でイメージ更新するだけ。Job 定義は同じイメージタグを参照するので毎回 `jobs update` 不要

## アーキテクチャの履歴（参考）

このプロジェクトでは以下の順で試行錯誤しました（同じ Cloud Run でも複数の選択肢があり、ハマりやすいので残します）:

1. **同期 Service**: Functions が Cloud Run Service の `/parse` を呼び、応答完了まで待つ
   - 問題: GFE の idle stream timeout で **20分で ECONNRESET**
2. **非同期 Service**: `/parse` が 202 即返却し、バックグラウンドスレッドで処理
   - 問題: Cloud Run の instance idle timeout で **28分で SIGTERM**、`--no-cpu-throttling` でも回避できず
3. **Cloud Run Jobs**（このドキュメントの構成）: バッチワークロード専用。task-timeout までインスタンス生存が保証される
   - 解決
