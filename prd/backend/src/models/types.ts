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

export type Severity = "info" | "warn" | "critical";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  ownerUserId?: string;
  version: number;
  status: "draft" | "active" | "archived";
  targetSLAmin?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  flowId: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  flowId: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;
  condition?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Suggestion {
  id: string;
  flowId: string;
  ruleCode: string;
  severity: Severity;
  summary: string;
  detail: string;
  fixPlan: {
    action: "UPDATE_BLOCK_META" | "DELETE_BLOCK" | "INSERT_BLOCK" | "MERGE_BLOCKS";
    blockIds?: string[];
    targetBlockId?: string;
    payload?: Record<string, unknown>;
  };
  createdAt: string;
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

export interface DataStore {
  users: User[];
  flows: Flow[];
  blocks: Block[];
  edges: Edge[];
  suggestions: Suggestion[];
  iterations: Iteration[];
}
