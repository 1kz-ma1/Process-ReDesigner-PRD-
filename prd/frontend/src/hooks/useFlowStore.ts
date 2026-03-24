/**
 * ストア：useReducer + immer + Undo/Redo
 * トランザクション的に操作を管理し、完全な履歴復元を実現
 */

import { useReducer, useCallback, useMemo } from "react";
import { produce } from "immer";
import type { FlowDoc, NodeData, EdgeData, NodeId, EdgeId, ValidationResult } from "../models/types";
import { generateNodeId, generateEdgeId } from "../utils/id";
import { enforceEdgePolicy } from "../utils/validator";

function toSafeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cloneFlowDoc(doc: FlowDoc): FlowDoc {
  const lanes = doc.lanes ?? doc.laneConfig;
  return {
    mode: doc.mode,
    version: doc.version,
    viewport: doc.viewport
      ? {
          x: Number.isFinite(doc.viewport.x) ? doc.viewport.x : 0,
          y: Number.isFinite(doc.viewport.y) ? doc.viewport.y : 0,
          zoom: Number.isFinite(doc.viewport.zoom) && doc.viewport.zoom > 0 ? doc.viewport.zoom : 1,
        }
      : { x: 0, y: 0, zoom: 1 },
    lanes: lanes
      ? {
          rows: [...lanes.rows],
          cols: [...lanes.cols],
        }
      : undefined,
    laneConfig: lanes
      ? {
          rows: [...lanes.rows],
          cols: [...lanes.cols],
        }
      : undefined,
    systemLanes: (doc.systemLanes ?? []).map((lane) => ({
      laneId: String(lane.laneId),
      name: String(lane.name),
      systemType: lane.systemType,
      blocks: [...(lane.blocks ?? [])],
      connections: [...(lane.connections ?? [])],
    })),
    laneConnections: (doc.laneConnections ?? []).map((connection) => ({
      connectionId: String(connection.connectionId),
      from: {
        laneId: String(connection.from.laneId),
        blockId: String(connection.from.blockId),
      },
      to: {
        laneId: String(connection.to.laneId),
        blockId: String(connection.to.blockId),
      },
      type: connection.type,
      payload: connection.payload,
    })),
    nodes: doc.nodes.map((node) => ({
      id: String(node.id),
      type: node.type,
      name: String(node.name),
      meta: toSafeMeta(node.meta),
      style: node.style
        ? {
            overrideColor: node.style.overrideColor
              ? {
                  bg: String(node.style.overrideColor.bg),
                  border: String(node.style.overrideColor.border),
                  text: String(node.style.overrideColor.text),
                }
              : undefined,
          }
        : undefined,
      lane: node.lane ? { row: node.lane.row, col: node.lane.col } : undefined,
      laneId: node.laneId,
      indexInCell: node.indexInCell,
      position: node.position
        ? {
            x: Number.isFinite(node.position.x) ? node.position.x : 0,
            y: Number.isFinite(node.position.y) ? node.position.y : 0,
          }
        : undefined,
    })),
    edges: doc.edges.map((edge) => ({
      id: String(edge.id),
      source: String(edge.source),
      target: String(edge.target),
      kind: edge.kind,
      label: edge.label,
    })),
  };
}

// ========== アクション定義 ==========

export type StoreAction =
  | { type: "LOAD"; payload: FlowDoc }
  | { type: "SET_DOC"; payload: FlowDoc }
  | { type: "SET_MODE"; payload: "roadmap" | "free" }
  | { type: "ADD_NODE"; payload: NodeData }
  | { type: "UPDATE_NODE"; payload: { id: NodeId; patch: Partial<NodeData> } }
  | { type: "DELETE_NODE"; payload: NodeId }
  | { type: "ADD_EDGE"; payload: { source: NodeId; target: NodeId; kind: "normal" | "condition" | "loop"; label?: string } }
  | { type: "UPDATE_EDGE"; payload: { id: EdgeId; patch: Partial<EdgeData> } }
  | { type: "DELETE_EDGE"; payload: EdgeId }
  | { type: "SET_VIEWPORT"; payload: { x: number; y: number; zoom: number } }
  | { type: "SET_VALIDATION"; payload: ValidationResult }
  | { type: "UNDO" }
  | { type: "REDO" };

// ========== 状態構造 ==========

export interface FlowState {
  current: FlowDoc;
  validation: ValidationResult;
  history: FlowDoc[]; // 過去
  future: FlowDoc[]; // 未来（Redo用）
  maxHistory: number;
}

const DEFAULT_FLOW: FlowDoc = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  mode: "roadmap",
  lanes: {
    rows: ["役割A", "役割B", "役割C"],
    cols: ["計画", "実行", "検証", "完了"],
  },
  laneConfig: {
    rows: ["役割A", "役割B", "役割C"],
    cols: ["計画", "実行", "検証", "完了"],
  },
  systemLanes: [
    { laneId: "lane-main", name: "メインシステム", systemType: "custom" },
  ],
  laneConnections: [],
};

const DEFAULT_VALIDATION: ValidationResult = {
  valid: true,
  messages: [],
};

// ========== Reducer ==========

