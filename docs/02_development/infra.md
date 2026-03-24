# Speaq — インフラ構成

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js + TypeScript（App Router） |
| スタイリング | インライン CSS |
| 会話 AI | Groq（llama-3.3-70b-versatile） |
| 音声認識 | Groq Whisper（whisper-large-v3-turbo） |
| 翻訳 | Groq（フォールバック）/ Gemini（翻訳のみ OK） |
| ホスティング | Vercel |

## 環境変数（.env.local）

```
GROQ_API_KEY=
GEMINI_API_KEY=
```

## デプロイ

```bash
npm run build
vercel --prod
git add -A && git commit -m "Deploy" && git push origin master
```

## GitHub

https://github.com/jaipur1103-wq/speaq

## 本番 URL

https://english-practice-blue.vercel.app
