kintone 連携メモ

目的
- FRD の `.frd.json` を kintone に移行して運用できるようにするためのマッピングと手順。

推奨アプリ構成
- FlowsApp: Flow 単位のメタ（flow_id, Title, description, version, targetSLAmin）
- BlocksApp: 各ブロックを1レコードで保持（block_id, type, name, x, y, meta）
- EdgesApp: 接続情報（edge_id, from, to, label）
- IterationsApp: イテレーション履歴（iteration_id, createdAt, note, snapshot_flow_id）

移行手順（概要）
1. FRD から `exportJson()` で `.frd.json` を出力
2. ミドルウェア（Node.js）へアップロード or kintone 用変換スクリプトで CSV 化
3. kintone REST API を使い、FlowsApp に Flow を作成（flow_id を保存）
4. BlocksApp / EdgesApp に対して、Flow の flow_id を参照キーとしてレコードを作成
5. IterationsApp に Iteration 情報を保存
6. 必要に応じて kintone 上でビュー/プロセス管理を設定

運用オプション
- UI を埋め込む: 現行 FRD を iframe で kintone カスタムビューに埋め、保存は kintone API 経由にする（最短ローンチ）
- ネイティブ移行: フロントで生成した JSON を完全に kintone フィールドに展開し、kintone のカスタムJSで解析結果を表示

次の実作業案（私が進めます）
- `frd/integration/middleware-sample/` に Node.js サンプルを作成（APIトークン方式で `.frd.json` を受け、kintone へ登録）
- その後、認証部分・エラーハンドリング・レート制御のテンプレを追加します

必要なら今すぐミドルウェアサンプルを作成します。続けて良いですか？
