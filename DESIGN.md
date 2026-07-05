# window brain — Design Spec

現在のデザインを規約として固定。新しいウィジェット・機能を追加するときはこれに準拠する。

## 1. 現行プリセット（デフォルト設定）

ファイル: `design-preset.json`（IMPORT で復元可）

| トークン | 値 | 役割 |
|---|---|---|
| `dark` | `true` | ダークテーマ |
| `background` | `"time"` | 時間帯で変化するアンビエント背景 |
| `accent` | `"lavender"` | `#c6a0ff` 系。リンク・選択・強調 |
| `density` | `"regular"` | グリッドギャップ 10px、標準余白 |
| `typeface` | `"geist"` | 本文 Geist / 等幅 Geist Mono |
| `displayFont` | `"instrument"` | 装飾文字（時計など）に Instrument Serif italic |
| `weight` | `300` | 本文ウェイト Light。"薄地" の美しさを優先 |

---

## 2. レイアウト

- グリッド: **13 列 × 6 行**（PC）／ 縦スタック（< 900px）
- セル間ギャップ: 10px（density:regular）/ 6px (compact) / 14px (cozy)
- ウィジェット角丸: **18px**
- ウィジェット間最低余白: ギャップに従い、独自マージンは付けない

## 3. カラートークン

ライト/ダーク両対応。CSS 変数で参照。

```css
--accent          /* lavender #c6a0ff */
--rule            /* 罫線 — 透過 8% */
--rule-strong     /* 強調罫線 — 透過 18% */
--track           /* 入力背景・控えめなパネル */
--track-soft      /* track よりさらに薄い */
--chip            /* ボタン・タグ静止 */
--chip-hover      /* ボタンホバー */
--ink-faint       /* 補助テキスト（45%）*/
--ink-mute        /* 抑制テキスト（60%）*/
```

新しい色を導入する前に必ず既存トークンを検討する。**生の HEX をコードに直書きしない**。

## 4. タイポグラフィ

| 用途 | フォント | サイズ | ウェイト |
|---|---|---|---|
| 本文 | `var(--font-sans)` | 13px | `var(--w-base)` |
| 大見出し（時計など）| `var(--font-display)` | clamp 38–240px | 400 italic |
| ラベル・タグ・コード | `var(--font-mono)` | 9–11px / letter-spacing .12–.18em / uppercase | 400–500 |
| 数値 | `.mono` クラス（`tabular-nums`）| — | — |

ヘッダ（`.w-head`）は **常に mono / uppercase / .18em** で統一。

## 5. コンポーネント規約

### ウィジェット (`.w`)
- 必ず `<div className="w-body">` 内に `<Head>` と `<div className="w-content">` を持つ
- 編集可能なコンテンツがあれば `<Head editable />` を付ける（✎ アイコンが自動表示）
- 内部スクロール領域は `overflow:auto` + `min-height:0`、スクロールバーは細・半透明（自動適用）

### グリッド・テーブル
- 固定 px 列ではなく `minmax(0,1fr)` または `auto` を使う
- 親に `min-width:0` を必ず付ける（はみ出し防止）

### ボタン
- ナビバー・ドック内: `.dock button` 既定スタイル（mono / 透明 / hover で `chip`）
- 設定モーダル: `.s-btn`
- ピル: `.s-pill`、セグメント: `.s-seg-btn`

### モーダル
- 背景: `.picker-bd`（半透明 + blur）
- カード: `.settings` / `.picker` クラス
- ヘッダにタイトル + 小キャプション + ✕ クローズ

## 6. インタラクション

- 編集ヒント ✎ は **ホバー / フォーカス時のみ** 表示（モバイルは常時うっすら表示）
- ドラッグ: iOS 風ウィグル、衝突時は赤いハイライト
- リサイズ: 角の三角ハンドル、ホバーで表示
- トーストは画面上部中央に出して 2.4 秒で消える

## 7. 永続化キー

| キー | 内容 |
|---|---|
| `wb.layout.v2` | ウィジェット配置 |
| `wb.todos.v1` | タスク |
| `wb.notes.v1` | メモ |
| `wb.calendar.v1` | カレンダー予定（月別） |
| EDITMODE block（`index.html`）| Tweaks 値（テーマ・色・フォント等）|

エクスポート JSON (`version: "wb.export.v1"`) には上記すべてが含まれ、IMPORT で完全復元可能。

## 8. やらないこと

- ✗ 余計なフィラー文・装飾コンテンツの追加
- ✗ AI スロップ的ビジュアル（過剰グラデ、不要な絵文字、不要な統計）
- ✗ 既存トークンを無視した新色・新フォント
- ✗ デスクトップ前提の固定 px サイズ
- ✗ コンテンツの見切れ（必ず `min-width:0` / `minmax(0,*)` / `overflow:hidden` を確認）
