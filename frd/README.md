# Flow ReDesigner (FRD)

業務プロセスを「強化」ではなく「再設計」するための、フロント完結型MVPです。

## Value -> Experience -> Technology

- Value: 業務を再設計し、現状の限界を超える最適化を可能にする。
- Experience: ブロック配置/接続/編集 -> 解析 -> 提案 -> ワンクリック適用を直感的に実行できる。
- Technology: React + React Flow + Zustand + IndexedDB(idb-keyval)、解析はルールベース(AIなし)。

## MVP機能

- ブロック10種（Input, Validate, Approve, Handoff, Transform, Notify, Store, Review, Decision, Complete）
- 配置/移動/削除、接続作成、右ペイン属性編集
- 解析8ルール（承認過多/重複入力/手戻り/通知スパム/引き継ぎ多段/SLA超過/権限不整合/自動化候補）
- 提案一覧表示と半自動適用
- JSON入出力（`.frd.json`）、Iteration保存

## ファイルツリー（最小）

```text
frd/
  src/
    components/
    models/
    services/
    store/
    utils/
  tests/e2e/
  .github/workflows/ci.yml
```

## 起動

```bash
npm install
npm run dev
```

## 検証

```bash
npm run lint
npm run build
```

## E2E雛形

```bash
npx playwright install
npm run test:e2e
```

## データ仕様

- ルート: `{ schemaVersion, flow, iterations }`
- 保存先: IndexedDB (`frd:flows:primary`)
- export/import: `.frd.json`
