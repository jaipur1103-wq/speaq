# Speaq — API 設計

最終更新: 2026-03-28

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

## 制約・禁止事項

- `fb.scores` は廃止。フィードバック判定は `fb.encouragement` を使う
- Gemini API はフィードバック用途禁止（日本IPからの無料枠 quota=0）
- 相手役AIの返答は 1〜2文に制限（intermediate・advanced）
