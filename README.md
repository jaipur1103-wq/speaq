# Speaq — AI English Speaking Practice App

**「会話するたびに、使える表現が増える。」**

AIと英会話シナリオを通じて実践練習し、知らなかった表現を記録・定着させる英語スピーキング学習アプリ。

---

## 技術スタック

- **フレームワーク**: Next.js 16.2.0 (App Router, TypeScript)
- **ホスティング**: Vercel
- **AI (スピーキング評価・生成・会話)**: Groq API — `llama-3.3-70b-versatile`
- **AI (翻訳のみ)**: Gemini API — `gemini-2.0-flash`
- **音声認識**: Web Speech API (ブラウザ標準, Chrome推奨)
- **スタイリング**: インラインスタイル (CSS変数でテーマ管理)
- **状態管理**: React useState / localStorage

---

## 主要機能

### コアループ
1. **AIシナリオ生成** — トピック・難易度・業種・相手スタイルを設定してAIがシナリオを自動生成
2. **スピーキング練習** — マイクで音声入力 → AIが相手役として返答（複数ターン）
3. **セッション評価** — N ターン終了後にセッション全体をまとめて評価（4軸スコア + フィードバック）
4. **表現保存** → **Quiz** — フィードバックからキーパターンをノートに保存 → 音声Quizで定着
5. **履歴管理** — セッションスコアを記録・閲覧

### ページ構成

| ページ | パス | 説明 |
|---|---|---|
| ホーム | `/` | 設定・シナリオ一覧・生成ボタン |
| 練習 | `/practice/[id]` | スピーキングセッション本体 |
| ノート | `/notebook` | 保存した表現・Quiz |
| 履歴 | `/history` | スコア履歴 |
| ガイド | `/guide` | 使い方説明 |
| 作成 | `/create` | カスタムシナリオ作成（説明文→AI生成） |

### API エンドポイント

| エンドポイント | 用途 | AIモデル |
|---|---|---|
| `POST /api/generate-scenario` | 設定からシナリオ自動生成 | Groq |
| `POST /api/create-from-description` | 説明文からシナリオ生成 | Groq |
| `POST /api/counterpart-reply` | 相手役AIの返答生成 | Groq |
| `POST /api/feedback` | セッション全体の評価・フィードバック | Groq |
| `POST /api/translate` | テキスト翻訳（日本語化） | Gemini |

---

## 設定項目

| 項目 | 選択肢 | デフォルト |
|---|---|---|
| トピック | Business / Travel / Daily / Social / Study | Business |
| 難易度 | Beginner / Intermediate / Advanced | Intermediate |
| 業種 (Business時) | General / Tech / Finance / Consulting / Healthcare / Retail / Manufacturing | General |
| 相手スタイル | Friendly / Neutral / Tough | Neutral |
| セッション長 | 3 / 5 / 10 ターン | 5 |
| 言語 | EN / JA | EN |

---

## ローカル開発

```bash
npm install
npm run dev
```

`.env.local` に以下を設定：
```
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

---

## デプロイ

```bash
vercel --prod
git push origin master
```

GitHub: https://github.com/jaipur1103-wq/speaq
本番URL: https://english-practice-blue.vercel.app
