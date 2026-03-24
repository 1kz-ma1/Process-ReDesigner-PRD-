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

export type SystemType = "kintone" | "external" | "excel" | "custom";

export type LaneConnectionType = "api" | "webhook" | "manual" | "file";

export interface SystemLane {
  laneId: string;
  name: string;
  systemType: SystemType;
  blocks?: NodeId[];
  connections?: string[];
}

export interface LaneConnection {
  connectionId: string;
  from: { laneId: string; blockId: NodeId };
  to: { laneId: string; blockId: NodeId };
  type: LaneConnectionType;
  payload?: string;
}

/** ノードデータ（新仕様：両モード共有） */
export interface NodeData {
  id: NodeId;
  type: NodeType; // "task" | "condition"
  name: string;
  meta: Record<string, unknown>;
  style?: {
    overrideColor?: {
      bg: string;
      border: string;
      text: string;
    };
  };
  // レイアウト（両方保持して往復可能）
  position?: Position; // 自由配置用
  lane?: LanePosition; // ロードマップ用（セル位置）
  laneId?: string; // 複数システムレーン用
  indexInCell?: number;
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
  systemLanes?: SystemLane[];
  laneConnections?: LaneConnection[];
  viewport?: Viewport;
  mode: "roadmap" | "free"; // モード切替
  lanes?: LaneConfig; // ロードマップ用設定（新）
  laneConfig?: LaneConfig; // ロードマップ用設定
  version?: string;
}

/** 検証エラー・警告 */
export interface ValidationMessage {
  id?: string;
  ruleId?: string;
  type: "error" | "warning" | "suggestion" | "info";
  message: string;
  nodeId?: NodeId;
  edgeId?: EdgeId;
  targets?: {
    nodes?: NodeId[];
    edges?: EdgeId[];
    lane?: { row: number; col: number };
  };
  fixes?: Fix[];
  detail?: string;
}

/** 検証結果 */
export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

export type RuleSeverity = "error" | "warning" | "suggestion";

export interface Fix {
  id: string;
  label: string;
  apply: (doc: FlowDoc) => FlowDoc;
  priority?: number;
}

export interface RuleResult {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  targets: {
    nodes?: NodeId[];
    edges?: EdgeId[];
    lane?: { row: number; col: number };
  };
  fixes?: Fix[];
  detail?: string;
}

export interface RuleContext {
  doc: FlowDoc;
  utils: {
    isAncestor: (a: NodeId, b: NodeId) => boolean;
    createsCycleIfAdd: (e: EdgeData) => boolean;
    outgoing: (id: NodeId) => EdgeData[];
    incoming: (id: NodeId) => EdgeData[];
    byLane: (row: number, col: number) => NodeData[];
    clone: <T>(x: T) => T;
  };
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severityDefault: RuleSeverity;
  appliesToModes?: ("roadmap" | "free")[];
  check: (ctx: RuleContext) => RuleResult[];
}

export interface RulePack {
  id: string;
  name: string;
  version: string;
  rules: Rule[];
  defaultEnabled?: string[];
}

export interface RuleRuntimeSetting {
  enabled: boolean;
  severity: RuleSeverity;
  priorityBias: number;
}

export interface UIFlags {
  improveHighlight: boolean;
  smartAddAutoConnect: boolean;
}

export type ValidationLevel = "info" | "warning" | "error";

export interface ValidationCounts {
  error: number;
  warning: number;
  info: number;
  total: number;
}

export interface ValidationBadgeSettings {
  visibility: "auto" | "always" | "hidden";
  threshold?: {
    minCount?: number;
    minLevel?: ValidationLevel;
  };
}

export type SuggestionItem = {
  id: string;
  title: string;
  message: string;
  severity: "error" | "warning" | "suggestion";
  fixes?: Fix[];
  targets: {
    nodes?: string[];
    edges?: string[];
    lane?: { row: number; col: number };
  };
};

export type AnalysisMetrics = {
  nodeCount: number;
  edgeCount: number;
  approvalDepthMax: number;
  approvalDepthAvg: number;
  loopRatio: number;
  backflowCount: number;
  laneDistribution: { name: string; count: number; ratio: number }[];
  bottlenecks: { nodeId: string; reason: string }[];
};

export type RuleRuntimeSettings = Record<string, RuleRuntimeSetting>;

export interface FixDecisionStat {
  accepted: number;
  rejected: number;
}

export type FixDecisionHistory = Record<string, FixDecisionStat>;

export interface PatchHistoryItem {
  id: string;
  timestamp: number;
  mode: "single" | "bulk";
  summary: string;
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
