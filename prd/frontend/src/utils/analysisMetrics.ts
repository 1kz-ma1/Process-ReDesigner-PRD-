import type { AnalysisMetrics, FlowDoc, NodeData, NodeId } from "../models/types";

function outCount(doc: FlowDoc, nodeId: NodeId): number {
  return doc.edges.filter((e) => e.source === nodeId && e.kind !== "loop").length;
}

function inCount(doc: FlowDoc, nodeId: NodeId): number {
  return doc.edges.filter((e) => e.target === nodeId && e.kind !== "loop").length;
}

function laneName(doc: FlowDoc, row: number): string {
  const rows = doc.lanes?.rows ?? doc.laneConfig?.rows ?? [];
  return rows[row] ?? `Lane ${row + 1}`;
}

function systemLaneName(doc: FlowDoc, laneId: string): string {
  return doc.systemLanes?.find((lane) => lane.laneId === laneId)?.name ?? laneId;
}

function isApproval(node: NodeData): boolean {
  const cat = typeof node.meta?.category === "string" ? node.meta.category : "";
  return cat.includes("承認") || node.name.includes("承認");
}

export function calcAnalysisMetrics(doc: FlowDoc, backflowCount: number): AnalysisMetrics {
  const nodeCount = doc.nodes.length;
  const edgeCount = doc.edges.length;
  const approvalNodes = doc.nodes.filter(isApproval);

  const approvalDepths = approvalNodes.map((n) => {
    if (doc.mode === "roadmap") {
      return n.lane?.col ?? 0;
    }
    return Math.round((n.position?.x ?? 0) / 220);
  });

  const approvalDepthMax = approvalDepths.length > 0 ? Math.max(...approvalDepths) : 0;
  const approvalDepthAvg = approvalDepths.length > 0
    ? approvalDepths.reduce((a, b) => a + b, 0) / approvalDepths.length
    : 0;

  const loopEdgeCount = doc.edges.filter((e) => e.kind === "loop").length;
  const loopRatio = edgeCount === 0 ? 0 : loopEdgeCount / edgeCount;

  const laneDistribution = (() => {
    if ((doc.systemLanes?.length ?? 0) > 0) {
      const laneBuckets = new Map<string, number>();
      for (const node of doc.nodes) {
        const laneId = node.laneId ?? doc.systemLanes?.[0]?.laneId;
        if (!laneId) continue;
        laneBuckets.set(laneId, (laneBuckets.get(laneId) ?? 0) + 1);
      }
      return [...laneBuckets.entries()].map(([laneId, count]) => ({
        name: systemLaneName(doc, laneId),
        count,
        ratio: nodeCount === 0 ? 0 : count / nodeCount,
      }));
    }

    const laneBuckets = new Map<number, number>();
    for (const node of doc.nodes) {
      const row = node.lane?.row ?? 0;
      laneBuckets.set(row, (laneBuckets.get(row) ?? 0) + 1);
    }

    return [...laneBuckets.entries()].map(([row, count]) => ({
      name: laneName(doc, row),
      count,
      ratio: nodeCount === 0 ? 0 : count / nodeCount,
    }));
  })();

  const bottlenecks = doc.nodes
    .map((node) => {
      const incoming = inCount(doc, node.id);
      const outgoing = outCount(doc, node.id);
      const score = incoming * 2 + outgoing;
      return { nodeId: node.id, score, reason: `入:${incoming} 出:${outgoing}` };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => ({ nodeId: x.nodeId, reason: x.reason }));

  return {
    nodeCount,
    edgeCount,
    approvalDepthMax,
    approvalDepthAvg,
    loopRatio,
    backflowCount,
    laneDistribution,
    bottlenecks,
  };
}
