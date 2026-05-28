# Doremi - 楽譜譜読み練習アプリ

楽譜のPDFを登録して、ドレミの譜読みを練習するWebアプリ。Claude APIが楽譜を解析して音符データを抽出し、テンポに合わせた採点で学習効果を高める。

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
```

## 技術スタック

- フロントエンド: React + Vite + TypeScript + Tailwind CSS
- バックエンド: Firebase Functions (Node.js 20) + `@anthropic-ai/sdk`
- DB: Firestore / 認証: Firebase Auth (Google) / ストレージ: Firebase Storage / ホスティング: Firebase Hosting
- Claudeモデル: `claude-sonnet-4-6`

## 重要な注意点

- **APIキーはコードに書かない**: `ANTHROPIC_API_KEY` は Firebase Secret Manager に保管
- **Claude APIはFunctions経由のみ**: フロントから直接呼ばない
- Functions の predeploy は `cd functions && node_modules/.bin/tsc`（npm v11バグ回避）

## ファイル構成

```
src/                        # フロントエンド
  firebase.ts               # Firebase初期化
  types.ts                  # 型定義
  hooks/
    useAuth.ts              # 認証状態管理
    useScores.ts            # 楽譜一覧取得
    useParts.ts             # パート一覧取得
    usePractice.ts          # 練習状態管理（タイマー・採点）
  pages/
    Login.tsx               # Googleログイン
    Dashboard.tsx           # 楽譜一覧 + クリア状況
    ScoreUpload.tsx         # PDF登録
    ScoreDetail.tsx         # パート一覧
    Practice.tsx            # 練習画面
    Result.tsx              # 練習結果
  components/
    Layout.tsx
    ScoreCard.tsx           # ダッシュボードの楽譜カード
    PartViewer.tsx          # 楽譜パート画像表示
    NoteInput.tsx           # ドレミクリック入力
    VoiceInput.tsx          # 音声入力
    Timer.tsx               # テンポ連動タイマー
functions/src/              # Firebase Functions
  parsePdfScore.ts          # PDF解析 → Claude Vision → 音符・テンポ抽出
  recognizeSpeech.ts        # 音声認識 → Claude API → ドレミ変換
  checkClearStatus.ts       # 直近全パートのクリア判定
  index.ts                  # Functions登録
```

## データモデル（Firestore）

```
users/{userId}/
  scores/{scoreId}
    title, pdfUrl, pdfPath, totalParts, cleared, clearedAt, status, createdAt

  scores/{scoreId}/parts/{partId}
    index, imageUrl, notes[], tempo, timeSignature, lastResult

  scores/{scoreId}/practiceResults/{resultId}
    partId, answers[], passed, practizedAt
```
