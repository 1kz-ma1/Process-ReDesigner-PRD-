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

export interface Flow {
  id: string;
  name: string;
  description?: string;
  version: number;
  blocks: Block[];
  edges: Edge[];
}

export interface Block {
  id: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  meta: Record<string, unknown>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

export interface Suggestion {
  id: string;
  rule_code: string;
  severity: Severity;
  summary: string;
  detail: string;
  fix_plan: {
    action: "MERGE" | "DELETE" | "INSERT_AUTOMATION" | "UPDATE_META";
    targetBlockIds?: string[];
    payload?: Record<string, unknown>;
  };
}

export interface Iteration {
  id: string;
  createdAt: string;
  note?: string;
  snapshot: Flow;
}

export interface PersistedRoot {
  schemaVersion: number;
  flow: Flow;
  iterations: Iteration[];
}
