/**
 * CanvasRoot
 * SVG キャンバス：ズーム/パン対応、ノード・エッジ描画、小メニュー
 */

import { useRef, useState, useCallback, useMemo } from "react";
import type { FlowDoc, NodeId, EdgeId, NodeData, Position } from "../models/types";
import { designTokens } from "../utils/designTokens";
import NodeView from "./NodeView";
import EdgeView from "./EdgeView";
import MiniMenu from "./MiniMenu";
import "../styles/canvas.css";

interface CanvasRootProps {
  doc: FlowDoc;
  selectedNodeId: NodeId | null;
  onSelectNode: (id: NodeId) => void;
  onViewportChange: (x: number, y: number, zoom: number) => void;
  onAddNode: (type: "task" | "condition", name: string, x: number, y: number, meta?: Record<string, unknown>) => NodeId;
  onUpdateNode: (id: NodeId, patch: Partial<NodeData>) => void;
  onDeleteNode: (id: NodeId) => void;
  onAddEdge: (source: NodeId, target: NodeId, kind: "normal" | "condition" | "loop", label?: string) => void;
  onUpdateEdge: (id: EdgeId, patch: any) => void;
  onDeleteEdge: (id: EdgeId) => void;
}

export default function CanvasRoot({
  doc,
  selectedNodeId,
  onSelectNode,
  onViewportChange,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
}: CanvasRootProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [connectMode, setConnectMode] = useState<NodeId | null>(null); // 接続モード中の送信元ノード
  const [loopMode, setLoopMode] = useState<NodeId | null>(null); // ループ接続モード中の送信元ノード
  const [miniMenuPos, setMiniMenuPos] = useState<Position | null>(null); // 小メニューの位置
  const [miniMenuNodeId, setMiniMenuNodeId] = useState<NodeId | null>(null); // 小メニューの対象ノード

  // ビューポート状態（doc から読む）
  const viewport = doc.viewport;

  /** ズーム */
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(
        designTokens.zoomMin,
        Math.min(designTokens.zoomMax, viewport.zoom + delta * designTokens.zoomStep)
      );

      onViewportChange(viewport.x, viewport.y, newZoom);
    },
    [viewport, onViewportChange]
  );

  /** パン（ドラッグ） */
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 2 && e.button !== 1) return; // 右ボタンまたは中ボタン
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging || !dragStart) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      onViewportChange(viewport.x + dx / viewport.zoom, viewport.y + dy / viewport.zoom, viewport.zoom);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart, viewport, onViewportChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const getWorldPoint = useCallback(
    (clientX: number, clientY: number): Position => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }

      const sx = (clientX - rect.left) / viewport.zoom;
      const sy = (clientY - rect.top) / viewport.zoom;

      return {
        x: sx - viewport.x,
        y: sy - viewport.y,
      };
    },
    [viewport.x, viewport.y, viewport.zoom]
  );

  const parentCandidates = useMemo(() => {
    if (!loopMode) {
      return new Set<NodeId>();
    }
    const candidates = new Set<NodeId>();
    const queue: NodeId[] = [loopMode];
    const visited = new Set<NodeId>();

    while (queue.length > 0) {
      const target = queue.shift() as NodeId;
      if (visited.has(target)) {
        continue;
      }
      visited.add(target);

      const incoming = doc.edges.filter((edge) => edge.target === target && edge.kind !== "loop");
      for (const edge of incoming) {
        if (!candidates.has(edge.source)) {
          candidates.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    candidates.delete(loopMode);
    return candidates;
  }, [doc.edges, loopMode]);

  /** ノード選択 */
  const handleSelectNode = useCallback(
    (id: NodeId) => {
      if (connectMode) {
        // 接続モード中：接続確定
        if (connectMode !== id) {
          onAddEdge(connectMode, id, "normal");
        }
        setConnectMode(null);
      } else if (loopMode) {
        if (id !== loopMode && parentCandidates.has(id)) {
          onAddEdge(loopMode, id, "loop");
        }
        setLoopMode(null);
      } else {
        onSelectNode(id);
      }
    },
    [connectMode, loopMode, onSelectNode, onAddEdge, parentCandidates]
  );

  /** 小メニュー表示 */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGGElement>, nodeId: NodeId) => {
      e.preventDefault();
      setMiniMenuNodeId(nodeId);
      setMiniMenuPos({ x: e.clientX, y: e.clientY });
      onSelectNode(nodeId);
    },
    [onSelectNode]
  );

  /** キャンバス空白クリック（小メニュー閉じる） */
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (connectMode) {
      const p = getWorldPoint(e.clientX, e.clientY);
      const targetId = onAddNode("task", "新規タスク", p.x, p.y);
      onAddEdge(connectMode, targetId, "normal");
      onSelectNode(targetId);
      setConnectMode(null);
    }
    if (loopMode) {
      setLoopMode(null);
    }
    setMiniMenuPos(null);
    setMiniMenuNodeId(null);
  }, [connectMode, getWorldPoint, loopMode, onAddEdge, onAddNode, onSelectNode]);

  const handleCreateBranch = useCallback(
    (sourceId: NodeId) => {
      const source = doc.nodes.find((node) => node.id === sourceId);
      if (!source) {
        return;
      }

      const outgoing = doc.edges.filter((edge) => edge.source === sourceId && edge.kind !== "loop");

      const x = source.position.x;
      const y = source.position.y;
      const conditionId = onAddNode("condition", "分岐", x + 220, y);
      const yesId = onAddNode("task", "Yes", x + 420, y - 120);
      const noId = onAddNode("task", "No", x + 420, y + 120);

      onAddEdge(sourceId, conditionId, "condition");
      onAddEdge(conditionId, yesId, "condition", "Yes");
      onAddEdge(conditionId, noId, "condition", "No");

      // 既存の下流接続を再配線して「挿入型」の分岐にする
      if (outgoing[0]) {
        onUpdateEdge(outgoing[0].id, {
          source: yesId,
          kind: "normal",
          label: undefined,
        });
      }
      if (outgoing[1]) {
        onUpdateEdge(outgoing[1].id, {
          source: noId,
          kind: "normal",
          label: undefined,
        });
      }
      for (const edge of outgoing.slice(2)) {
        onDeleteEdge(edge.id);
      }

      onSelectNode(conditionId);
    },
    [doc.edges, doc.nodes, onAddEdge, onAddNode, onDeleteEdge, onSelectNode, onUpdateEdge]
  );

  const handleDuplicateNode = useCallback(
    (sourceId: NodeId) => {
      const source = doc.nodes.find((node) => node.id === sourceId);
      if (!source) {
        return;
      }

      const duplicateId = onAddNode(
        source.type,
        `${source.name}_copy`,
        source.position.x + 48,
        source.position.y + 48,
        structuredClone(source.meta)
      );
      onSelectNode(duplicateId);
    },
    [doc.nodes, onAddNode, onSelectNode]
  );

  const handleFlipNode = useCallback(
    (targetId: NodeId) => {
      const target = doc.nodes.find((node) => node.id === targetId);
      if (!target || !svgRef.current) {
        return;
      }

      const worldLeft = -viewport.x;
      const worldTop = -viewport.y;
      const worldWidth = svgRef.current.clientWidth / viewport.zoom;
      const worldHeight = svgRef.current.clientHeight / viewport.zoom;

      const centerX = worldLeft + worldWidth / 2;
      const centerY = worldTop + worldHeight / 2;

      onUpdateNode(targetId, {
        position: {
          x: 2 * centerX - target.position.x,
          y: 2 * centerY - target.position.y,
        },
      });
    },
    [doc.nodes, onUpdateNode, viewport.x, viewport.y, viewport.zoom]
  );

  return (
    <div className="canvas-root">
      <svg
        ref={svgRef}
        className="canvas-svg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* グリッド背景（オプション） */}
        <defs>
          <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="10000" height="10000" fill="url(#gridPattern)" />

        {/* グループ：ビューポート適用 */}
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {/* エッジレイヤー（背面） */}
          {doc.edges.map((edge) => (
            <EdgeView
              key={edge.id}
              edge={edge}
              nodes={doc.nodes}
              isSelected={selectedNodeId === edge.source || selectedNodeId === edge.target}
              onDelete={() => onDeleteEdge(edge.id)}
            />
          ))}

          {/* ノードレイヤー（前面） */}
          {doc.nodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isConnectSource={connectMode === node.id}
              isLoopTarget={loopMode !== null && parentCandidates.has(node.id)}
              onSelect={() => handleSelectNode(node.id)}
              onContextMenu={(e: React.MouseEvent<SVGGElement>) => handleContextMenu(e, node.id)}
              onDragMove={(dx: number, dy: number) => {
                onUpdateNode(node.id, {
                  position: { x: node.position.x + dx, y: node.position.y + dy },
                });
              }}
            />
          ))}
        </g>
      </svg>

      {/* 小メニュー */}
      {miniMenuPos && miniMenuNodeId && (
        <MiniMenu
          position={miniMenuPos}
          nodeId={miniMenuNodeId}
          onConnect={() => {
            setConnectMode(miniMenuNodeId);
            setLoopMode(null);
            setMiniMenuPos(null);
          }}
          onBranch={() => {
            handleCreateBranch(miniMenuNodeId);
            setMiniMenuPos(null);
          }}
          onLoop={() => {
            setConnectMode(null);
            setLoopMode(miniMenuNodeId);
            setMiniMenuPos(null);
          }}
          onDuplicate={() => {
            handleDuplicateNode(miniMenuNodeId);
            setMiniMenuPos(null);
          }}
          onEdit={() => {
            setMiniMenuPos(null);
            // プロパティパネル自動フォーカス（AppShell 側で処理済み）
          }}
          onDelete={() => {
            onDeleteNode(miniMenuNodeId);
            setMiniMenuPos(null);
          }}
          onFlip={() => {
            handleFlipNode(miniMenuNodeId);
            setMiniMenuPos(null);
          }}
        />
      )}
    </div>
  );
}
