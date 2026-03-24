/**
 * CanvasRoot
 * SVG キャンバス：ズーム/パン対応、ノード・エッジ描画、小メニュー
 */

import { Fragment, useRef, useState, useCallback, useMemo } from "react";
import type {
  FlowDoc,
  NodeId,
  EdgeId,
  NodeData,
  Position,
  ValidationMessage,
  LaneConnectionType,
  SystemType,
} from "../models/types";
import { designTokens } from "../utils/designTokens";
import NodeView from "./NodeView";
import EdgeView from "./EdgeView";
import MiniMenu from "./MiniMenu";
import SmartAddPopover from "./SmartAddPopover";
import { recommendBlocks } from "../utils/smartAdd";
import "../styles/canvas.css";

interface CanvasRootProps {
  doc: FlowDoc;
  selectedNodeId: NodeId | null;
  onSelectNode: (id: NodeId) => void;
  onViewportChange: (x: number, y: number, zoom: number) => void;
  onAddNode: (type: "task" | "condition", name: string, x: number, y: number, meta?: Record<string, unknown>) => NodeId;
  onUpdateNode: (id: NodeId, patch: Partial<NodeData>) => void;
  onDeleteNode: (id: NodeId) => void;
  onAddEdge: (source: NodeId, target: NodeId, kind: "normal" | "condition" | "loop", label?: string) => boolean;
  onUpdateEdge: (id: EdgeId, patch: any) => void;
  onDeleteEdge: (id: EdgeId) => void;
  validationMessages?: ValidationMessage[];
  improveHighlight?: boolean;
  smartAddAutoConnect?: boolean;
  onJumpToValidation?: (msg: ValidationMessage) => void;
  onAddSystemLane?: () => void;
  onUpdateSystemLane?: (laneId: string, patch: { name?: string; systemType?: SystemType }) => void;
  onDeleteSystemLane?: (laneId: string) => void;
  onAddLaneConnection?: (input: {
    fromLaneId: string;
    fromBlockId: string;
    toLaneId: string;
    toBlockId: string;
    type: LaneConnectionType;
    payload?: string;
  }) => void;
  onUpdateLaneConnection?: (connectionId: string, patch: { type: LaneConnectionType; payload?: string }) => void;
  onDeleteLaneConnection?: (connectionId: string) => void;
  onExportKintone?: () => void;
}

