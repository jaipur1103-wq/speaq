# Speaq — API 設計

最終更新: 2026-03-30

---

## エンドポイント一覧

| エンドポイント | 用途 | AI | 返却値 |
|---|---|---|---|
| `POST /api/generate-scenario` | シナリオ生成 | Groq（2ステップ：生成→翻訳） | `{ ...scenarioFields, titleJa, briefJa, openerJa, difficulty, industry, personaStyle }` |
| `POST /api/create-from-description` | 自由記述からシナリオ生成 | Groq（2ステップ：生成→翻訳） | `{ ...scenarioFields, titleJa, briefJa, openerJa }` |
| `POST /api/counterpart-reply` | 相手役AI返答 | Groq（2ステップ：返答→翻訳） | `{ reply, replyJa }` |
| `POST /api/feedback` | セッション評価 | Groq（2並列呼び出し） | 下記参照 |
| `POST /api/translate` | テキスト翻訳（フォールバックのみ） | Groq | `{ translations: string[] }` |
| `POST /api/punctuate` | 音声入力後の句読点補正 | Groq | `{ corrected: string }` |
| `POST /api/transcribe` | 音声書き起こし | Groq Whisper | `{ text: string }` |
| `POST /api/hint` | 会話ヒント生成（3段階） | Groq | `{ keywords, starter, full }` |
| `POST /api/phrase-examples` | フレーズ例文生成（3件・和訳付き） | Groq | `{ examples: PhraseExample[] }` |
| `POST /api/mini-conversation-question` | ミニ会話用・英訳練習文生成（日本語1文） | Groq | `{ jaPrompt: string }` |
| `POST /api/mini-conversation-evaluate` | ミニ会話の発話評価 | Groq | `{ used, reason?, modelAnswer }` |

---

## /api/feedback 詳細

### リクエスト

```typescript
{
  scenario: {
    title: string;
    brief: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    personaName: string;
    personaRole: string;
  };
  turns: { userMessage: string; counterpartMessage: string }[];
  language: "ja" | "en";
}
```

### レスポンス

```typescript
{
  conversationSummary: string;       // セッションの要約（1〜2文）
  encouragement: string;             // 全体への印象（1文）
  strengths: string[];               // 優れた点（1〜3件）
  improvements: ImprovementItem[];   // 改善点（0〜2件）
  naturalExpressions: NaturalExpression[]; // ネイティブの言い回し（2〜4件）
  wordCount: number;                 // 総単語数
  insightMode: boolean;              // improvements が空のとき true
}
```

### ImprovementItem

```typescript
{
  errorEvidence: string;    // 根拠（文法ルール・コロケーション・レジスター等）
  originalPhrase: string;   // 問題が含まれる節・文（8〜15語のコンテキスト）
  improvedPhrase: string;   // 修正後フレーズ（フレーズレベル、短く）
  comment: string;          // 説明（JA設定時は日本語）
  suggestedResponse: string; // そのターンの模範回答（英語全文）
}
```

### NaturalExpression

```typescript
{
  original: string;      // ユーザーが使った表現
  natural: string;       // ネイティブプロのアップグレード表現
  reason: string;        // grammar | collocation | literal | set-phrase | formality | nuance
  explanation: string;   // 具体的な理由（JA設定時は日本語）
  chunk: string;         // 学習用パターン（可変部分を ~ に置換）
  chunkDetail: string;   // ~ の使い方・実践アドバイス（JA設定時は日本語）
  example: string;       // chunk を使った例文（英語）
}
```

### 内部実装

- **2並列呼び出し**: mainPrompt（encouragement/strengths/improvements）と exprPrompt（naturalExpressions）を同時実行
- **レベル別制御**: LEVEL_GUIDES + FEW_SHOT_EXAMPLES（beginner/intermediate/advanced）でLLMを制御
- **コードサイドフィルター**:
  - `isGenuineEvidence()`: 曖昧な improvements を除外
  - `isValidChunk()`: chunk の構文チェック
  - `BASIC_CHUNK_BLACKLIST`: A1/A2レベルの chunk を強制除外
  - `isUpgradeWorthwhile()`: trivial な同義語入れ替えを除外

---

## 翻訳の設計（重要）

チャット翻訳はゼロAPI呼び出しを原則とする。

| 対象 | 方法 |
|---|---|
| シナリオ titleJa / briefJa / openerJa | 生成時に別呼び出しで事前生成・localStorage保存 |
| 相手役AIの返答 | counterpart-reply API が replyJa を同時返却・msg.textJa に保存 |
| 古いチャットバブル | /api/translate にフォールバック（最終手段のみ） |

---

## /api/phrase-examples 詳細

### リクエスト
```typescript
{ chunk: string; chunkDetail?: string; reason?: string; lang: "ja" | "en" }
```

### レスポンス
```typescript
{ examples: { scene: string; sentence: string; sentenceJa: string }[] }
```

### 実装メモ
- 結果は localStorage の `SavedExpression.examples` にキャッシュ。2回目以降はAPI不要
- `sentenceJa` がないキャッシュは自動的に再取得する（`examples.every(e => !e.sentenceJa)` で判定）

---

## /api/mini-conversation-question 詳細

### リクエスト
```typescript
{ chunk: string; chunkDetail?: string; lang: "ja" | "en" }
```

### レスポンス
```typescript
{ jaPrompt: string }  // 英訳練習用の日本語1文
```

### 実装メモ
- ユーザーがノートブックの「話してみる」を押すたびに呼び出し（キャッシュなし）
- chunk を自然に使える日本語1文を生成する
- 接続詞なし・15文字以内・シンプルな1文が原則

---

## /api/mini-conversation-evaluate 詳細

### リクエスト
```typescript
{ chunk: string; question: string; userResponse: string; lang: "ja" | "en" }
```

### レスポンス
```typescript
{
  used: boolean;        // chunk を正しく使えたか
  reason?: string;      // used=false のとき：不使用 or 文法誤りの説明（JA設定時は日本語）
  modelAnswer: string;  // 模範回答（英語）
}
```

### 判定ルール
- `used = true`：chunk のコアワードが含まれ、かつ文法が正しい
- `used = false`：コアワードが含まれない（別の表現を使った）or 文法エラーあり
- chunk の `~` は任意の語として扱う（例：`run into ~ issues` → run into + any word + issues）

---

## 制約・禁止事項

- `fb.scores` は廃止。フィードバック判定は `fb.encouragement` を使う
- Gemini API はフィードバック用途禁止（日本IPからの無料枠 quota=0）
- 相手役AIの返答は 1〜2文に制限（intermediate・advanced）
