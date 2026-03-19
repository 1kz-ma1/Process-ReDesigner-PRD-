import type { BlockType } from "./types";

export const blockCatalog: Array<{ type: BlockType; label: string }> = [
  { type: "Input", label: "入力" },
  { type: "Validate", label: "検証" },
  { type: "Approve", label: "承認" },
  { type: "Handoff", label: "引き継ぎ" },
  { type: "Transform", label: "変換" },
  { type: "Notify", label: "通知" },
  { type: "Store", label: "保管" },
  { type: "Review", label: "レビュー" },
  { type: "Decision", label: "分岐" },
  { type: "Complete", label: "完了" }
];

export function defaultMeta(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "Input":
      return { fields: [{ name: "requestId", type: "string", required: true }], ownerRole: "Staff", estMin: 10 };
    case "Validate":
      return { rules: ["required", "format"], ownerRole: "Staff", estMin: 8, autoFix: false };
    case "Approve":
      return { approverRole: "Manager", levels: 1, SLAmin: 60 };
    case "Handoff":
      return { fromRole: "Staff", toRole: "Manager", artifactRefs: ["ticket"], SLAmin: 20 };
    case "Transform":
      return { inputFields: [], outputFields: [], logicRef: "", batchable: true, estMin: 6 };
    case "Notify":
      return { targets: ["Manager"], channel: "mail", timing: "event", estMin: 2 };
    case "Store":
      return { repository: "DB", schemaRef: "main", retention: "365d", estMin: 2 };
    case "Review":
      return { reviewerRole: "Leader", criteria: ["quality"], SLAmin: 30 };
    case "Decision":
      return { conditions: [], ownerRole: "Manager" };
    case "Complete":
      return { successCriteria: ["done"] };
    default:
      return {};
  }
}
