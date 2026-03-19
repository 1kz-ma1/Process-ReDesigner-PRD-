import type { Block, Flow, Suggestion } from "../models/types";

function duration(block: Block): number {
  const est = Number(block.meta.estMin ?? 0);
  const sla = Number(block.meta.SLAmin ?? 0);
  return Math.max(est, sla, 0);
}

export function analyzeFlow(flow: Flow, targetSLAmin: number, validRoles: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const blockMap = new Map(flow.blocks.map((b) => [b.id, b]));

  const push = (s: Omit<Suggestion, "id">) => {
    suggestions.push({ ...s, id: crypto.randomUUID() });
  };

  const approveBlocks = flow.blocks.filter((b) => b.type === "Approve");
  approveBlocks.forEach((block) => {
    const levels = Number(block.meta.levels ?? 1);
    if (levels >= 3) {
      push({
        rule_code: "APPROVE_OVER",
        severity: "warn",
        summary: "承認階層が多すぎます",
        detail: `${block.name} の levels=${levels} です。承認圧縮を検討してください。`,
        fix_plan: { action: "UPDATE_META", targetBlockIds: [block.id], payload: { levels: 2 } }
      });
    }
  });

  flow.edges.forEach((edge) => {
    const a = blockMap.get(edge.from);
    const b = blockMap.get(edge.to);
    if (!a || !b) return;
    if ((a.type === "Review" || a.type === "Approve") && b.type === "Input") {
      push({
        rule_code: "REWORK_RISK",
        severity: "critical",
        summary: "手戻りリスクがあります",
        detail: "Review/Approve の直後に Input があります。",
        fix_plan: { action: "UPDATE_META", targetBlockIds: [b.id], payload: { moveToEarly: true } }
      });
    }
    if (a.type === "Handoff" && b.type === "Handoff") {
      push({
        rule_code: "HANDOFF_CHAIN",
        severity: "warn",
        summary: "引き継ぎが連続しています",
        detail: "責任境界の見直し候補です。",
        fix_plan: { action: "MERGE", targetBlockIds: [a.id, b.id] }
      });
    }
  });

  const inputFields = new Set<string>();
  flow.blocks.forEach((block) => {
    if (block.type !== "Input") return;
    const fields = Array.isArray(block.meta.fields)
      ? (block.meta.fields as Array<{ name?: string }>)
      : [];
    fields.forEach((f) => {
      if (!f?.name) return;
      if (inputFields.has(f.name)) {
        push({
          rule_code: "DUP_INPUT",
          severity: "warn",
          summary: "入力項目が重複しています",
          detail: `${f.name} が複数工程で再入力されています。`,
          fix_plan: { action: "MERGE" }
        });
      }
      inputFields.add(f.name);
    });
  });

  const notifyCount = flow.blocks.filter((b) => b.type === "Notify").length;
  if (notifyCount >= 3) {
    push({
      rule_code: "NOTIFY_SPAM",
      severity: "warn",
      summary: "通知が過密です",
      detail: `${notifyCount} 件の Notify があります。`,
      fix_plan: { action: "INSERT_AUTOMATION" }
    });
  }

  const total = flow.blocks.reduce((sum, b) => sum + duration(b), 0);
  if (total > targetSLAmin) {
    push({
      rule_code: "SLA_EXCEED",
      severity: "critical",
      summary: "SLAを超過しています",
      detail: `総時間 ${total} 分 > 目標 ${targetSLAmin} 分。`,
      fix_plan: {
        action: "INSERT_AUTOMATION",
        payload: { type: "Transform", name: "Transform（自動化）", batchable: true }
      }
    });
  }

  flow.blocks.forEach((b) => {
    const ownerRole = String(b.meta.ownerRole ?? "");
    if (ownerRole && !validRoles.includes(ownerRole)) {
      push({
        rule_code: "ROLE_MISMATCH",
        severity: "critical",
        summary: "権限不整合があります",
        detail: `${b.name} の ownerRole=${ownerRole} は定義外です。`,
        fix_plan: { action: "UPDATE_META", targetBlockIds: [b.id], payload: { ownerRole: "Manager" } }
      });
    }
  });

  flow.blocks.forEach((b) => {
    const channel = String(b.meta.channel ?? "");
    const batchable = Boolean(b.meta.batchable);
    if ((b.type === "Transform" || b.type === "Notify" || b.type === "Store") && (batchable || channel === "webhook")) {
      push({
        rule_code: "AUTO_CANDIDATE",
        severity: "info",
        summary: "自動化候補があります",
        detail: `${b.name} は自動化可能性が高いです。`,
        fix_plan: { action: "INSERT_AUTOMATION", targetBlockIds: [b.id] }
      });
    }
  });

  return suggestions;
}
