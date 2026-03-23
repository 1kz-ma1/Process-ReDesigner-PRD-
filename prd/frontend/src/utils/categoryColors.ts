import type { NodeData } from "../models/types";

export type CategoryColor = {
  bg: string;
  border: string;
  text: string;
};

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  入力: { bg: "#FEF3C7", border: "#F59E0B", text: "#7C2D12" },
  検証: { bg: "#FFECD5", border: "#F59E0B", text: "#7C2D12" },
  承認: { bg: "#FEE2E2", border: "#EF4444", text: "#7F1D1D" },
  通知: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A8A" },
  保管: { bg: "#DCFCE7", border: "#22C55E", text: "#14532D" },
  条件: { bg: "#EDE9FE", border: "#8B5CF6", text: "#3730A3" },
};

function inferCategory(node: NodeData): string {
  const raw = node.meta?.category;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (node.type === "condition") {
    return "条件";
  }
  const lower = node.name.toLowerCase();
  if (lower.includes("入力") || lower.includes("申請")) return "入力";
  if (lower.includes("検証") || lower.includes("確認")) return "検証";
  if (lower.includes("承認")) return "承認";
  if (lower.includes("通知") || lower.includes("メール")) return "通知";
  if (lower.includes("保管") || lower.includes("登録")) return "保管";
  return "";
}

export function getNodeColor(node: NodeData): CategoryColor {
  const override = node.style?.overrideColor;
  if (override) {
    return override;
  }
  const category = inferCategory(node);
  return CATEGORY_COLORS[category] ?? { bg: "#FFFFFF", border: "#D1D5DB", text: "#1F2937" };
}
