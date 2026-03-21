@AGENTS.md

## 既知の制約・過去の失敗

- **Gemini APIはフィードバック用途に使用禁止**：過去2回試みたが、いずれも無料枠の制限（`limit: 0`）で失敗。gemini-2.0-flash / gemini-1.5-flash / gemini-2.0-flash-lite すべて同様のエラー。フィードバック・シナリオ生成・会話応答はすべて **Groq（llama-3.3-70b-versatile）を使うこと**。Geminiは翻訳API（`/api/translate`）のみ使用可。

## Git ルール

- 実装完了後は必ず `requirements.md` を最新状態に更新してから `git push` すること
- 機能の追加・修正・デプロイが完了したら、必ず `git add` → `git commit` → `git push origin master` を実行する
- コミットメッセージは変更内容を英語で簡潔に書く
- `vercel --prod` でデプロイした後も必ずGitにプッシュする
- `.env.local` はコミットしない（.gitignoreで除外済み）
- GitHub: https://github.com/jaipur1103-wq/speaq
