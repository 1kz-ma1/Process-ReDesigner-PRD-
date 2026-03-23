import { v4 as uuidv4 } from "uuid";
import type { Block, Edge, Flow, Suggestion, User } from "../models/types.js";

function getOutgoing(blockId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.fromBlockId === blockId);
}

function getIncoming(blockId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.toBlockId === blockId);
}

function getBlockDuration(block: Block): number {
  const estMin = Number(block.meta.estMin ?? 0);
  const slaMin = Number(block.meta.SLAmin ?? 0);
  return Math.max(estMin, slaMin, 0);
}

function listRoles(users: User[]): Set<string> {
  return new Set(users.map((u) => u.role));
}

export function analyzeFlow(params: {
  flow: Flow;
  blocks: Block[];
  edges: Edge[];
  users: User[];
}): Suggestion[] {
  const { flow, blocks, edges, users } = params;
  const suggestions: Suggestion[] = [];
  const now = new Date().toISOString();

  const pushSuggestion = (
    ruleCode: string,
    severity: Suggestion["severity"],
    summary: string,
    detail: string,
    fixPlan: Suggestion["fixPlan"]
  ) => {
    suggestions.push({
      id: uuidv4(),
      flowId: flow.id,
      ruleCode,
      severity,
      summary,
      detail,
      fixPlan,
      createdAt: now
    });
  };

  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const approveBlocks = blocks.filter((b) => b.type === "Approve");
  for (const block of approveBlocks) {
    const levels = Number(block.meta.levels ?? 1);
    if (levels >= 3) {
      pushSuggestion(
        "APPROVAL_OVERLOAD",
        "warn",
        "承認階層が深すぎます",
        `${block.name} の承認段数が ${levels} 段です。`,
        {
          action: "UPDATE_BLOCK_META",
          targetBlockId: block.id,
          payload: { levels: 2 }
        }
      );
    }
  }

  for (const edge of edges) {
    const first = blockById.get(edge.fromBlockId);
    const second = blockById.get(edge.toBlockId);
    if (!first || !second || first.type !== "Approve" || second.type !== "Approve") {
      continue;
    }
    const thirdCandidates = getOutgoing(second.id, edges)
      .map((e) => blockById.get(e.toBlockId))
      .filter((b): b is Block => Boolean(b));
    if (thirdCandidates.some((b) => b.type === "Approve")) {
      pushSuggestion(
        "APPROVAL_CHAIN",
        "warn",
        "承認が連続しています",
        "Approve が3連続になっている経路があります。承認圧縮を検討してください。",
        {
          action: "MERGE_BLOCKS",
          blockIds: [first.id, second.id]
        }
      );
      break;
    }
  }

  const inputBlocks = blocks.filter((b) => b.type === "Input");
  const seenFields = new Map<string, string>();
  for (const block of inputBlocks) {
    const fields = Array.isArray(block.meta.fields) ? (block.meta.fields as Array<{ name?: string }>) : [];
    for (const field of fields) {
      if (!field?.name) continue;
      if (seenFields.has(field.name)) {
        pushSuggestion(
          "DUPLICATE_INPUT",
          "warn",
          "入力項目が重複しています",
          `項目 ${field.name} が複数の入力工程で再入力されています。`,
          {
            action: "MERGE_BLOCKS",
            blockIds: [seenFields.get(field.name)!, block.id]
          }
        );
      } else {
        seenFields.set(field.name, block.id);
      }
    }
  }

  for (const edge of edges) {
    const current = blockById.get(edge.fromBlockId);
    const next = blockById.get(edge.toBlockId);
    if (!current || !next) continue;
    if ((current.type === "Review" || current.type === "Approve") && next.type === "Input") {
      const fields = Array.isArray(next.meta.fields) ? (next.meta.fields as Array<{ required?: boolean }>) : [];
      if (fields.some((f) => f.required)) {
        pushSuggestion(
          "REWORK_RISK",
          "critical",
          "手戻りリスクがあります",
          `${current.name} の直後に必須入力があり、再作業が発生しやすい構成です。`,
          {
            action: "UPDATE_BLOCK_META",
            targetBlockId: next.id,
            payload: { moveRequiredFieldsToEarlyStage: true }
          }
        );
      }
    }
  }

  const notifyCount = blocks.filter((b) => b.type === "Notify").length;
  if (notifyCount >= 3) {
    pushSuggestion(
      "NOTIFY_SPAM",
      "warn",
      "通知が多すぎます",
      `通知ノードが ${notifyCount} 件あります。集約や自動通知化を検討してください。`,
      {
        action: "UPDATE_BLOCK_META",
        payload: { aggregateNotifications: true }
      }
    );
  }

  for (const edge of edges) {
    const a = blockById.get(edge.fromBlockId);
    const b = blockById.get(edge.toBlockId);
    if (!a || !b || a.type !== "Handoff" || b.type !== "Handoff") continue;
    pushSuggestion(
      "HANDOFF_BOTTLENECK",
      "warn",
      "引き継ぎが連続しています",
      "Handoff が連続しており、責任境界の再設計が必要です。",
      {
        action: "MERGE_BLOCKS",
        blockIds: [a.id, b.id]
      }
    );
    break;
  }

  const targetSLA = Number(flow.targetSLAmin ?? 240);
  const totalDuration = blocks.reduce((acc, b) => acc + getBlockDuration(b), 0);
  if (totalDuration > targetSLA) {
    pushSuggestion(
      "SLA_EXCEED",
      "critical",
      "想定SLAを超過しています",
      `累計所要時間 ${totalDuration} 分が目標 ${targetSLA} 分を上回っています。`,
      {
        action: "INSERT_BLOCK",
        payload: { type: "Transform", name: "Automation Candidate", meta: { batchable: true } }
      }
    );
  }

  const knownRoles = listRoles(users);
  for (const block of blocks) {
    const ownerRole = String(block.meta.ownerRole ?? "");
    if (ownerRole && !knownRoles.has(ownerRole)) {
      pushSuggestion(
        "ROLE_MISMATCH",
        "critical",
        "存在しないロールが指定されています",
        `${block.name} の ownerRole=${ownerRole} は users に存在しません。`,
        {
          action: "UPDATE_BLOCK_META",
          targetBlockId: block.id,
          payload: { ownerRole: "Manager" }
        }
      );
    }
  }

  for (const block of blocks) {
    if (block.type !== "Transform" && block.type !== "Notify" && block.type !== "Store") {
      continue;
    }
    const batchable = Boolean(block.meta.batchable);
    const channel = String(block.meta.channel ?? "");
    if (batchable || channel === "webhook") {
      pushSuggestion(
        "AUTOMATION_CANDIDATE",
        "info",
        "自動化候補があります",
        `${block.name} は自動化との親和性が高いノードです。`,
        {
          action: "INSERT_BLOCK",
          targetBlockId: block.id,
          payload: { type: "Transform", name: "Auto Job", meta: { batchable: true } }
        }
      );
    }
  }

  return suggestions;
}