interface PendingLaneConnection {
  fromLaneId: string;
  fromBlockId: string;
  toLaneId: string;
  toBlockId: string;
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
  validationMessages = [],
  improveHighlight = false,
  smartAddAutoConnect = false,
  onJumpToValidation,
  onAddSystemLane,
  onUpdateSystemLane,
  onDeleteSystemLane,
  onAddLaneConnection,
  onUpdateLaneConnection,
  onDeleteLaneConnection,
  onExportKintone,
}: CanvasRootProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [roadmapPanelOpen, setRoadmapPanelOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<NodeId | null>(null);
  const [loopMode, setLoopMode] = useState<NodeId | null>(null);
  const [miniMenuPos, setMiniMenuPos] = useState<Position | null>(null);
  const [miniMenuNodeId, setMiniMenuNodeId] = useState<NodeId | null>(null);
  const [dragNodeId, setDragNodeId] = useState<NodeId | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [smartAddCell, setSmartAddCell] = useState<{ row: number; col: number; laneId?: string } | null>(null);
  const [edgeSuggestions, setEdgeSuggestions] = useState<Array<{ source: NodeId; target: NodeId; label: string }>>([]);
  const [pendingLaneConnection, setPendingLaneConnection] = useState<PendingLaneConnection | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [laneConnectionType, setLaneConnectionType] = useState<LaneConnectionType>("api");
  const [laneConnectionPayload, setLaneConnectionPayload] = useState("");

  const viewport = doc.viewport ?? { x: 0, y: 0, zoom: 1 };
  const lanes = doc.lanes ?? doc.laneConfig ?? { rows: ["役割A"], cols: ["工程A"] };
  const CELL_W = 220;
  const CELL_H = 120;
  const SYSTEM_LANE_WIDTH = 300;
  const SYSTEM_LANE_GAP = 40;
  const SYSTEM_LANE_START_X = 120;
  const SYSTEM_LANE_START_Y = 90;
  const gridMetrics = useMemo(() => ({ cellW: CELL_W, cellH: CELL_H, rowHeaderW: 0, colHeaderH: 0 }), []);

  const systemLanes = useMemo(() => {
    const lanes = doc.systemLanes ?? [];
    if (lanes.length > 0) {
      return lanes;
    }
    return [{ laneId: "lane-main", name: "メインシステム", systemType: "custom" as const }];
  }, [doc.systemLanes]);

  const hasSystemLanes = doc.mode === "roadmap" && systemLanes.length > 0;
  const laneIndexById = useMemo(() => new Map(systemLanes.map((lane, index) => [lane.laneId, index])), [systemLanes]);

  const toLane = useCallback((pos: Position) => {
    if (hasSystemLanes) {
      const laneRaw = (pos.x - SYSTEM_LANE_START_X) / (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP);
      const laneIndex = Math.max(0, Math.min(systemLanes.length - 1, Math.floor(laneRaw)));
      const laneId = systemLanes[laneIndex]?.laneId ?? systemLanes[0]?.laneId ?? "lane-main";
      const rowRaw = (pos.y - SYSTEM_LANE_START_Y) / CELL_H;
      const row = Math.max(0, Math.floor(rowRaw));
      return { row, col: laneIndex, laneId };
    }
    const col = Math.max(0, Math.min(lanes.cols.length - 1, Math.floor((pos.x - gridMetrics.rowHeaderW) / gridMetrics.cellW)));
    const row = Math.max(0, Math.min(lanes.rows.length - 1, Math.floor((pos.y - gridMetrics.colHeaderH) / gridMetrics.cellH)));
    const laneId = systemLanes[col]?.laneId ?? systemLanes[0]?.laneId ?? "lane-main";
    return { row, col, laneId };
  }, [CELL_H, hasSystemLanes, gridMetrics.cellH, gridMetrics.cellW, gridMetrics.colHeaderH, gridMetrics.rowHeaderW, lanes.cols.length, lanes.rows.length, systemLanes]);

  const normalizedNodes = useMemo(() => {
    if (hasSystemLanes) {
      const laneBuckets = new Map<string, NodeData[]>();
      for (const lane of systemLanes) {
        laneBuckets.set(lane.laneId, []);
      }

      const fallbackLaneId = systemLanes[0]?.laneId ?? "lane-main";
      for (const node of doc.nodes) {
        const laneId = node.laneId && laneBuckets.has(node.laneId) ? node.laneId : fallbackLaneId;
        const bucket = laneBuckets.get(laneId) ?? [];
        bucket.push(node);
        laneBuckets.set(laneId, bucket);
      }

      const resolved: NodeData[] = [];
      for (const [laneId, nodes] of laneBuckets.entries()) {
        const laneIndex = laneIndexById.get(laneId) ?? 0;
        nodes
          .sort((a, b) => {
            const ay = a.position?.y ?? 0;
            const by = b.position?.y ?? 0;
            return ay - by;
          })
          .forEach((node, indexInLane) => {
            const x = SYSTEM_LANE_START_X + laneIndex * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP) + SYSTEM_LANE_WIDTH / 2;
            const y = SYSTEM_LANE_START_Y + indexInLane * CELL_H;
            resolved.push({
              ...node,
              laneId,
              lane: { row: indexInLane, col: laneIndex },
              indexInCell: indexInLane,
              position: { x, y },
            });
          });
      }

      return resolved;
    }

    return doc.nodes.map((node) => {
      if (node.position) {
        return node;
      }
      if (node.lane) {
        const idx = node.indexInCell ?? 0;
        return {
          ...node,
          position: {
            x: node.lane.col * CELL_W + CELL_W / 2,
            y: node.lane.row * CELL_H + CELL_H / 2 + idx * 20,
          },
        };
      }
      return {
        ...node,
        position: { x: 0, y: 0 },
      };
    });
  }, [CELL_H, SYSTEM_LANE_GAP, SYSTEM_LANE_START_X, SYSTEM_LANE_START_Y, SYSTEM_LANE_WIDTH, doc.nodes, hasSystemLanes, laneIndexById, systemLanes]);

  const canvasMinWidth = useMemo(() => {
    const laneBasedWidth = doc.mode === "roadmap"
      ? hasSystemLanes
        ? 180 + systemLanes.length * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP) + 160
        : 180 + lanes.cols.length * 220 + 120
      : 1200;
    const maxNodeX = normalizedNodes.reduce((acc, node) => Math.max(acc, node.position?.x ?? 0), 0);
    return Math.max(laneBasedWidth, maxNodeX + 500, 1200);
  }, [SYSTEM_LANE_GAP, SYSTEM_LANE_WIDTH, doc.mode, hasSystemLanes, lanes.cols.length, normalizedNodes, systemLanes.length]);

  const canvasMinHeight = useMemo(() => {
    const laneBasedHeight = doc.mode === "roadmap"
      ? hasSystemLanes
        ? Math.max(720, normalizedNodes.length * 46 + 380)
        : lanes.rows.length * 120 + 280
      : 720;
    const maxNodeY = normalizedNodes.reduce((acc, node) => Math.max(acc, node.position?.y ?? 0), 0);
    return Math.max(laneBasedHeight, maxNodeY + 360, 720);
  }, [doc.mode, hasSystemLanes, lanes.rows.length, normalizedNodes]);

  const addNodeInLane = useCallback((
    row: number,
    col: number,
    name = "新規タスク",
    type: "task" | "condition" = "task",
    category?: string,
    laneIdArg?: string
  ) => {
    const laneId = laneIdArg ?? systemLanes[col]?.laneId ?? systemLanes[0]?.laneId ?? "lane-main";
    const laneIndex = laneIndexById.get(laneId) ?? col;
    const inCell = hasSystemLanes
      ? normalizedNodes.filter((n) => n.laneId === laneId).length
      : normalizedNodes.filter((n) => n.lane?.row === row && n.lane?.col === col).length;
    const x = hasSystemLanes
      ? SYSTEM_LANE_START_X + laneIndex * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP) + SYSTEM_LANE_WIDTH / 2
      : col * CELL_W + CELL_W / 2;
    const y = hasSystemLanes
      ? SYSTEM_LANE_START_Y + inCell * CELL_H
      : row * CELL_H + CELL_H / 2 + inCell * 20;
    const id = onAddNode(type, name, x, y, category ? { category } : {});
    onUpdateNode(id, {
      laneId,
      lane: { row: hasSystemLanes ? inCell : row, col: laneIndex },
      indexInCell: inCell,
      position: { x, y },
    });
    if (smartAddAutoConnect) {
      const leftNode = normalizedNodes
        .filter((n) => n.id !== id && n.lane?.col === col - 1)
        .sort((a, b) => Math.abs((a.lane?.row ?? 0) - row) - Math.abs((b.lane?.row ?? 0) - row))[0];
      if (leftNode) {
        onAddEdge(leftNode.id, id, "normal");
      }
    }
    onSelectNode(id);
  }, [CELL_H, CELL_W, SYSTEM_LANE_GAP, SYSTEM_LANE_START_X, SYSTEM_LANE_START_Y, SYSTEM_LANE_WIDTH, hasSystemLanes, laneIndexById, normalizedNodes, onAddEdge, onAddNode, onSelectNode, onUpdateNode, smartAddAutoConnect, systemLanes]);

  const buildEdgeSuggestions = useCallback((movedNodeId: NodeId, row: number, col: number) => {
    const movedNode = normalizedNodes.find((n) => n.id === movedNodeId);
    if (!movedNode) {
      setEdgeSuggestions([]);
      return;
    }
    const left = normalizedNodes
      .filter((n) => n.id !== movedNodeId && n.lane?.col === col - 1)
      .sort((a, b) => Math.abs((a.lane?.row ?? 0) - row) - Math.abs((b.lane?.row ?? 0) - row))[0];
    const right = normalizedNodes
      .filter((n) => n.id !== movedNodeId && n.lane?.col === col + 1)
      .sort((a, b) => Math.abs((a.lane?.row ?? 0) - row) - Math.abs((b.lane?.row ?? 0) - row))[0];
    const outgoingCount = (nodeId: NodeId) => doc.edges.filter((e) => e.source === nodeId && e.kind !== "loop").length;

    const next: Array<{ source: NodeId; target: NodeId; label: string }> = [];
    if (left && !(left.type === "condition" && outgoingCount(left.id) >= 2)) {
      next.push({ source: left.id, target: movedNodeId, label: "左隣から接続" });
    }
    if (right && !(movedNode.type === "condition" && outgoingCount(movedNode.id) >= 2)) {
      next.push({ source: movedNodeId, target: right.id, label: "右隣へ接続" });
    }
    setEdgeSuggestions(next.slice(0, 3));
  }, [doc.edges, normalizedNodes]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(designTokens.zoomMin, Math.min(designTokens.zoomMax, viewport.zoom + delta * designTokens.zoomStep));
    onViewportChange(viewport.x, viewport.y, newZoom);
  }, [onViewportChange, viewport.x, viewport.y, viewport.zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 2 && e.button !== 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    onViewportChange(viewport.x + dx / viewport.zoom, viewport.y + dy / viewport.zoom, viewport.zoom);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [dragStart, isDragging, onViewportChange, viewport.x, viewport.y, viewport.zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const getWorldPoint = useCallback((clientX: number, clientY: number): Position => {
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
  }, [viewport.x, viewport.y, viewport.zoom]);

  const parentCandidates = useMemo(() => {
    if (!loopMode) {
      return new Set<NodeId>();
    }
    const candidates = new Set<NodeId>();
    const queue: NodeId[] = [loopMode];
    const visited = new Set<NodeId>();

    while (queue.length > 0) {
      const target = queue.shift() as NodeId;
      if (visited.has(target)) continue;
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

  const handleSelectNode = useCallback((id: NodeId) => {
    if (connectMode) {
      if (connectMode !== id) {
        const sourceNode = normalizedNodes.find((node) => node.id === connectMode);
        const targetNode = normalizedNodes.find((node) => node.id === id);
        const isCrossLane = Boolean(
          sourceNode?.laneId && targetNode?.laneId && sourceNode.laneId !== targetNode.laneId
        );

        if (isCrossLane && sourceNode && targetNode && onAddLaneConnection) {
          setPendingLaneConnection({
            fromLaneId: sourceNode.laneId as string,
            fromBlockId: sourceNode.id,
            toLaneId: targetNode.laneId as string,
            toBlockId: targetNode.id,
          });
          setLaneConnectionType("api");
          setLaneConnectionPayload("");
        } else {
          onAddEdge(connectMode, id, "normal");
        }
      }
      setConnectMode(null);
      return;
    }
    if (loopMode) {
      if (id !== loopMode && parentCandidates.has(id)) {
        onAddEdge(loopMode, id, "loop");
      }
      setLoopMode(null);
      return;
    }
    onSelectNode(id);
  }, [connectMode, loopMode, normalizedNodes, onAddEdge, onAddLaneConnection, onSelectNode, parentCandidates]);

  const confirmLaneConnection = useCallback(() => {
    if (!pendingLaneConnection) {
      return;
    }
    if (editingConnectionId) {
      onUpdateLaneConnection?.(editingConnectionId, {
        type: laneConnectionType,
        payload: laneConnectionPayload.trim().length > 0 ? laneConnectionPayload.trim() : undefined,
      });
      setPendingLaneConnection(null);
      setEditingConnectionId(null);
      setLaneConnectionPayload("");
      return;
    }
    const added = onAddEdge(
      pendingLaneConnection.fromBlockId,
      pendingLaneConnection.toBlockId,
      "normal"
    );
    if (!added) {
      setPendingLaneConnection(null);
      return;
    }
    onAddLaneConnection?.({
      ...pendingLaneConnection,
      type: laneConnectionType,
      payload: laneConnectionPayload.trim().length > 0 ? laneConnectionPayload.trim() : undefined,
    });
    setPendingLaneConnection(null);
    setEditingConnectionId(null);
    setLaneConnectionPayload("");
  }, [editingConnectionId, laneConnectionPayload, laneConnectionType, onAddEdge, onAddLaneConnection, onUpdateLaneConnection, pendingLaneConnection]);

  const cancelLaneConnection = useCallback(() => {
    setPendingLaneConnection(null);
    setEditingConnectionId(null);
    setLaneConnectionPayload("");
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGGElement>, nodeId: NodeId) => {
    e.preventDefault();
    setMiniMenuNodeId(nodeId);
    setMiniMenuPos({ x: e.clientX, y: e.clientY });
    onSelectNode(nodeId);
  }, [onSelectNode]);

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
    setSmartAddCell(null);
  }, [connectMode, getWorldPoint, loopMode, onAddEdge, onAddNode, onSelectNode]);

  const handleCreateBranch = useCallback((sourceId: NodeId) => {
    const source = normalizedNodes.find((node) => node.id === sourceId);
    if (!source) return;

    const outgoing = doc.edges.filter((edge) => edge.source === sourceId && edge.kind !== "loop");
    const x = source.position?.x ?? 0;
    const y = source.position?.y ?? 0;
    const conditionId = onAddNode("condition", "分岐", x + 220, y);
    const yesId = onAddNode("task", "Yes", x + 420, y - 120);
    const noId = onAddNode("task", "No", x + 420, y + 120);

    onAddEdge(sourceId, conditionId, "condition");
    onAddEdge(conditionId, yesId, "condition", "Yes");
    onAddEdge(conditionId, noId, "condition", "No");

    if (outgoing[0]) {
      onUpdateEdge(outgoing[0].id, { source: yesId, kind: "normal", label: undefined });
    }
    if (outgoing[1]) {
      onUpdateEdge(outgoing[1].id, { source: noId, kind: "normal", label: undefined });
    }
    for (const edge of outgoing.slice(2)) {
      onDeleteEdge(edge.id);
    }
    onSelectNode(conditionId);
  }, [doc.edges, normalizedNodes, onAddEdge, onAddNode, onDeleteEdge, onSelectNode, onUpdateEdge]);

  const handleDuplicateNode = useCallback((sourceId: NodeId) => {
    const source = normalizedNodes.find((node) => node.id === sourceId);
    if (!source) return;
    const duplicateId = onAddNode(
      source.type,
      `${source.name}_copy`,
      (source.position?.x ?? 0) + 48,
      (source.position?.y ?? 0) + 48,
      structuredClone(source.meta)
    );
    onSelectNode(duplicateId);
  }, [normalizedNodes, onAddNode, onSelectNode]);

  const handleFlipNode = useCallback((targetId: NodeId) => {
    const target = normalizedNodes.find((node) => node.id === targetId);
    if (!target || !svgRef.current) return;

    const worldLeft = -viewport.x;
    const worldTop = -viewport.y;
    const worldWidth = svgRef.current.clientWidth / viewport.zoom;
    const worldHeight = svgRef.current.clientHeight / viewport.zoom;
    const centerX = worldLeft + worldWidth / 2;
    const centerY = worldTop + worldHeight / 2;

    onUpdateNode(targetId, {
      position: {
        x: 2 * centerX - (target.position?.x ?? 0),
        y: 2 * centerY - (target.position?.y ?? 0),
      },
    });
  }, [normalizedNodes, onUpdateNode, viewport.x, viewport.y, viewport.zoom]);

  return (
    <div
      className="canvas-root"
      style={{
        ["--canvas-min-width" as string]: `${canvasMinWidth}px`,
        ["--canvas-min-height" as string]: `${canvasMinHeight}px`,
      }}
    >
      {doc.mode === "roadmap" && (
        <section className="roadmap-panel" aria-label="レーン表">
          <button
            className="roadmap-panel-toggle"
            onClick={() => setRoadmapPanelOpen((v) => !v)}
            aria-expanded={roadmapPanelOpen}
          >
            {roadmapPanelOpen ? "▾ レーン表を折りたたむ" : "▸ レーン表を表示"}
          </button>
          {roadmapPanelOpen && (
            <div className="system-lane-panel">
              <div className="system-lane-panel-head">
                <strong>システムレーン</strong>
                <div className="system-lane-panel-actions">
                  {onExportKintone && (
                    <button type="button" onClick={onExportKintone}>kintone JSON出力</button>
                  )}
                  {onAddSystemLane && (
                    <button type="button" onClick={onAddSystemLane}>＋システムを追加</button>
                  )}
                </div>
              </div>

              <div className="system-lane-list">
                {systemLanes.map((lane, index) => (
                  <div key={lane.laneId} className="system-lane-item">
                    <label>
                      名前
                      <input
                        type="text"
                        value={lane.name}
                        onChange={(e) => onUpdateSystemLane?.(lane.laneId, { name: e.target.value })}
                      />
                    </label>
                    <label>
                      systemType
                      <select
                        value={lane.systemType}
                        onChange={(e) => onUpdateSystemLane?.(lane.laneId, { systemType: e.target.value as SystemType })}
                      >
                        <option value="kintone">kintone</option>
                        <option value="external">external</option>
                        <option value="excel">excel</option>
                        <option value="custom">custom</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => addNodeInLane(0, index, "新規タスク", "task", undefined, lane.laneId)}
                    >
                      ＋ブロック
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDeleteSystemLane?.(lane.laneId)}
                      disabled={systemLanes.length <= 1}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>

              <div className="lane-connection-list">
                <h4>レーン間連携</h4>
                {(doc.laneConnections ?? []).length === 0 ? (
                  <p className="muted">連携はまだありません</p>
                ) : (
                  <ul>
                    {(doc.laneConnections ?? []).map((connection) => (
                      <li key={connection.connectionId}>
                        <span>
                          {connection.from.laneId} → {connection.to.laneId} ({connection.type})
                        </span>
                        <div className="lane-connection-row-actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setPendingLaneConnection({
                                fromLaneId: connection.from.laneId,
                                fromBlockId: connection.from.blockId,
                                toLaneId: connection.to.laneId,
                                toBlockId: connection.to.blockId,
                              });
                              setEditingConnectionId(connection.connectionId);
                              setLaneConnectionType(connection.type);
                              setLaneConnectionPayload(connection.payload ?? "");
                            }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => onDeleteLaneConnection?.(connection.connectionId)}
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!hasSystemLanes && (
                <div className="roadmap-grid" style={{ gridTemplateColumns: `180px repeat(${lanes.cols.length}, minmax(180px, 1fr))` }}>
                  <div className="roadmap-corner">レーン / フェーズ</div>
                  {lanes.cols.map((col) => (
                    <div className="roadmap-col-head" key={`col-${col}`}>{col}</div>
                  ))}
                  {lanes.rows.map((row, rowIdx) => (
                    <Fragment key={`row-group-${row}-${rowIdx}`}>
                      <div className="roadmap-row-head" key={`row-${row}`}>{row}</div>
                      {lanes.cols.map((col, colIdx) => (
                        <button
                          key={`cell-${rowIdx}-${colIdx}`}
                          className="roadmap-cell-add"
                          data-row={rowIdx}
                          data-col={colIdx}
                          onClick={() => setSmartAddCell({ row: rowIdx, col: colIdx })}
                        >
                          ＋ {row} / {col} に ここに追加
                        </button>
                      ))}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <svg
        ref={svgRef}
        className="canvas-svg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDoubleClick={(e) => {
          if (doc.mode !== "roadmap") return;
          const p = getWorldPoint(e.clientX, e.clientY);
          setSmartAddCell(toLane(p));
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="10000" height="10000" fill="url(#gridPattern)" />

        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {doc.mode === "roadmap" && hasSystemLanes && systemLanes.map((lane, index) => {
            const laneX = SYSTEM_LANE_START_X + index * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP);
            return (
              <g key={`sys-lane-bg-${lane.laneId}`}>
                <rect
                  x={laneX}
                  y={24}
                  width={SYSTEM_LANE_WIDTH}
                  height={Math.max(canvasMinHeight + 400, 1200)}
                  rx={12}
                  fill={lane.systemType === "kintone" ? "rgba(31, 138, 112, 0.08)" : "rgba(148, 163, 184, 0.10)"}
                  stroke="rgba(100, 116, 139, 0.28)"
                />
                <text x={laneX + 14} y={50} fontSize="14" fontWeight="700" fill="#1f2937">
                  {lane.name}
                </text>
                <text x={laneX + 14} y={70} fontSize="11" fill="#64748b">
                  {lane.systemType}
                </text>
              </g>
            );
          })}

          {doc.mode === "roadmap" && hoverCell && (
            <rect
              x={hasSystemLanes ? SYSTEM_LANE_START_X + hoverCell.col * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP) : hoverCell.col * CELL_W}
              y={hasSystemLanes ? SYSTEM_LANE_START_Y + hoverCell.row * CELL_H - CELL_H / 2 : hoverCell.row * CELL_H}
              width={hasSystemLanes ? SYSTEM_LANE_WIDTH : CELL_W}
              height={CELL_H}
              className="roadmap-drop-highlight"
            />
          )}

          {doc.edges.map((edge) => (
            <EdgeView
              key={edge.id}
              edge={edge}
              nodes={normalizedNodes}
              isSelected={selectedNodeId === edge.source || selectedNodeId === edge.target}
              onDelete={() => onDeleteEdge(edge.id)}
            />
          ))}

          {normalizedNodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isConnectSource={connectMode === node.id}
              isLoopTarget={loopMode !== null && parentCandidates.has(node.id)}
              onSelect={() => handleSelectNode(node.id)}
              onContextMenu={(e: React.MouseEvent<SVGGElement>) => handleContextMenu(e, node.id)}
              onDragMove={(dx: number, dy: number) => {
                const nextPos = { x: (node.position?.x ?? 0) + dx, y: (node.position?.y ?? 0) + dy };
                onUpdateNode(node.id, { position: nextPos });
                if (doc.mode === "roadmap" && dragNodeId === node.id) {
                  setHoverCell(toLane(nextPos));
                }
              }}
              onDragStart={() => {
                setDragNodeId(node.id);
                setHoverCell(node.position ? toLane(node.position) : null);
              }}
              onDragEnd={(nodeId, position) => {
                if (doc.mode !== "roadmap") {
                  setDragNodeId(null);
                  setHoverCell(null);
                  return;
                }
                const lane = toLane(position);
                const oldLane = normalizedNodes.find((n) => n.id === nodeId);
                const inCell = hasSystemLanes
                  ? normalizedNodes.filter((n) => n.id !== nodeId && n.laneId === lane.laneId).length
                  : normalizedNodes.filter((n) => n.id !== nodeId && n.lane?.row === lane.row && n.lane?.col === lane.col).length;
                onUpdateNode(nodeId, {
                  laneId: lane.laneId,
                  lane: { row: hasSystemLanes ? inCell : lane.row, col: lane.col },
                  indexInCell: inCell,
                  position: {
                    x: hasSystemLanes
                      ? SYSTEM_LANE_START_X + lane.col * (SYSTEM_LANE_WIDTH + SYSTEM_LANE_GAP) + SYSTEM_LANE_WIDTH / 2
                      : lane.col * CELL_W + CELL_W / 2,
                    y: hasSystemLanes
                      ? SYSTEM_LANE_START_Y + inCell * CELL_H
                      : lane.row * CELL_H + CELL_H / 2 + inCell * 20,
                  },
                });
                if (!oldLane || oldLane.laneId !== lane.laneId || oldLane.lane?.col !== lane.col) {
                  buildEdgeSuggestions(nodeId, hasSystemLanes ? inCell : lane.row, lane.col);
                }
                setDragNodeId(null);
                setHoverCell(null);
              }}
            />
          ))}

          {improveHighlight && normalizedNodes.map((node) => {
            const related = validationMessages.find((m) => (m.targets?.nodes ?? []).includes(node.id));
            if (!related) return null;
            const color = related.type === "error" ? "#EF4444" : related.type === "warning" ? "#F59E0B" : "#3B82F6";
            const dash = related.type === "suggestion" || related.type === "info" ? "6 4" : undefined;
            return (
              <rect
                key={`overlay-${node.id}`}
                x={(node.position?.x ?? 0) - designTokens.blockWidth / 2 - 6}
                y={(node.position?.y ?? 0) - designTokens.blockHeight / 2 - 6}
                width={designTokens.blockWidth + 12}
                height={designTokens.blockHeight + 12}
                rx={8}
                className="improve-overlay-hit"
                fill="none"
                stroke={color}
                strokeDasharray={dash}
                strokeWidth={2}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                  if (onJumpToValidation) {
                    onJumpToValidation(related);
                  }
                }}
              />
            );
          })}
        </g>
      </svg>

      {edgeSuggestions.length > 0 && (
        <aside className="edge-suggestion-panel" aria-label="推測配線候補">
          <strong>推測配線候補</strong>
          <ul>
            {edgeSuggestions.map((edge) => (
              <li key={`${edge.source}-${edge.target}`}>{edge.label}</li>
            ))}
          </ul>
          <div className="edge-suggestion-actions">
            <button
              onClick={() => {
                edgeSuggestions.forEach((edge) => onAddEdge(edge.source, edge.target, "normal"));
                setEdgeSuggestions([]);
              }}
            >
              一括適用
            </button>
            <button className="ghost" onClick={() => setEdgeSuggestions([])}>閉じる</button>
          </div>
        </aside>
      )}

      {smartAddCell && (
        <SmartAddPopover
          row={smartAddCell.row}
          col={smartAddCell.col}
          candidates={recommendBlocks(doc, smartAddCell.row, smartAddCell.col)}
          onPick={(candidate) => {
            addNodeInLane(smartAddCell.row, smartAddCell.col, candidate.name, candidate.type, candidate.category, smartAddCell.laneId);
            setSmartAddCell(null);
          }}
          onClose={() => setSmartAddCell(null)}
        />
      )}

      {pendingLaneConnection && (
        <div className="lane-connection-modal-overlay" role="presentation" onClick={cancelLaneConnection}>
          <div className="lane-connection-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{editingConnectionId ? "レーン間連携を編集" : "レーン間連携を設定"}</h3>
            <p>
              {pendingLaneConnection.fromLaneId} → {pendingLaneConnection.toLaneId}
            </p>
            <label>
              連携タイプ
              <select
                value={laneConnectionType}
                onChange={(event) => setLaneConnectionType(event.target.value as LaneConnectionType)}
              >
                <option value="api">api</option>
                <option value="webhook">webhook</option>
                <option value="manual">manual</option>
                <option value="file">file</option>
              </select>
            </label>
            <label>
              payload（任意）
              <textarea
                rows={3}
                value={laneConnectionPayload}
                onChange={(event) => setLaneConnectionPayload(event.target.value)}
                placeholder="連携仕様のメモ"
              />
            </label>
            <div className="lane-connection-modal-actions">
              <button type="button" className="ghost" onClick={cancelLaneConnection}>キャンセル</button>
              <button type="button" onClick={confirmLaneConnection}>{editingConnectionId ? "保存" : "接続を作成"}</button>
            </div>
          </div>
        </div>
      )}

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
