import type { FlowDoc, NodeData } from "../models/types";
import { generateEdgeId, generateNodeId } from "./id";
import type { TemplateDoc } from "../templates";

const CELL_WIDTH = 220;
const CELL_HEIGHT = 120;
const CELL_PADDING = 20;

function norm(value: string): string {
  return value.trim();
}

function laneToPosition(row: number, col: number, indexInCell = 0) {
  return {
    x: col * CELL_WIDTH + CELL_WIDTH / 2,
    y: row * CELL_HEIGHT + CELL_HEIGHT / 2 + indexInCell * CELL_PADDING,
  };
}

function countInCell(nodes: NodeData[], row: number, col: number): number {
  return nodes.filter((n) => n.lane?.row === row && n.lane?.col === col).length;
}

export function replaceWithTemplate(template: TemplateDoc): FlowDoc {
  const defaultLaneId = "lane-default";
  const nodes = template.nodes.map((n) => {
    const row = n.lane?.row ?? 0;
    const col = n.lane?.col ?? 0;
    const idx = n.indexInCell ?? 0;
    return {
      ...structuredClone(n),
      id: generateNodeId(),
      laneId: defaultLaneId,
      lane: { row, col },
      indexInCell: idx,
      meta: structuredClone(n.meta ?? {}),
      position: laneToPosition(row, col, idx),
    };
  });

  const oldToNew = new Map<string, string>();
  template.nodes.forEach((n, i) => oldToNew.set(n.id, nodes[i].id));

  const edges = template.edges.map((e) => ({
    ...structuredClone(e),
    id: generateEdgeId(),
    source: oldToNew.get(e.source) ?? e.source,
    target: oldToNew.get(e.target) ?? e.target,
  }));

  return {
    mode: "roadmap",
    nodes,
    edges,
    systemLanes: [
      { laneId: defaultLaneId, name: "メインシステム", systemType: "custom" },
    ],
    laneConnections: [],
    lanes: structuredClone(template.lanes),
    laneConfig: structuredClone(template.lanes),
    viewport: { x: 0, y: 0, zoom: 1 },
    version: template.version,
  };
}

export function mergeWithTemplate(current: FlowDoc, template: TemplateDoc): FlowDoc {
  const currentRows = (current.lanes?.rows ?? current.laneConfig?.rows ?? []).map(norm);
  const currentCols = (current.lanes?.cols ?? current.laneConfig?.cols ?? []).map(norm);
  const nextRows = [...currentRows];
  const nextCols = [...currentCols];

  for (const row of template.lanes.rows) {
    const v = norm(row);
    if (!nextRows.includes(v)) {
      nextRows.push(v);
    }
  }
  for (const col of template.lanes.cols) {
    const v = norm(col);
    if (!nextCols.includes(v)) {
      nextCols.push(v);
    }
  }

  const rowMap = new Map<number, number>();
  const colMap = new Map<number, number>();
  template.lanes.rows.forEach((r, i) => rowMap.set(i, nextRows.indexOf(norm(r))));
  template.lanes.cols.forEach((c, i) => colMap.set(i, nextCols.indexOf(norm(c))));

  const nodes = structuredClone(current.nodes);
  const fallbackLaneId = current.systemLanes?.[0]?.laneId ?? "lane-default";
  const idMap = new Map<string, string>();

  for (const node of template.nodes) {
    const mappedRow = rowMap.get(node.lane?.row ?? 0) ?? 0;
    const mappedCol = colMap.get(node.lane?.col ?? 0) ?? 0;
    const newId = generateNodeId();
    const idx = countInCell(nodes, mappedRow, mappedCol);

    nodes.push({
      ...structuredClone(node),
      id: newId,
      laneId: node.laneId ?? fallbackLaneId,
      lane: { row: mappedRow, col: mappedCol },
      indexInCell: idx,
      meta: structuredClone(node.meta ?? {}),
      position: laneToPosition(mappedRow, mappedCol, idx),
    });

    idMap.set(node.id, newId);
  }

  const edges = [...structuredClone(current.edges)];
  for (const edge of template.edges) {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) {
      throw new Error(`テンプレマージ失敗: edge(${edge.id}) の参照ノードが解決できません`);
    }

    edges.push({
      ...structuredClone(edge),
      id: generateEdgeId(),
      source,
      target,
    });
  }

  return {
    ...structuredClone(current),
    mode: "roadmap",
    nodes,
    edges,
    systemLanes: current.systemLanes ?? [{ laneId: fallbackLaneId, name: "メインシステム", systemType: "custom" }],
    laneConnections: current.laneConnections ?? [],
    lanes: { rows: nextRows, cols: nextCols },
    laneConfig: { rows: nextRows, cols: nextCols },
    viewport: current.viewport ?? { x: 0, y: 0, zoom: 1 },
    version: current.version ?? "v1",
  };
}