function flowReducer(state: FlowState, action: StoreAction): FlowState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        current: action.payload,
        history: [],
        future: [],
        validation: DEFAULT_VALIDATION,
      };

    case "SET_MODE":
      return produce(state, (draft: any) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        draft.current.mode = action.payload;
      });

    case "SET_DOC":
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        draft.current = cloneFlowDoc(action.payload);
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });

    case "ADD_NODE": {
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        draft.current.nodes.push(action.payload);
        // 履歴管理
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });
    }

    case "UPDATE_NODE":
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        const node = draft.current.nodes.find((n) => n.id === action.payload.id);
        if (node) {
          Object.assign(node, action.payload.patch);
        }
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });

    case "DELETE_NODE": {
      const nodeId = action.payload;
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        // ノード削除
        draft.current.nodes = draft.current.nodes.filter((n) => n.id !== nodeId);
        // 関連エッジを削除
        draft.current.edges = draft.current.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        );
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });
    }

    case "ADD_EDGE": {
      const newEdge: EdgeData = {
        id: generateEdgeId(),
        source: action.payload.source,
        target: action.payload.target,
        kind: action.payload.kind,
        label: action.payload.label,
      };
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        draft.current.edges.push(newEdge);
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });
    }

    case "UPDATE_EDGE":
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        const edge = draft.current.edges.find((e) => e.id === action.payload.id);
        if (edge) {
          Object.assign(edge, action.payload.patch);
        }
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });

    case "DELETE_EDGE":
      return produce(state, (draft) => {
        draft.history.push(cloneFlowDoc(draft.current));
        draft.future = [];
        draft.current.edges = draft.current.edges.filter((e) => e.id !== action.payload);
        if (draft.history.length > draft.maxHistory) {
          draft.history.shift();
        }
      });

    case "SET_VIEWPORT":
      return produce(state, (draft) => {
        // ビューポート変更は履歴に入れない（操作中の頻繁な変更のため）
        draft.current.viewport = action.payload;
      });

    case "SET_VALIDATION":
      return produce(state, (draft) => {
        draft.validation = action.payload;
      });

    case "UNDO": {
      if (state.history.length === 0) return state;
      return produce(state, (draft) => {
        const previous = draft.history.pop();
        if (previous) {
          draft.future.push(cloneFlowDoc(draft.current));
          draft.current = previous;
        }
      });
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      return produce(state, (draft) => {
        const next = draft.future.pop();
        if (next) {
          draft.history.push(cloneFlowDoc(draft.current));
          draft.current = next;
        }
      });
    }

    default:
      return state;
  }
}

// ========== Hook ==========

export function useFlowStore(initialFlow?: FlowDoc) {
  const [state, dispatch] = useReducer(flowReducer, {
    current: initialFlow ?? DEFAULT_FLOW,
    validation: DEFAULT_VALIDATION,
    history: [],
    future: [],
    maxHistory: 100,
  });

  // ========== 便利なアクション群 ==========

  const load = useCallback((flow: FlowDoc) => {
    dispatch({ type: "LOAD", payload: cloneFlowDoc(flow) });
  }, []);

  const setMode = useCallback((mode: "roadmap" | "free") => {
    dispatch({ type: "SET_MODE", payload: mode });
  }, []);

  const setDocument = useCallback((doc: FlowDoc) => {
    dispatch({ type: "SET_DOC", payload: cloneFlowDoc(doc) });
  }, []);

  const addNode = useCallback(
    (type: "task" | "condition", name: string, x: number, y: number, meta: Record<string, unknown> = {}) => {
      const id = generateNodeId();
      dispatch({
        type: "ADD_NODE",
        payload: {
          id,
          type,
          name,
          meta,
          position: { x, y },
        },
      });
      return id;
    },
    []
  );

  const updateNode = useCallback((id: NodeId, patch: Partial<NodeData>) => {
    dispatch({ type: "UPDATE_NODE", payload: { id, patch } });
  }, []);

  const deleteNode = useCallback((id: NodeId) => {
    dispatch({ type: "DELETE_NODE", payload: id });
  }, []);

  const addEdge = useCallback(
    (source: NodeId, target: NodeId, kind: "normal" | "condition" | "loop" = "normal", label?: string) => {
      const policy = enforceEdgePolicy(state.current, {
        id: "preview",
        source,
        target,
        kind,
        label,
      });
      if (!policy.allowed) {
        return false;
      }
      dispatch({ type: "ADD_EDGE", payload: { source, target, kind, label } });
      return true;
    },
    [state.current]
  );

  const updateEdge = useCallback((id: EdgeId, patch: Partial<EdgeData>) => {
    dispatch({ type: "UPDATE_EDGE", payload: { id, patch } });
  }, []);

  const deleteEdge = useCallback((id: EdgeId) => {
    dispatch({ type: "DELETE_EDGE", payload: id });
  }, []);

  const setViewport = useCallback((x: number, y: number, zoom: number) => {
    dispatch({ type: "SET_VIEWPORT", payload: { x, y, zoom } });
  }, []);

  const setValidation = useCallback((validation: ValidationResult) => {
    dispatch({ type: "SET_VALIDATION", payload: validation });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const canUndo = useMemo(() => state.history.length > 0, [state.history.length]);
  const canRedo = useMemo(() => state.future.length > 0, [state.future.length]);

  return {
    // ステート
    current: state.current,
    validation: state.validation,
    canUndo,
    canRedo,

    // アクション
    load,
    setMode,
    setDocument,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    setViewport,
    setValidation,
    undo,
    redo,
  };
}

export type UseFlowStore = ReturnType<typeof useFlowStore>;
