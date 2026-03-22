@AGENTS.md

## ⚠️ 現在の実装状態（セッション開始時に必ず確認すること）

### 型定義（`types/index.ts`）

```typescript
// Scenario: 日本語フィールドはすべてoptional
interface Scenario {
  titleJa?: string; briefJa?: string; openerJa?: string;  // 事前生成済み
  // ...その他フィールド
}

// Message: チャットバブルの日本語訳
interface Message {
  role: "user" | "counterpart";
  text: string;
  textJa?: string;   // ← counterpart-reply APIが返すreplyJaを保存
  timestamp: number;
}

// Feedback: スコア・CEFR廃止済み。improvements は文字列ではなくオブジェクト配列
interface Feedback {
  encouragement: string;
  strengths: string[];
  improvements: ImprovementItem[];  // ← { comment, suggestedResponse }
  naturalExpressions: NaturalExpression[];
  wordCount: number;
}

// ScoreRecord: フィードバック内容も保存
interface ScoreRecord {
  id: string; date: string; scenarioTitle: string; turnCount: number;
  scenarioCategory?: string; difficulty?: Difficulty;
  encouragement?: string; strengths?: string[];
  improvements?: ImprovementItem[]; expressionCount?: number;
}
```

### API設計（現在）

| エンドポイント | 返却値 | 注意点 |
|---|---|---|
| `/api/generate-scenario` | `{ ...scenarioFields, titleJa, briefJa, openerJa, difficulty, industry, personaStyle }` | 2ステップ：英語生成→日本語翻訳を別呼び出し |
| `/api/counterpart-reply` | `{ reply, replyJa }` | 2ステップ：返答生成→日本語翻訳を別呼び出し |
| `/api/feedback` | `{ encouragement, strengths, improvements, naturalExpressions, wordCount }` | **scoresフィールドは存在しない** |
| `/api/translate` | `{ translations: string[] }` | Groq使用。チャットバブルのフォールバックのみ |
| `/api/punctuate` | `{ corrected: string }` | 音声入力後の句読点補正 |
| `/api/transcribe` | `{ text: string }` | Groq Whisper |

### 重要な実装ルール（過去のバグから学んだ）

**1. フィードバック判定は `fb.encouragement` で行う（`fb.scores` は廃止）**
```typescript
// ✅ 正しい
if (fb.encouragement) { setFinalFeedback(fb as Feedback); }
// ❌ 間違い（scoresは存在しない）
if (fb.scores) { setFinalFeedback(fb as Feedback); }
```

**2. スコア保存は useEffect で自動実行（ボタン押下に依存しない）**
```typescript
useEffect(() => {
  if (finalFeedback && scenario && !scoreSaved) { doSaveScore(finalFeedback, scenario.title); }
}, [finalFeedback]);
```

**3. ScenarioCard の titleJa は言語設定に関係なく常に表示**
```typescript
// ✅ 正しい（titleJaがあれば常に表示）
{scenario.titleJa && <div>{scenario.titleJa}</div>}
// ❌ 間違い（lang条件は不要）
{lang === "ja" && scenario.titleJa && <div>{scenario.titleJa}</div>}
```

**4. 日本語翻訳は事前生成・保存済みのものを使う（translate APIは最終フォールバックのみ）**
- シナリオ生成時: `titleJa / briefJa / openerJa` → localStorage保存済み
- チャット返答時: `msg.textJa` → Message型に保存済み
- BriefingArea: `scenario.briefJa` を即表示（APIゼロ）
- ChatBubble: `msg.textJa` があれば即表示、なければ `/api/translate` にフォールバック

**5. improvements は ImprovementItem[] 型（string[] ではない）**
```typescript
// improvements を表示するとき
{imp.comment}  // ✅ 正しい
{imp}          // ❌ 間違い（オブジェクトなので文字列として表示できない）
```

---

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

## スピーキングフィードバック設計（`/api/feedback`）

セッション全体（複数ターン）をまとめて評価する。1ターンごとの評価は行わない。
**数値スコア・CEFR評価は廃止**。

