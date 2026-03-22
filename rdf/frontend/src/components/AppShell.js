import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AppShell
 * メインレイアウト：ツールバー / キャンバス / プロパティパネル / 検証ログ
 */
import { useMemo, useState } from "react";
import { useFlowStore } from "../hooks/useFlowStore";
import { validateFlow } from "../utils/validator";
import { autoLayout } from "../utils/layout";
import { injectDesignTokens } from "../utils/designTokens";
import Toolbar from "./Toolbar";
import CanvasRoot from "./CanvasRoot";
import PropertyPanel from "./PropertyPanel";
import ValidationPanel from "./ValidationPanel";
import "../styles/app.css";
export default function AppShell() {
    // デザイントークン inject
    useMemo(() => {
        injectDesignTokens();
    }, []);
    const store = useFlowStore();
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [showProperties, setShowProperties] = useState(true);
    // バリデーション実行
    const validation = useMemo(() => {
        return validateFlow(store.current);
    }, [store.current]);
    // 選択ノード取得
    const selectedNode = useMemo(() => {
        if (!selectedNodeId)
            return null;
        return store.current.nodes.find((n) => n.id === selectedNodeId);
    }, [selectedNodeId, store.current.nodes]);
    return (_jsxs("div", { className: "app-shell", children: [_jsx(Toolbar, { mode: store.current.mode, onSetMode: store.setMode, onValidate: () => {
                    store.setValidation(validation);
                }, onUndo: store.undo, onRedo: store.redo, canUndo: store.canUndo, canRedo: store.canRedo, onAutoLayout: () => {
                    const newDoc = autoLayout(store.current);
                    store.load(newDoc);
                }, onToggleProperties: () => setShowProperties(!showProperties) }), _jsxs("div", { className: "app-main", children: [_jsx(CanvasRoot, { doc: store.current, selectedNodeId: selectedNodeId, onSelectNode: setSelectedNodeId, onViewportChange: (x, y, zoom) => store.setViewport(x, y, zoom), onAddNode: (type, name, x, y) => store.addNode(type, name, x, y), onUpdateNode: (id, patch) => store.updateNode(id, patch), onDeleteNode: store.deleteNode, onAddEdge: (source, target, kind, label) => store.addEdge(source, target, kind, label), onUpdateEdge: (id, patch) => store.updateEdge(id, patch), onDeleteEdge: store.deleteEdge }), showProperties && (_jsx(PropertyPanel, { node: selectedNode ?? null, onUpdateNode: (patch) => {
                            if (selectedNodeId) {
                                store.updateNode(selectedNodeId, patch);
                            }
                        } }))] }), _jsx(ValidationPanel, { validation: validation, onSelectMessage: (msg) => {
                    if (msg.nodeId) {
                        setSelectedNodeId(msg.nodeId);
                    }
                } })] }));
}
