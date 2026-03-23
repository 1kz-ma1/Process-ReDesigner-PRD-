import type { Block, Suggestion } from "../models/types";

export function summarizeSuggestionImpact(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return "改善提案はありません。";
  }

  const critical = suggestions.filter((s) => s.severity === "critical").length;
  const warn = suggestions.filter((s) => s.severity === "warn").length;
  const info = suggestions.filter((s) => s.severity === "info").length;

  return `critical:${critical} / warn:${warn} / info:${info}`;
}

export function getDefaultMetaByType(type: Block["type"]): Record<string, unknown> {
  const defaults: Record<Block["type"], Record<string, unknown>> = {
    Input: { fields: [{ name: "requestId", type: "string", required: true }], ownerRole: "Staff", estMin: 10 },
    Validate: { rules: ["required", "format"], ownerRole: "Staff", estMin: 8, autoFix: false },
    Approve: { approverRole: "Manager", levels: 1, SLAmin: 60 },
    Handoff: { fromRole: "Staff", toRole: "Manager", artifactRefs: ["ticket"], SLAmin: 20 },
    Transform: { inputFields: [], outputFields: [], logicRef: "", batchable: true },
    Notify: { targets: ["Manager"], channel: "mail", timing: "event" },
    Store: { repository: "DB", schemaRef: "default", retention: "365d" },
    Review: { reviewerRole: "Leader", criteria: ["quality"], SLAmin: 30 },
    Decision: { conditions: [], ownerRole: "Manager" },
    Complete: { successCriteria: ["done"] }
  };
  return defaults[type];
}