### フィードバック構成

- `encouragement`: 1文。セッション全体への正直な印象。JA設定時は日本語
- `strengths`: 可変1〜3件。本当に優れている点のみ。軸ラベルなし。ユーザーの実際のセリフを「」で引用し、その言語的な特徴・理由を具体的に説明。曖昧な褒め言葉（"good job", "well done"）禁止
- `improvements`: 可変0〜2件。英語が自然・正確なら `[]`。各件は `ImprovementItem { comment, suggestedResponse }` 形式
  - `comment`: ユーザーの発言を「」で引用し、改善案 + 具体的な理由 + この場面でなぜ重要かを説明。"more natural", "sounds better" 禁止。JA設定時は日本語
  - `suggestedResponse`: その問題が発生したターンの模範回答（英語の完全文）
- `naturalExpressions`: 2〜4件。improvements で取り上げた表現をベースに選ぶ。問題がなければ `[]`
  - **難易度別レベルフィルター**：beginner=A2のみ / intermediate=B1-B2のみ / advanced=C1-C2のみ
  - `reason`: grammar / collocation / literal / set-phrase / formality / nuance
  - `natural`: **最小限の修正のみ**。問題のある単語・箇所だけ直す。文全体を構造ごと変えてはいけない
    - collocation → 問題の単語だけ自然なコロケーションに差し替える（例: "big potential" → "great potential"）
    - grammar → 文法エラーの箇所だけ修正する
  - `explanation`: なぜ元の表現が不自然か（1〜2文）。reason種別に応じた角度で説明。JA設定時は日本語
    - grammar: 具体的な文法ルールを明示（例: "look forward to は gerund が続く"）
    - collocation: 間違いペアと正しいペアを名指しで指摘（例: "big は potential とコロケーションしない。great / enormous / tremendous が正しい"）
    - literal: 日本語の元フレーズとなぜ英語で失敗するかを説明
    - set-phrase: なぜ固定表現が期待されるかを説明
    - formality: シーンとレジスターのミスマッチを説明
    - nuance: original と natural が意味・含意でどう違うかを対比
  - `chunk`: `natural` から直接抽出した学習価値のある英語表現。コロケーション・句動詞・イディオム・定型句・談話標識など型は問わない。可変部分を `~` に置換。意味のある固定語が3語以上必須。**NG（禁止）**: `It's ~` `from ~ to ~` `I ~ ~` `the ~ of ~`（文法構造のみで学習価値なし）。**OK例**: `have great potential` `run into ~ issues` `It might be worth ~ing` `Having said that, ~`
  - `chunkDetail`: 〜に何が入るか・いつ使うか・実践アドバイス（1〜2文）。JA設定時は日本語
  - `example`: chunkを使った短い英文例

### プロンプト品質改善方針（few-shot）
- LLMへの抽象ルールだけでは品質が安定しないため、プロンプト内に **理想的な出力のfew-shot例** を埋め込んでいる
- 現在の例: collocation（"big potential" → "great potential"）・grammar（"look forward to see" → "look forward to seeing"）
- 新たな不具合パターンが見つかったら、その修正例をfew-shotに追加することで汎用的に改善する方針

### 句読点ルール（重要）
- 音声入力（Groq Whisper API）のため、ユーザーの発話に句読点は存在しない
- フィードバック文中で句読点の欠如に言及してはいけない

## 音声認識（録音・書き起こし）

- **Groq Whisper API を使用**（`whisper-large-v3-turbo`）。Web Speech APIは廃止済み
- `/api/transcribe` エンドポイント：MediaRecorder で録音 → Blob → File → FormData → Groq transcription
- MIMEタイプ：`audio/webm`（対応ブラウザ）、非対応の場合は `audio/mp4`（iOS Safari等）にフォールバック
- 書き起こし中はスピナーを表示（`isTranscribing` state）

## Git ルール

- コミットメッセージは変更内容を英語で簡潔に書く
- `.env.local` はコミットしない（.gitignoreで除外済み）
- GitHub: https://github.com/jaipur1103-wq/speaq
