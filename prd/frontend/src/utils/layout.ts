/**
 * 自動整列・レイアウト計算
 * DAG を仮定し、トポロジカルソート後に各レイヤーに配置
 */

import type { FlowDoc, NodeData, EdgeData, NodeId } from "../models/types";
import { designTokens } from "./designTokens";

/**
 * ロードマップ用：トポロジカルソート + セルへの自動配置
 * 列は DAG フロー順、行は衝突回避
 */
export function autoLayoutRoadmap(doc: FlowDoc): FlowDoc {
  const laneConfig = doc.lanes ?? doc.laneConfig;
  if (!laneConfig) return doc;

  const cols = laneConfig.cols;
  const rows = laneConfig.rows;

  // グラフ構築（ループ除外）
  const adjList = new Map<NodeId, NodeId[]>();
  for (const node of doc.nodes) {
    adjList.set(node.id, []);
  }

  for (const edge of doc.edges) {
    if (edge.kind === "loop") continue;
    const targets = adjList.get(edge.source) ?? [];
    targets.push(edge.target);
    adjList.set(edge.source, targets);
  }

  // トポロジカルソート（Kahn のアルゴリズム）
  const inDegree = new Map<NodeId, number>();
  for (const node of doc.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const [, targets] of adjList) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  const queue: NodeId[] = [];
  for (const node of doc.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const sorted: NodeId[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    const targets = adjList.get(nodeId) ?? [];
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
      if ((inDegree.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    }
  }

  // 層別レイアウト（各ノードを列に割り当て）
  const layers = new Map<NodeId, number>();
  for (const nodeId of sorted) {
    let maxLevel = 0;
    const sourceIds = doc.edges
      .filter((e) => e.target === nodeId && e.kind !== "loop")
      .map((e) => e.source);

    for (const sourceId of sourceIds) {
      maxLevel = Math.max(maxLevel, layers.get(sourceId) ?? 0);
    }
    layers.set(nodeId, maxLevel + 1);
  }

  // 列優先：lane.col が既にあるものは尊重し、同列は topo 順で indexInCell を振り直す
  const topoIndex = new Map<NodeId, number>();
  sorted.forEach((id, idx) => topoIndex.set(id, idx));

  const colBuckets = new Map<number, NodeData[]>();
  for (const node of doc.nodes) {
    const layer = layers.get(node.id) ?? 0;
    const col = Math.min(node.lane?.col ?? layer, cols.length - 1);
    const arr = colBuckets.get(col) ?? [];
    arr.push(node);
    colBuckets.set(col, arr);
  }

  const newDoc = structuredClone(doc);
  for (const [col, list] of colBuckets.entries()) {
    list.sort((a, b) => (topoIndex.get(a.id) ?? 0) - (topoIndex.get(b.id) ?? 0));
    const rowStacks = new Map<number, number>();
    for (const original of list) {
      const node = newDoc.nodes.find((n) => n.id === original.id);
      if (!node) continue;
      const row = Math.min(original.lane?.row ?? 0, rows.length - 1);
      const stack = rowStacks.get(row) ?? 0;
      rowStacks.set(row, stack + 1);
      node.lane = { row, col };
      node.indexInCell = stack;
      node.position = {
        x: col * 220 + 110,
        y: row * 120 + 60 + stack * 20,
      };
    }
  }

  return newDoc;
}

/**
 * 自由配置用：簡単な層別レイアウト（DAG 向け）
 * ループは同層扱いで背面にルーティング
 */
export function autoLayoutFree(doc: FlowDoc): FlowDoc {
  // グラフ構築
  const adjList = new Map<NodeId, NodeId[]>();
  for (const node of doc.nodes) {
    adjList.set(node.id, []);
  }

  for (const edge of doc.edges) {
    if (edge.kind === "loop") continue;
    const targets = adjList.get(edge.source) ?? [];
    targets.push(edge.target);
    adjList.set(edge.source, targets);
  }

  // DAG向けの簡易層別
  const inDegree = new Map<NodeId, number>();
  for (const node of doc.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const [, targets] of adjList) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  const queue: NodeId[] = [];
  for (const node of doc.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const sorted: NodeId[] = [];
  const layerMap = new Map<NodeId, number>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);
    const baseLayer = layerMap.get(nodeId) ?? 0;

    const targets = adjList.get(nodeId) ?? [];
    for (const target of targets) {
      layerMap.set(target, Math.max(layerMap.get(target) ?? 0, baseLayer + 1));
      inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
      if ((inDegree.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    }
  }

  // 層別レイアウト（x 座標）
  for (const nodeId of sorted) {
    if (!layerMap.has(nodeId)) {
      layerMap.set(nodeId, 0);
    }
  }

  // y 座標は同層内で適当に分散
  const layerNodes = new Map<number, NodeId[]>();
  for (const nodeId of sorted) {
    const layer = layerMap.get(nodeId) ?? 0;
    const nodes = layerNodes.get(layer) ?? [];
    nodes.push(nodeId);
    layerNodes.set(layer, nodes);
  }

  const newDoc = structuredClone(doc);
  for (const [layer, nodeIds] of layerNodes) {
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const node = newDoc.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.position = {
          x: layer * 260 + 80,
          y: i * 130 + 80,
        };
      }
    }
  }

  return newDoc;
}

/**
 * 指定モードに応じた自動整列
 */
export function autoLayout(doc: FlowDoc): FlowDoc {
  if (doc.mode === "roadmap") {
    return autoLayoutRoadmap(doc);
  } else {
    return autoLayoutFree(doc);
  }
}
