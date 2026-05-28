# Doremi - 楽譜譜読み練習アプリ

楽譜PDFを登録してドレミの譜読みを練習するWebアプリ。楽譜は Cloud Run 上の oemer（OMR エンジン）で MusicXML に変換し、Firestore に保存。テンポ連動の採点機能で練習をサポートする。

## アカウント

- Firebase プロジェクトID: `doremi-2d517`（作成後に更新）
- 利用アカウント: `itagaki.shintaro@gmail.com`

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# フロントエンドビルド
npm run build

# デプロイ（ビルド後に実行）
firebase deploy

# Functionsのみデプロイ
firebase deploy --only functions

# Claude APIキーの登録（初回のみ）
firebase functions:secrets:set ANTHROPIC_API_KEY

# OMR (Cloud Run) のセットアップ・再デプロイ → docs/cloud-run-omr.md 参照
```

## 技術スタック

- フロントエンド: React + Vite + TypeScript + Tailwind CSS
- バックエンド: Firebase Functions (Node.js 20) + `@anthropic-ai/sdk` + `google-auth-library`
- OMR: Cloud Run Jobs (Python 3.12 + oemer) — `omr-service/` 参照、ジョブ名 `omr-job`
- DB: Firestore / 認証: Firebase Auth (Google) / ストレージ: Firebase Storage / ホスティング: Firebase Hosting
- Claudeモデル: `claude-sonnet-4-6`（音声認識用途のみ。楽譜解析は oemer）

## 重要な注意点

- **APIキーはコードに書かない**: `ANTHROPIC_API_KEY` は Firebase Secret Manager に保管
- **Claude APIはFunctions経由のみ**: フロントから直接呼ばない
- **OMR は Cloud Run Jobs 経由のみ**: Functions は projects.locations.jobs.run API で omr-job を実行起動する
- Functions の predeploy は `cd functions && node_modules/.bin/tsc`（npm v11バグ回避）
- `firebase.ts` の `firebaseConfig` に実際のプロジェクト設定値を記入する
- `functions/.env.doremi-2d517` に `PROJECT_ID=doremi-2d517` を記載（Jobs API のリソースパス組み立てに使用）
- gcloud のグローバル設定は変えない。Doremi 関連のコマンドは全て `--project doremi-2d517` を付ける

## ファイル構成

```
src/                        # フロントエンド
  firebase.ts               # Firebase初期化（firebaseConfigを要設定）
  types.ts                  # 型定義
  hooks/
    useAuth.ts
    useScores.ts
    useParts.ts
    usePractice.ts
  pages/
    Login.tsx
    Dashboard.tsx
    ScoreUpload.tsx
    ScoreDetail.tsx
    Practice.tsx
    Result.tsx
  components/
    Layout.tsx
    ScoreCard.tsx
    PartViewer.tsx
    NoteInput.tsx
    VoiceInput.tsx
    Timer.tsx
functions/src/
  parsePdfScore.ts           # Cloud Run Job omr-job を実行起動して即返却
  recognizeSpeech.ts         # Claude API で音声→ドレミ変換
  checkClearStatus.ts        # 全パートの直近結果からクリア判定
  index.ts
omr-service/                 # Cloud Run Job omr-job のソース（Python + oemer）
  Dockerfile, requirements.txt
  job_main.py                # ジョブのエントリポイント（env vars 読み取り）
  server.py                  # _process 関数本体（PDF→oemer→Firestore）
  runner.py                  # oemer ラッパー（np互換パッチ + pdftoppm）
  musicxml_parser.py         # MusicXML → NoteEntry[] 変換（Python）
  eval/                      # OMR 評価用サンプル（.gitignore対象、PNG/MusicXML）
docs/
  cloud-run-omr.md           # Cloud Run Jobs セットアップ・デプロイ手順
```

## クリア判定ロジック

各パートの `lastResult`（最新の練習結果）が全て `"plus"` のときクリア。
例: A+, B+, C-, A-, C+ の場合 → A の lastResult = "minus" → クリアにならない。
