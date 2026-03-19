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
