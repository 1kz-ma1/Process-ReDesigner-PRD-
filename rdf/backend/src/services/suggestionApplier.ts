import { v4 as uuidv4 } from "uuid";
import type { Block, Edge, Flow, Suggestion } from "../models/types.js";

export function applySuggestion(params: {
  suggestion: Suggestion;
  flow: Flow;
  blocks: Block[];
  edges: Edge[];
}): { blocks: Block[]; edges: Edge[] } {
  const { suggestion, flow } = params;
  let blocks = [...params.blocks];
  let edges = [...params.edges];

  if (suggestion.fixPlan.action === "UPDATE_BLOCK_META" && suggestion.fixPlan.targetBlockId) {
    blocks = blocks.map((b) => {
      if (b.id !== suggestion.fixPlan.targetBlockId) return b;
      return {
        ...b,
        meta: {
          ...b.meta,
          ...(suggestion.fixPlan.payload ?? {})
        },
        updatedAt: new Date().toISOString()
      };
    });
  }

  if (suggestion.fixPlan.action === "DELETE_BLOCK" && suggestion.fixPlan.targetBlockId) {
    const targetId = suggestion.fixPlan.targetBlockId;
    const incoming = edges.filter((e) => e.toBlockId === targetId);
    const outgoing = edges.filter((e) => e.fromBlockId === targetId);

    blocks = blocks.filter((b) => b.id !== targetId);
    edges = edges.filter((e) => e.toBlockId !== targetId && e.fromBlockId !== targetId);

    if (incoming[0] && outgoing[0]) {
      edges.push({
        id: uuidv4(),
        flowId: flow.id,
        fromBlockId: incoming[0].fromBlockId,
        toBlockId: outgoing[0].toBlockId,
        label: "auto-reconnect",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  if (suggestion.fixPlan.action === "INSERT_BLOCK") {
    const payload = suggestion.fixPlan.payload ?? {};
    const newBlock: Block = {
      id: uuidv4(),
      flowId: flow.id,
      type: String(payload.type ?? "Transform") as Block["type"],
      name: String(payload.name ?? "Automation Step"),
      x: Number(payload.x ?? 240),
      y: Number(payload.y ?? 240),
      meta: payload.meta as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    blocks.push(newBlock);

    if (suggestion.fixPlan.targetBlockId) {
      edges.push({
        id: uuidv4(),
        flowId: flow.id,
        fromBlockId: suggestion.fixPlan.targetBlockId,
        toBlockId: newBlock.id,
        label: "auto-insert",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  if (suggestion.fixPlan.action === "MERGE_BLOCKS" && suggestion.fixPlan.blockIds?.length) {
    const mergeIds = new Set(suggestion.fixPlan.blockIds);
    const keep = blocks.find((b) => mergeIds.has(b.id));
    if (keep) {
      blocks = blocks.filter((b) => !mergeIds.has(b.id) || b.id === keep.id);
      edges = edges.filter((e) => !mergeIds.has(e.fromBlockId) && !mergeIds.has(e.toBlockId));
      keep.name = `${keep.name} (Merged)`;
      keep.updatedAt = new Date().toISOString();
    }
  }

  return { blocks, edges };
}
