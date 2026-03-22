/** ノード型 */
export type NodeType = "task" | "condition";

/** エッジの種類 */
export type EdgeKind = "normal" | "condition" | "loop";

/** ノードID */
export type NodeId = string;

/** エッジID */
export type EdgeId = string;

/** ノードの位置情報 */
export interface Position {
  x: number;
  y: number;
}

/** ロードマップモードでのセル位置 */
export interface LanePosition {
  row: number;
  col: number;
}

/** ノードデータ（新仕様：両モード共有） */
export interface NodeData {
  id: NodeId;
  type: NodeType; // "task" | "condition"
  name: string;
  meta: Record<string, unknown>;
  // レイアウト（両方保持して往復可能）
  position: Position; // 自由配置用
  lane?: LanePosition; // ロードマップ用（セル位置）
}

/** エッジデータ（新仕様：両モード共有） */
export interface EdgeData {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  kind: EdgeKind; // "normal" | "condition" | "loop"
  label?: string; // e.g., "Yes" | "No"
}

/** ビューポート（ズーム・パン） */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** ロードマップレイアウト設定 */
export interface LaneConfig {
  rows: string[]; // 役割・部門の名前
  cols: string[]; // 工程・フェーズの名前
}

/** フロー全体の構造（新仕様） */
export interface FlowDoc {
  nodes: NodeData[];
  edges: EdgeData[];
  viewport: Viewport;
  mode: "roadmap" | "free"; // モード切替
  laneConfig?: LaneConfig; // ロードマップ用設定
}

/** 検証エラー・警告 */
export interface ValidationMessage {
  type: "error" | "warning" | "info";
  message: string;
  nodeId?: NodeId;
  edgeId?: EdgeId;
}

/** 検証結果 */
export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

// ========== 後方互換性向けの型（既存API用） ==========

export type BlockType =
  | "Input"
  | "Validate"
  | "Approve"
  | "Handoff"
  | "Transform"
  | "Notify"
  | "Store"
  | "Review"
  | "Decision"
  | "Complete";

export interface Flow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: "draft" | "active" | "archived";
  targetSLAmin?: number;
}

export interface Block {
  id: string;
  flowId: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  meta: Record<string, unknown>;
}

export interface Edge {
  id: string;
  flowId: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;
  condition?: Record<string, unknown>;
}

export interface Suggestion {
  id: string;
  flowId: string;
  ruleCode: string;
  severity: "info" | "warn" | "critical";
  summary: string;
  detail: string;
  fixPlan: {
    action: "UPDATE_BLOCK_META" | "DELETE_BLOCK" | "INSERT_BLOCK" | "MERGE_BLOCKS";
    blockIds?: string[];
    targetBlockId?: string;
    payload?: Record<string, unknown>;
  };
}

export interface Iteration {
  id: string;
  flowId: string;
  parentIterationId?: string;
  snapshot: {
    flow: Flow;
    blocks: Block[];
    edges: Edge[];
  };
  note?: string;
  createdAt: string;
}

export interface FlowBundle {
  flow: Flow;
  blocks: Block[];
  edges: Edge[];
  suggestions: Suggestion[];
}
