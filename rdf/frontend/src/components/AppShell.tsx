/**
 * AppShell
 * メインレイアウト：ツールバー / キャンバス / プロパティパネル / 検証ログ
 */

import { useMemo, useState } from "react";
import { useFlowStore } from "../hooks/useFlowStore";
import { validateFlow } from "../utils/validator";
import { autoLayout } from "../utils/layout";
import { injectDesignTokens } from "../utils/designTokens";
import { getLabel } from "../utils/i18n";
import type { NodeId, NodeData } from "../models/types";
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
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [showProperties, setShowProperties] = useState(true);

  // バリデーション実行
  const validation = useMemo(() => {
    return validateFlow(store.current);
  }, [store.current]);

  // 選択ノード取得
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return store.current.nodes.find((n) => n.id === selectedNodeId);
  }, [selectedNodeId, store.current.nodes]);

  return (
    <div className="app-shell">
      {/* ツールバー */}
      <Toolbar
        mode={store.current.mode}
        onSetMode={store.setMode}
        onValidate={() => {
          store.setValidation(validation);
        }}
        onUndo={store.undo}
        onRedo={store.redo}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onAutoLayout={() => {
          const newDoc = autoLayout(store.current);
          store.load(newDoc);
        }}
        onToggleProperties={() => setShowProperties(!showProperties)}
      />

      {/* メインレイアウト */}
      <div className="app-main">
        {/* キャンバス */}
        <CanvasRoot
          doc={store.current}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onViewportChange={(x: number, y: number, zoom: number) => store.setViewport(x, y, zoom)}
          onAddNode={(type: "task" | "condition", name: string, x: number, y: number) => store.addNode(type, name, x, y)}
          onUpdateNode={(id: string, patch: Partial<NodeData>) => store.updateNode(id, patch)}
          onDeleteNode={store.deleteNode}
          onAddEdge={(source: string, target: string, kind: "normal" | "condition" | "loop", label?: string) => store.addEdge(source, target, kind, label)}
          onUpdateEdge={(id: string, patch: any) => store.updateEdge(id, patch)}
          onDeleteEdge={store.deleteEdge}
        />

        {/* プロパティパネル（右側・折りたたみ可） */}
        {showProperties && (
          <PropertyPanel
            node={selectedNode ?? null}
            onUpdateNode={(patch) => {
              if (selectedNodeId) {
                store.updateNode(selectedNodeId, patch);
              }
            }}
          />
        )}
      </div>

      {/* 検証ログ（下部） */}
      <ValidationPanel
        validation={validation}
        onSelectMessage={(msg: any) => {
          if (msg.nodeId) {
            setSelectedNodeId(msg.nodeId);
          }
        }}
      />
    </div>
  );
}
