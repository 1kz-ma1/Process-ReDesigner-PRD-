# スタイル監査レポート — 2026-03-19

## 概要
- 目的: ハードコーディングされた色（hex, rgba/hsla）、数値の半径/間隔、JSXの inline `style` を抽出し、デザイントークン化の優先度を決める。
- 範囲: ソース（`frd/`, `rdf/`）を優先。ビルド成果物（snapshots/dist）は検証用に参照。

## 主要検出項目（優先度高 → 低）
- `frd/src/components/FlowCanvas.tsx` — JSX inline style（すぐ置換可能）
  - 例: [frd/src/components/FlowCanvas.tsx](frd/src/components/FlowCanvas.tsx#L19)
    - `style: { borderRadius: 8, border: "1px solid #d5d5d5", padding: 8 }`
- `frd/src/styles/tokens.css` — トークン定義あり（部分採用済み）
  - 例: [frd/src/styles/tokens.css](frd/src/styles/tokens.css#L25)
    - `--shadow-xxs: 0 1px 2px rgba(20,30,55,.06)`
- `frd/src/styles.css` — ソース側にまだ多数の raw 色・数値あり
  - 例: [frd/src/styles.css](frd/src/styles.css#L2)
- `rdf/frontend/src/styles.css` — グローバルに多数の hex / rgba（box-shadow 等）
  - 例: [rdf/frontend/src/styles.css](rdf/frontend/src/styles.css#L63)

## 検出カテゴリ別サマリ
- hex（`#...`）: ソース内に複数（`frd/src/styles.css`, `rdf/frontend/src/styles.css` 等）。ビルド成果物にも多数含まれる。
- rgba/hsla: トークン（shadow）に使われているものあり。その他は直接指定（例: box-shadow）。
- border-radius / spacing（数値）: CSS と JSX inline の両方で発見。例: `border-radius: 8px` / `borderRadius: 8`。
- JSX inline `style`: 主なソース検出は `frd/src/components/FlowCanvas.tsx`（ライブラリバンドル内にも多数あり、だが不可変）

## 優先対応案（推奨順）
1. ソースの JSX inline をトークン/クラス化（例: `FlowCanvas.tsx` の inline → クラス + CSS 変数）。
2. `frd/src/styles.css` と `rdf/frontend/src/styles.css` の優先色をトークンへマッピング（`--ui-primary` 等）。
3. box-shadow の rgba は既存トークンに統合（`--shadow-*`）
4. ビルド成果物（snapshots/dist）は最終検証のみ。ライブラリ内部（React Flow）のデフォルト値は上書き or テーマ設定を検討。

## 次アクション候補（私から実行可）
- 1) `FlowCanvas.tsx` の inline style をクラス化してトークン参照に差し替えるパッチを作成。
- 2) `frd/src/styles.css` 内の上位 10 個のハードコード色をトークンへ置換する PR を作成。
- 3) 生成物（snapshots/dist）を除外した完全なCSV出力（ファイル, 行, スニペット）を生成。

---

ファイル生成: `frd/style-audit/style-audit-20260319.md`

必要なら上記の次アクションのどれを先に実行するか指示ください。
