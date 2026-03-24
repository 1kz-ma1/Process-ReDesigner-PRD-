import { defaultMeta } from "./blockCatalog";
import type { Flow, PersistedRoot } from "./types";

const baseFlow: Flow = {
  id: crypto.randomUUID(),
  name: "経費申請フロー（サンプル）",
  description: "最小MVP確認用",
  version: 1,
  blocks: [
    { id: crypto.randomUUID(), type: "Input", name: "Input（入力）", x: 100, y: 80, meta: defaultMeta("Input") },
    { id: crypto.randomUUID(), type: "Validate", name: "Validate（検証）", x: 340, y: 80, meta: defaultMeta("Validate") },
    { id: crypto.randomUUID(), type: "Approve", name: "Approve（承認）", x: 620, y: 80, meta: { ...defaultMeta("Approve"), levels: 3 } },
    { id: crypto.randomUUID(), type: "Complete", name: "Complete（完了）", x: 880, y: 80, meta: defaultMeta("Complete") }
  ],
  edges: []
};

baseFlow.edges = [
  { id: crypto.randomUUID(), from: baseFlow.blocks[0].id, to: baseFlow.blocks[1].id, label: "入力完了" },
  { id: crypto.randomUUID(), from: baseFlow.blocks[1].id, to: baseFlow.blocks[2].id, label: "検証OK" },
  { id: crypto.randomUUID(), from: baseFlow.blocks[2].id, to: baseFlow.blocks[3].id, label: "承認" }
];

export const initialRoot: PersistedRoot = {
  schemaVersion: 1,
  flow: baseFlow,
  iterations: []
};
