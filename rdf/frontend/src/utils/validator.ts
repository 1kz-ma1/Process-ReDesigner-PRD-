/**
 * バリデーション：ビジネスロジックの正確性をチェック
 */

import type { FlowDoc, ValidationResult, ValidationMessage, NodeId, EdgeId } from "../models/types";

/** バリデーションルール関数型 */
type ValidationRule = (doc: FlowDoc) => ValidationMessage[];

/**
 * バリデーション 1：参照整合
 * 存在しないノードを指すエッジが無い
 */
function checkReferenceIntegrity(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const nodeIds = new Set(doc.nodes.map((n) => n.id));

  for (const edge of doc.edges) {
    if (!nodeIds.has(edge.source)) {
      messages.push({
        type: "error",
        message: `エッジ (${edge.id.slice(0, 8)}) の送信元ノード (${edge.source.slice(0, 8)}) が見つかりません`,
        edgeId: edge.id,
      });
    }
    if (!nodeIds.has(edge.target)) {
      messages.push({
        type: "error",
        message: `エッジ (${edge.id.slice(0, 8)}) の終端ノード (${edge.target.slice(0, 8)}) が見つかりません`,
        edgeId: edge.id,
      });
    }
  }

  return messages;
}

/**
 * バリデーション 2：サイクル検知
 * kind !== "loop" のサイクルが無い
 */
function checkCycles(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // 今回は簡単な DFS でサイクルを検知（ループを除外）
  const normalEdges = doc.edges.filter((e) => e.kind !== "loop");
  const adjList = new Map<NodeId, NodeId[]>();

  for (const node of doc.nodes) {
    adjList.set(node.id, []);
  }

  for (const edge of normalEdges) {
    const neighbors = adjList.get(edge.source) ?? [];
    neighbors.push(edge.target);
    adjList.set(edge.source, neighbors);
  }

  // DFS でサイクル検知
  const visited = new Set<NodeId>();
  const recStack = new Set<NodeId>();

  function hasCycle(nodeId: NodeId, path: NodeId[] = []): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjList.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, [...path, nodeId])) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        // サイクル検出
        messages.push({
          type: "error",
          message: `サイクルが検出されました：${nodeId.slice(0, 8)} → ${neighbor.slice(0, 8)}`,
          nodeId,
        });
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of doc.nodes.map((n) => n.id)) {
    if (!visited.has(nodeId)) {
      hasCycle(nodeId);
    }
  }

  return messages;
}

/**
 * バリデーション 3：条件分岐ノードの制約
 * condition ノードは外向きエッジがちょうど2本、ラベルは重複禁止
 */
function checkConditionEdges(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // condition ノードを列挙
  const conditionNodes = doc.nodes.filter((n) => n.type === "condition");

  for (const node of conditionNodes) {
    const outEdges = doc.edges.filter((e) => e.source === node.id);

    if (outEdges.length < 2) {
      messages.push({
        type: "error",
        message: `分岐ノード "${node.name}" の外向きエッジが ${outEdges.length} 本です。2本必要です。`,
        nodeId: node.id,
      });
    } else if (outEdges.length > 2) {
      messages.push({
        type: "error",
        message: `分岐ノード "${node.name}" の外向きエッジが ${outEdges.length} 本です。最大2本です。`,
        nodeId: node.id,
      });
    }

    // ラベル重複チェック
    const labels = outEdges.map((e) => e.label ?? "");
    if (new Set(labels).size !== labels.length) {
      messages.push({
        type: "error",
        message: `分岐ノード "${node.name}" のエッジラベルが重複しています。`,
        nodeId: node.id,
      });
    }
  }

  return messages;
}

/**
 * バリデーション 4：ロードマップでの列逆流チェック
 * mode === "roadmap" かつ、エッジの col が逆方向（左向き）は警告
 */
function checkRoadmapFlow(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  if (doc.mode !== "roadmap" || !doc.laneConfig) {
    return messages;
  }

  const colCount = doc.laneConfig.cols.length;

  for (const edge of doc.edges) {
    if (edge.kind === "loop") continue; // ループは除外

    const sourceNode = doc.nodes.find((n) => n.id === edge.source);
    const targetNode = doc.nodes.find((n) => n.id === edge.target);

    if (!sourceNode?.lane || !targetNode?.lane) continue;

    const sourceCol = sourceNode.lane.col;
    const targetCol = targetNode.lane.col;

    if (targetCol < sourceCol) {
      messages.push({
        type: "warning",
        message: `ロードマップで列の逆流があります：${sourceNode.name} → ${targetNode.name}`,
        nodeId: edge.source,
      });
    }
  }

  return messages;
}

/**
 * バリデーション 5：孤立ノード警告
 * 接続されていないノード（接続なし）
 */
function checkIsolatedNodes(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  const connectedNodeIds = new Set<NodeId>();
  for (const edge of doc.edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  for (const node of doc.nodes) {
    if (!connectedNodeIds.has(node.id)) {
      messages.push({
        type: "warning",
        message: `ブロック "${node.name}" は接続されていません。`,
        nodeId: node.id,
      });
    }
  }

  return messages;
}

/**
 * バリデーション 6：JSON meta 構文チェック（パース可能か）
 * 右パネルが呼ぶが、ここにも入れておく
 */
function checkMetaJson(doc: FlowDoc): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // NOTE: meta はすでに JSON オブジェクト化されている前提だが、
  // UI編集時のパース失敗はProprtyPanelで捕捉する
  // ここではスキップ可能

  return messages;
}

/**
 * すべてのルールを実行
 */
const rules: ValidationRule[] = [
  checkReferenceIntegrity,
  checkCycles,
  checkConditionEdges,
  checkRoadmapFlow,
  checkIsolatedNodes,
  checkMetaJson,
];

/**
 * バリデーション実行
 */
export function validateFlow(doc: FlowDoc): ValidationResult {
  const allMessages: ValidationMessage[] = [];

  for (const rule of rules) {
    const messages = rule(doc);
    allMessages.push(...messages);
  }

  const errors = allMessages.filter((m) => m.type === "error");
  const valid = errors.length === 0;

  return {
    valid,
    messages: allMessages,
  };
}

/**
 * エラーメッセージをユーザーフレンドリーに整形
 */
export function formatValidationMessages(messages: ValidationMessage[]): string[] {
  return messages.map((m) => {
    const prefix = m.type === "error" ? "❌" : m.type === "warning" ? "⚠️" : "ℹ️";
    return `${prefix} ${m.message}`;
  });
}
