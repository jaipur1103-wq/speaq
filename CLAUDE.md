@AGENTS.md

## プロンプト設計ルール（`/api/feedback`）

- **LLMへの例示にダブルクォートを使わない**: プロンプト内で英語フレーズを引用するときは `「」` を使う。ダブルクォートはJSONの文字列区切りと衝突し、パースエラーになる
- **プロンプトの肥大化を避ける**: 説明が長すぎるとLLMがJSON構造を守れなくなる。各ルールは1〜2行に収める
- **テンプレートリテラル内でバッククォートを使わない**: TypeScriptのtemplate literal内でバッククォート（`` ` ``）を使うと構文エラーになる

## 既知の制約・過去の失敗

- **Gemini APIはフィードバック用途に使用禁止**：過去2回試みたが、いずれも無料枠の制限（`limit: 0`）で失敗。gemini-2.0-flash / gemini-1.5-flash / gemini-2.0-flash-lite すべて同様のエラー。フィードバック・シナリオ生成・会話応答はすべて **Groq（llama-3.3-70b-versatile）を使うこと**。Geminiは翻訳API（`/api/translate`）のみ使用可。

## レイアウトルール

- **カード・コンポーネントの幅は必ず画面横幅いっぱいに広げること**: 全カード要素には `width: "100%"` + `boxSizing: "border-box"` + `alignSelf: "stretch"` を指定する。flexboxコンテナ内では `minWidth: 0` も追加する。日本語/英語切り替えやコンテンツ量の違いでカード幅が変わってはいけない。

## デプロイルール（最重要）

- **実装完了後は必ず `vercel --prod` でデプロイすること**。ユーザーはスマホのVercel環境でしか確認できないため、ローカルの変更だけでは意味がない
- デプロイ完了後に `git add` → `git commit` → `git push origin master` を実行する
- 実装→デプロイ→pushの順番を毎回守ること

## スピーキング評価指標（`/api/feedback`）

セッション全体（複数ターン）をまとめて評価する。1ターンごとの評価は行わない。

### 4軸スコア（各 0〜100）

| 軸 | 内容 |
|---|---|
| **accuracy** | 文法的正確さ（時制・冠詞・前置詞・文構造）※句読点は評価対象外 |
| **range** | 語彙・文法構造の幅広さ |
| **interaction** | 相手の発言への適切な応答・会話維持力 |
| **coherence** | 論理的なつながり・接続詞の使用・談話構造 |

### CEFR対応スコア目安

| スコア | CEFR | 説明 |
|---|---|---|
| 90〜100 | C2 | ほぼネイティブレベル |
| 75〜89 | C1 | 高い流暢性・複雑な表現 |
| 55〜74 | B2 | 一般的な話題で自然にやり取り |
| 35〜54 | B1 | 馴染みある状況での基本的コミュニケーション |
| 15〜34 | A2 | 簡単なフレーズと文で基本的な意思疎通 |
| 0〜14 | A1 | ごく限られた表現のみ |

### フィードバック構成

- `strengths`: 必ず2件。`[AxisName]` で始め（スコア・CEFRなし）、ユーザーの実際のセリフを引用して具体的に褒める
- `improvements`: 必ず2件。`[AxisName]` で始め（スコア・CEFRなし）。ユーザーの実際の発言を「」で引用し、難易度に合ったより良い表現を提示（beginner=A2 / intermediate=B1-B2 / advanced=C1-C2）。なぜ良いか1〜2文で説明。**JA設定時は日本語で書くこと**
- `naturalExpressions`: 2〜4件。improvements で取り上げた表現をベースに選ぶ。問題がなければ `[]`
  - **難易度別レベルフィルター**：beginner=A2のみ / intermediate=B1-B2のみ / advanced=C1-C2のみ
  - `reason`: grammar / collocation / literal / set-phrase / formality / nuance
  - `explanation`: なぜ元の表現が不自然か（1〜2文）。reason種別に応じた角度で説明。JA設定時は日本語
  - `chunk`: `natural` から直接抽出した学習価値のある英語表現。コロケーション・句動詞・イディオム・定型句・談話標識など型は問わない。可変部分を `~` に置換。意味のある固定語が3語以上必須。**NG（禁止）**: `It's ~` `from ~ to ~` `I ~ ~`（文法構造のみで学習価値なし）。**OK例**: `run into ~ issues` `It might be worth ~ing` `Having said that, ~`
  - `chunkDetail`: 〜に何が入るか・いつ使うか・実践アドバイス（1〜2文）。JA設定時は日本語
  - `example`: chunkを使った短い英文例
- `suggestedResponse`: 最後のターンの模範回答（英語）
- `overall`: 4軸の平均値

### 句読点ルール（重要）
- 音声入力（Web Speech API）のため、ユーザーの発話に句読点は存在しない
- accuracyスコアで句読点の欠如を減点してはいけない
- フィードバック文中で句読点に言及してはいけない

### 難易度別スコアリング方針

- **beginner**: CEFR A2目標。基本的な意思疎通ができていれば80〜100
- **intermediate**: CEFR B1〜B2目標
- **advanced**: CEFR C1〜C2目標。C1未満なら70点以下

## Git ルール

- 実装完了後は必ず `requirements.md` を最新状態に更新してから `git push` すること
- コミットメッセージは変更内容を英語で簡潔に書く
- `.env.local` はコミットしない（.gitignoreで除外済み）
- GitHub: https://github.com/jaipur1103-wq/speaq
