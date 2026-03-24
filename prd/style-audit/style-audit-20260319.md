# PRD Style Audit — 2026-03-19

概要:
- 検出: 57 個の16進カラーリテラル（ソース＋ビルド含む）、2 件の rgba ボックスシャドウ。詳細は CSV を参照。
- 対象: `prd/frontend/src/styles.css` に最も多く出現。

優先度の提案:
- 高: `prd/frontend/src/styles.css` のルートカラーボリューム（--bg/--surface/--ink 等）をトークン化して共通トークンセットを用意する。
- 中: 背景の radial-gradient 内リテラル（装飾色）はトークン化でテーマ差し替えを容易にする。
- 低: `dist` のビルド出力は手で編集せず、ソースを修正して再ビルドする。

主な検出例（抜粋）:

- `prd/frontend/src/styles.css`:
  - variables: `--bg: #f2f0ea; --surface: #fffdf7; --ink: #1f2a37; --ink-subtle: #5b6470; --line: #dad4c8; --accent: #1f8a70; --accent-soft: #d4efe7; --warn: #f59e0b; --critical: #d94841` (行:2-10)
  - radial gradients: `#fff3d6`, `#d4efe7` (行:25-26)
  - UI fragments: `color: #fff;`, `border: 1px solid #b5d6cd;`, `background: #fff;`, `background: #fee4e2; color: #9f1d1d; border: 1px solid #fbb4ae;` (複数行)
  - box-shadow: `rgba(31, 42, 55, 0.06)` と `rgba(31, 138, 112, 0.08)` (行:63,164)

提案アクション:
- `prd/frontend` のための `tokens.css`（または既存の tokens を流用）を作成し、上記ルート変数を token 値へ差し替える。
- `rgba(...)` の場合は `--<name>-rgb` 形式の RGB トークンを追加し、`rgba(var(--x-rgb), alpha)` で参照する。
- 変更後は `npm run build` して `dist` を更新し、目視で差分確認を行う。

詳細は `style-audit-20260319.csv` を参照ください。
