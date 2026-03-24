# Speaq — API 設計

## エンドポイント一覧

| エンドポイント | 用途 | AI | 返却値 |
|---|---|---|---|
| `POST /api/generate-scenario` | シナリオ生成 | Groq（2ステップ：生成→翻訳） | `{ ...scenarioFields, titleJa, briefJa, openerJa }` |
| `POST /api/counterpart-reply` | 相手役AI返答 | Groq（2ステップ） | `{ reply, replyJa }` |
| `POST /api/feedback` | セッション評価 | Groq | `{ encouragement, strengths, improvements, naturalExpressions, wordCount }` |
| `POST /api/translate` | テキスト翻訳 | Groq | `{ translations: string[] }` |
| `POST /api/punctuate` | 文章補正 | Groq | `{ corrected: string }` |
| `POST /api/transcribe` | 音声書き起こし | Groq Whisper | `{ text: string }` |

## 重要な実装ルール

- `fb.scores` は廃止。フィードバック判定は `fb.encouragement` を使う
- Gemini API はフィードバック用途禁止（無料枠制限で失敗する）
- 詳細は `english-practice/CLAUDE.md` の「重要な実装ルール」を参照
