FRD → kintone ミドルウェアサンプル

概要
- `.frd.json` を受け取り、シンプルなマッピングで kintone にレコードを作成する最小サンプルです。

セットアップ
1. ディレクトリで依存をインストール:

```bash
cd frd/integration/middleware-sample
npm install
```

2. 環境変数を設定（API トークン方式）:

```bash
export KINTONE_BASE_URL=https://your-domain.cybozu.com
export KINTONE_API_TOKEN=your_api_token
export KINTONE_APP_FLOWS=123
export KINTONE_APP_BLOCKS=124
export KINTONE_APP_EDGES=125
export KINTONE_APP_ITERATIONS=126
```

3. サーバ起動（開発）:

```bash
npm run start
```

使い方
- `POST /import` に `multipart/form-data` で `file` を添付して `.frd.json` を送信します。
- `?dryRun=true` を付けると kintone へは送らずに変換と検証のみ行います。
- `GET /mapping` で作成されたローカルID→kintoneレコードIDのマッピングを確認できます。

OAuth / ユーザー認可
- 本サンプルは API トークン方式をデフォルトで使用しますが、Bearer トークン（OAuth 2.0）もサポートします。
- `Authorization: Bearer <access_token>` ヘッダを付けて `POST /import` を呼ぶと、そのトークンが kintone リクエストに使用されます。

手動でトークンを登録する方法
- `POST /auth/token` に JSON ボディ `{ "userId": "alice", "accessToken": "...", "refreshToken": "...", "expiresAt": 123456789 }` を送ると、サーバー内に保存されます。
- `GET /auth/token?userId=alice` で保存済みトークンを確認できます。

OAuth コード交換（参考）
- `POST /auth/exchange` に `{ "userId": "alice", "code": "<auth_code>", "tokenUrl": "...", "clientId": "...", "clientSecret": "...", "redirectUri": "..." }` を送ると、指定した `tokenUrl` へコード交換を行い、取得した `access_token` を保存します。

注意: 実運用ではリダイレクトフロー、CSRF 対策、リフレッシュトークン更新ロジック、機密情報の安全な保管（Key Vault 等）を必ず実装してください。

自動リフレッシュ
- `POST /import?userId=<userId>` のように `userId` を指定すると、サーバーは `data/mapping.json` 内の保存済みトークンを参照します。
- トークンが期限切れ、または期限切迫の場合は自動で `/auth/refresh`（内部）を呼んで更新し、新しい `access_token` を使用して kintone へアクセスします。
- 手動で更新を行いたい場合は `POST /auth/refresh` に `{ "userId": "alice" }` を送信してください。

注意点
- 本サンプルは最小実装です。実運用では認証の厳格化、レート制御、堅牢なエラーハンドリング、トランザクション管理を実装してください。

次の改善案
- OAuth 対応（ユーザー単位の操作）
- 差分同期（既存レコードの更新）
- 失敗時のロールバック／再試行ポリシーの詳細化
