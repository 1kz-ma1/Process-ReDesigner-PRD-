import type { FlowDoc, NodeData } from "../models/types";

type SmartCandidate = {
  type: "task" | "condition";
  name: string;
  category: string;
};

function hasInputNearby(doc: FlowDoc, col: number): boolean {
  return doc.nodes.some((n) => {
    const cat = typeof n.meta?.category === "string" ? n.meta.category : "";
    return (cat.includes("入力") || n.name.includes("入力")) && (n.lane?.col ?? -99) === col - 1;
  });
}

export function recommendBlocks(doc: FlowDoc, row: number, col: number): SmartCandidate[] {
  const picks: SmartCandidate[] = [];

  if (col === 0) {
    picks.push({ type: "task", name: "申請情報の入力", category: "入力" });
  }
  if (hasInputNearby(doc, col)) {
    picks.push({ type: "task", name: "入力内容の検証", category: "検証" });
  }

  picks.push({ type: "task", name: "承認", category: "承認" });
  picks.push({ type: "task", name: "通知", category: "通知" });
  picks.push({ type: "task", name: "保管", category: "保管" });
  picks.push({ type: "condition", name: "条件分岐", category: "条件" });

  const seen = new Set<string>();
  return picks.filter((p) => {
    const key = `${p.type}:${p.category}:${p.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

export type { SmartCandidate };
