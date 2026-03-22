/**
 * MiniMenu
 * フローティングメニュー（ノード右クリック/ホバーで表示）
 * 7つのアクション：接続、分岐、ループ、複製、詳細編集、削除、位置自動反転
 */

import { getLabel } from "../utils/i18n";

export interface MiniMenuPosition {
  x: number;
  y: number;
}

interface MiniMenuProps {
  position: MiniMenuPosition;
  nodeId: string;
  /** 接続モード開始 */
  onConnect: () => void;
  /** condition ノード挿入 + Yes/No エッジ */
  onBranch: () => void;
  /** 祖先候補ハイライト + ループ接続 */
  onLoop: () => void;
  /** ノード + meta をcopy（位置オフセット） */
  onDuplicate: () => void;
  /** PropertyPanel フォーカス */
  onEdit: () => void;
  /** 確認ダイアログ + 削除 */
  onDelete: () => void;
  /** 画面外はみ出し時の位置自動反転 */
  onFlip: () => void;
}

export default function MiniMenu({
  position,
  nodeId,
  onConnect,
  onBranch,
  onLoop,
  onDuplicate,
  onEdit,
  onDelete,
  onFlip,
}: MiniMenuProps) {
  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return (
    <div className="mini-menu" style={style} data-node-id={nodeId}>
      <button
        className="mini-menu-item"
        title={getLabel("connect")}
        onClick={(e) => {
          e.stopPropagation();
          onConnect();
        }}
      >
        {getLabel("connect")}
      </button>

      <button
        className="mini-menu-item"
        title={getLabel("branch")}
        onClick={(e) => {
          e.stopPropagation();
          onBranch();
        }}
      >
        {getLabel("branch")}
      </button>

      <button
        className="mini-menu-item"
        title={getLabel("loop")}
        onClick={(e) => {
          e.stopPropagation();
          onLoop();
        }}
      >
        {getLabel("loop")}
      </button>

      <button
        className="mini-menu-item"
        title={getLabel("duplicate")}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
      >
        {getLabel("duplicate")}
      </button>

      <button
        className="mini-menu-item"
        title={getLabel("edit")}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {getLabel("edit")}
      </button>

      <button
        className="mini-menu-item danger"
        title={getLabel("delete")}
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(getLabel("confirm_delete_block"))) {
            onDelete();
          }
        }}
      >
        {getLabel("delete")}
      </button>

      <button
        className="mini-menu-item"
        title={getLabel("flip_position")}
        onClick={(e) => {
          e.stopPropagation();
          onFlip();
        }}
      >
        {getLabel("flip_position")}
      </button>
    </div>
  );
}
