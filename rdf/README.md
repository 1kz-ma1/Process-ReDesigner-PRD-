# Process ReDesigner (PRD)

業務フローをブロック単位で再設計し、ルールベース解析で改善提案まで行うMVP骨組みです。

## 構成

- `frontend`: React + Vite + TypeScript
- `backend`: Express + TypeScript (in-memory store)

## MVPで実装済み

- ブロック追加、選択、更新、削除
- ブロック接続（有向エッジ）
- 解析実行（ルールベース）
  - 承認過多
  - 重複入力
  - 手戻りリスク
  - 通知スパム
  - 引き継ぎボトルネック
  - SLA超過
  - 権限不整合
  - 自動化候補
- 提案のワンクリック適用
- イテレーション保存・取得
- JSON出力/入力（テンプレ流用）

## ディレクトリ

```
rdf
  frontend
    src
      components
      hooks
      models
      services
      utils
  backend
    src
      routes
      services
      models
      data
```

## 起動方法

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

既定: `http://localhost:4000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

既定: `http://localhost:5173`

## API (最小)

- `POST /flows`
- `GET /flows/:id`
- `PATCH /flows/:id`
- `POST /flows/:id/blocks`
- `PATCH /blocks/:id`
- `DELETE /blocks/:id`
- `POST /flows/:id/edges`
- `DELETE /edges/:id`
- `POST /flows/:id/analyze`
- `POST /suggestions/:id/apply`
- `POST /flows/:id/iterations`
- `GET /flows/:id/iterations`

## 次の拡張候補

- Canvasを本格D&D (React Flowなど)
- Iteration比較UI
- DB永続化 (PostgreSQL + ORM)
- 認可/監査ログ
- 解析ルールの重み付けと説明可能性向上
