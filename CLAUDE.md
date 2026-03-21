@AGENTS.md

## Git ルール

- 機能の追加・修正・デプロイが完了したら、必ず `git add` → `git commit` → `git push origin master` を実行する
- コミットメッセージは変更内容を英語で簡潔に書く
- `vercel --prod` でデプロイした後も必ずGitにプッシュする
- `.env.local` はコミットしない（.gitignoreで除外済み）
- GitHub: https://github.com/jaipur1103-wq/speaq
