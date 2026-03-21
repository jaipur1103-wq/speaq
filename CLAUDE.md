@AGENTS.md

## 既知の制約・過去の失敗

- **Gemini APIはフィードバック用途に使用禁止**：過去2回試みたが、いずれも無料枠の制限（`limit: 0`）で失敗。gemini-2.0-flash / gemini-1.5-flash / gemini-2.0-flash-lite すべて同様のエラー。フィードバック・シナリオ生成・会話応答はすべて **Groq（llama-3.3-70b-versatile）を使うこと**。Geminiは翻訳API（`/api/translate`）のみ使用可。

## レイアウトルール

- **カード・コンポーネントの幅は必ず画面横幅いっぱいに広げること**: 全カード要素には `width: "100%"` + `boxSizing: "border-box"` + `alignSelf: "stretch"` を指定する。flexboxコンテナ内では `minWidth: 0` も追加する。日本語/英語切り替えやコンテンツ量の違いでカード幅が変わってはいけない。

## デプロイルール（最重要）

- **実装完了後は必ず `vercel --prod` でデプロイすること**。ユーザーはスマホのVercel環境でしか確認できないため、ローカルの変更だけでは意味がない
- デプロイ完了後に `git add` → `git commit` → `git push origin master` を実行する
- 実装→デプロイ→pushの順番を毎回守ること

## Git ルール

- 実装完了後は必ず `requirements.md` を最新状態に更新してから `git push` すること
- コミットメッセージは変更内容を英語で簡潔に書く
- `.env.local` はコミットしない（.gitignoreで除外済み）
- GitHub: https://github.com/jaipur1103-wq/speaq
