import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MiniMenu
 * フローティングメニュー（ノード右クリック/ホバーで表示）
 * 7つのアクション：接続、分岐、ループ、複製、詳細編集、削除、位置自動反転
 */
import { getLabel } from "../utils/i18n";
export default function MiniMenu({ position, nodeId, onConnect, onBranch, onLoop, onDuplicate, onEdit, onDelete, onFlip, }) {
    const style = {
        left: `${position.x}px`,
        top: `${position.y}px`,
    };
    return (_jsxs("div", { className: "mini-menu", style: style, "data-node-id": nodeId, children: [_jsx("button", { className: "mini-menu-item", title: getLabel("connect"), onClick: (e) => {
                    e.stopPropagation();
                    onConnect();
                }, children: getLabel("connect") }), _jsx("button", { className: "mini-menu-item", title: getLabel("branch"), onClick: (e) => {
                    e.stopPropagation();
                    onBranch();
                }, children: getLabel("branch") }), _jsx("button", { className: "mini-menu-item", title: getLabel("loop"), onClick: (e) => {
                    e.stopPropagation();
                    onLoop();
                }, children: getLabel("loop") }), _jsx("button", { className: "mini-menu-item", title: getLabel("duplicate"), onClick: (e) => {
                    e.stopPropagation();
                    onDuplicate();
                }, children: getLabel("duplicate") }), _jsx("button", { className: "mini-menu-item", title: getLabel("edit"), onClick: (e) => {
                    e.stopPropagation();
                    onEdit();
                }, children: getLabel("edit") }), _jsx("button", { className: "mini-menu-item danger", title: getLabel("delete"), onClick: (e) => {
                    e.stopPropagation();
                    if (window.confirm(getLabel("confirm_delete_block"))) {
                        onDelete();
                    }
                }, children: getLabel("delete") }), _jsx("button", { className: "mini-menu-item", title: getLabel("flip_position"), onClick: (e) => {
                    e.stopPropagation();
                    onFlip();
                }, children: getLabel("flip_position") })] }));
}
