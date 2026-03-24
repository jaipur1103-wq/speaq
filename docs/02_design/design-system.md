# Speaq — デザインシステム

## カラー（CSS変数）

```css
--primary: #4A90E2;       /* メインアクション */
--bg: #F8F9FA;            /* 背景 */
--card-bg: #FFFFFF;       /* カード背景 */
--text: #333333;          /* 標準テキスト */
--text-muted: #888888;    /* 淡いテキスト */
--border: #E0E0E0;        /* ボーダー */
--success: #4CAF50;       /* 成功・正解 */
--warning: #FF9800;       /* 注意 */
--error: #F44336;         /* エラー */
```

## タイポグラフィ

- 基本フォント: システムフォント（sans-serif）
- 基本サイズ: 14px
- 見出し: 20px / 16px
- 小テキスト: 12px

## レイアウト

```typescript
// 全コンテナ共通
width: "100%"
maxWidth: 640
margin: "0 auto"
padding: "0 16px"
boxSizing: "border-box"

// カード共通
width: "100%"
boxSizing: "border-box"
borderRadius: 12
backgroundColor: "#fff"
padding: 16
```

## スペーシング

| 用途 | 値 |
|---|---|
| カード間隔 | 12px |
| セクション間隔 | 24px |
| 内側パディング | 16px |
| ボーダー半径（カード） | 12px |
| ボーダー半径（ボタン） | 8px |
