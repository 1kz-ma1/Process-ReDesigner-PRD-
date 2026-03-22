/**
 * AppShell
 * メインレイアウト：ツールバー / キャンバス / プロパティパネル / 検証ログ
 */

import { useMemo, useState } from "react";
import { useFlowStore } from "../hooks/useFlowStore";
import { BlockPalette } from "./BlockPalette";
import type { BlockType } from "../models/types";
import { getDefaultMetaByType } from "../utils/analysisRules";
import { TYPE_LABELS } from "../utils/typeLabels";
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
        {/* 左パレット */}
        <aside className="left-panel">
          {/* blockTypes list mirrors editor defaults */}
          <BlockPalette
            blockTypes={[
              "Input",
              "Validate",
              "Approve",
              "Handoff",
              "Transform",
              "Notify",
              "Store",
              "Review",
              "Decision",
              "Complete",
            ] as BlockType[]}
            onAdd={(type) => {
              try {
                const vp = store.current.viewport;
                const container = document.querySelector('.canvas-root') as HTMLElement | null;
                const rect = container ? container.getBoundingClientRect() : null;
                const centerX = rect ? rect.width / 2 : window.innerWidth / 2;
                const centerY = rect ? rect.height / 2 : window.innerHeight / 2;
                const worldX = -vp.x + centerX / vp.zoom;
                const worldY = -vp.y + centerY / vp.zoom;
                const label = TYPE_LABELS[type] ?? type;
                const meta = getDefaultMetaByType(type as any) ?? {};
                store.addNode('task', String(label), worldX, worldY, meta);
              } catch (err) {
                // fallback: add at origin
                store.addNode('task', String(type), 0, 0, {});
              }
            }}
          />
        </aside>

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
