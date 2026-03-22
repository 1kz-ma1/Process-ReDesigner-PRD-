/**
 * i18n - 日本語ラベル辞書
 * 初期値は日本語。将来的に多言語対応可能な構造
 */

export const labels = {
  // モード
  mode_roadmap: "ロードマップ",
  mode_free: "自由配置",
  
  // ツールバーアクション
  add_block: "ブロック追加",
  validate: "検証",
  undo: "元に戻す",
  redo: "やり直す",
  zoom_in: "拡大",
  zoom_out: "縮小",
  zoom_reset: "ズーム リセット",
  toggle_properties: "プロパティ表示",
  auto_layout: "自動整列",
  
  // 小メニューアクション
  connect: "接続",
  branch: "分岐",
  loop: "ループ",
  duplicate: "複製",
  edit: "詳細編集",
  delete: "削除",
  flip_position: "位置反転",
  
  // ブロック・エッジ関連
  task: "タスク",
  condition_node: "条件分岐",
  yes: "Yes",
  no: "No",
  
  // プロパティパネル
  properties: "プロパティ",
  block_name: "ブロック名",
  position: "位置",
  x_coordinate: "X座標",
  y_coordinate: "Y座標",
  meta_json: "詳細情報 (JSON)",
  save: "保存",
  
  // バリデーション・メッセージ
  validation_results: "検証結果",
  all_valid: "すべてのチェックが正常です",
  no_messages: "メッセージはありません",
  no_errors: "エラーはありません",
  error_reference_integrity: "参照整合エラー：存在しないノードを指しています",
  error_cycle_detected: "サイクル検知：ループ以外のサイクルが存在します",
  error_condition_edges: "分岐ノードには外向きエッジが2本必要です",
  error_json_parse: "meta(JSON) の構文エラーです",
  warning_isolated_node: "接続されていないブロックがあります",
  warning_reverse_flow: "ロードマップで列の逆流があります",
  
  // ダイアログ・確認
  confirm_delete: "本当に削除しますか？この操作は Undo で復元できます。",
  confirm_delete_block: "このブロックを削除してもよろしいですか？",
  create_new_block: "新規ブロック作成",
  new_block_name: "ブロック名を入力してください",
  
  // その他
  tooling_bar: "ツールバー",
  canvas: "キャンバス",
  validation_log: "検証ログ",
} as const;

/** ラベルキー型（型安全性のため） */
export type LabelKey = keyof typeof labels;

/**
 * ラベルを取得（存在しないキーはそのキー自体を返す）
 */
export function getLabel(key: LabelKey): string {
  return labels[key] ?? (key as string);
}
