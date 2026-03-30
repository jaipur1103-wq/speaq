# Speaq 要件定義書

最終更新: 2026-03-30

---

## 1. プロダクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | Speaq（スピーク） |
| ターゲット | TOEIC 600〜800点・30代ビジネスパーソン |
| 目的 | ビジネス英語の会話力を実践的に鍛えるスピーキング練習アプリ |
| 言語 | 日本語 / 英語 切り替え対応（デフォルト：日本語） |

---

## 2. コアループ

```
シナリオ設定 → 音声入力で会話 → AIフィードバック → 表現保存（Notebook）→ Quiz で定着
```

---

## 3. 機能一覧

### 3-1. シナリオ設定

- 業界・難易度（beginner / intermediate / advanced）・ペルソナスタイルを選択
- AIがビジネス英語シナリオを自動生成（英語 + 日本語タイトル・概要）
- 自由記述からシナリオを自動生成（`/api/create-from-description`）
- 手動作成も可
- シナリオ一覧からの再選択・お気に入り登録
- 初回ユーザー向けデモシナリオを自動表示

---

### 3-2. 会話（スピーキングセッション）

| 機能 | 内容 |
|---|---|
| 音声入力 | Groq Whisper API で録音 → 書き起こし |
| 相手役AI | シナリオに沿ってAIが英語で返答（1〜2文に制限）。日本語訳付き |
| テキスト入力 | 音声の代替としてキーボード入力も可 |
| 句読点補正 | 音声入力後に自動で句読点を補正 |
| 言語表示切替 | チャットバブルの日本語訳を表示/非表示 |

---

### 3-3. フィードバック

セッション全体（複数ターン）をまとめて評価。1ターンごとの評価は行わない。
数値スコア・CEFR評価は廃止。

| フィールド | 内容 |
|---|---|
| conversationSummary | セッションで話したトピック・要点の要約（1〜2文） |
| encouragement | セッション全体への印象（1文） |
| strengths | 優れている点（1〜3件）。実際のセリフを「」で引用し言語的特徴を具体的に説明 |
| improvements | 改善点（0〜2件）。文法・コロケーション・レジスター等の具体的な根拠必須 |
| naturalExpressions | ネイティブの言い回し（2〜4件）。ユーザーの発言を起点に一段上のプロ表現を提示 |
| wordCount | セッション全体の総単語数 |
| insightMode | improvements が空のとき true（高品質セッションの場合） |

#### improvements の構造

```typescript
ImprovementItem {
  errorEvidence: string;    // 具体的な根拠（文法ルール・コロケーション等）
  originalPhrase: string;   // 問題が発生した節・文（8〜15語のコンテキスト）
  improvedPhrase: string;   // 修正後のフレーズ（短く・フレーズレベル）
  comment: string;          // 引用 + 理由 + なぜ重要か（JA設定時は日本語）
  suggestedResponse: string; // そのターンの模範回答（英語全文）
}
```

#### naturalExpressions のコンセプト

- **抽出源**: ユーザーの発言
- **目的**: ユーザーが言ったことを起点に「ネイティブプロならどう言うか」を提示（誤り修正ではなくアップグレード）
- **レベル制御**: beginner / intermediate / advanced 別のレベルガイド + few-shot 例でLLMを制御
- **コードサイドフィルター**: A1/A2 chunk ブラックリスト + trivial upgrade 除外で品質保証
- **ラベル**: 「ネイティブの言い回し」（EN: "Native expressions"）

---

### 3-4. Notebook（表現保存）

- フィードバックの naturalExpressions から表現を保存
- chunk・chunkDetail・example を一覧表示
- 保存済み表現の削除
- **例文展開**：「例文をもっと見る」で3件の例文（シーン別・和訳付き）を生成・表示。初回のみAPI呼び出し、以降はlocalStorageキャッシュ
- **ミニ会話練習**：「話してみる」でフレーズを使った日→英1文翻訳練習。AI判定（使えたか）＋模範回答を表示

---

### 3-5. Quiz（定着）

- Notebook に保存した表現から出題
- 音声入力（Groq Whisper）で回答可能
- 正解・不正解の記録

---

### 3-6. セッション履歴

- 過去のセッション記録（日付・シナリオ・ターン数・フィードバック内容）
- 7日間アクティビティ表示・ストリーク表示
- カード展開で詳細（encouragement・strengths・improvements）を確認
- localStorage に保存

---

## 4. 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16.2.0 + TypeScript（App Router） |
| スタイリング | インラインCSS |
| データ保存 | localStorage（認証なし） |
| AI（会話・フィードバック・シナリオ生成） | Groq（llama-3.3-70b-versatile） |
| AI（音声認識） | Groq Whisper（whisper-large-v3-turbo） |
| AI（翻訳・フォールバック） | Groq（translate APIのみ） |
| ホスティング | Vercel |
| バージョン管理 | GitHub（https://github.com/jaipur1103-wq/speaq） |

---

## 5. 画面構成

```
/               → ホーム（シナリオ一覧・設定・FAB）
/practice/[id]  → 会話セッション + フィードバック
/notebook       → 保存済み表現一覧（例文展開・ミニ会話練習）
/mini-practice  → ミニ会話練習ページ（Notebookから遷移）
/quiz           → クイズ
/history        → セッション履歴
/create         → シナリオ手動作成
/guide          → 使い方ガイド
```

---

## 6. フェーズ分け

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1（MVP） | シナリオ生成・音声入力・AI会話・フィードバック・Notebook・Quiz・履歴 | ✅ 完了 |
| Phase 2 | フィードバック品質向上・UI完成度向上・ストリーク・継続動機設計 | ✅ 完了 |
| Phase 2b | 学習体験強化（フレーズ例文展開・ミニ会話練習・各種UI改善） | ✅ 完了 |
| Phase 3 | 収益化後に記載 | 未着手 |

---

## 7. 将来検討

- App Store / Google Play リリース（Capacitor利用予定）
- 収益化（サブスクリプション等）
- 認証・クラウド保存
