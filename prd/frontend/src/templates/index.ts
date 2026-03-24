import type { EdgeData, NodeData } from "../models/types";

export interface TemplateDoc {
  key: string;
  name: string;
  description?: string;
  tags?: string[];
  lanes: { rows: string[]; cols: string[] };
  nodes: NodeData[];
  edges: EdgeData[];
  version: "v1";
}

export const templates: TemplateDoc[] = [
  {
    key: "application-flow",
    name: "申請手続き",
    description: "申請→検証→承認→通知→保管の基本フロー",
    tags: ["共通", "バックオフィス", "承認"],
    version: "v1",
    lanes: { rows: ["申請者", "承認者", "管理部"], cols: ["入力", "検証", "承認", "通知", "保管"] },
    nodes: [
      { id: "n1", type: "task", name: "申請情報の入力", meta: {}, lane: { row: 0, col: 0 }, indexInCell: 0 },
      { id: "n2", type: "task", name: "入力内容の検証", meta: {}, lane: { row: 1, col: 1 }, indexInCell: 0 },
      { id: "n3", type: "task", name: "上長承認", meta: {}, lane: { row: 1, col: 2 }, indexInCell: 0 },
      { id: "n4", type: "task", name: "メール通知", meta: {}, lane: { row: 2, col: 3 }, indexInCell: 0 },
      { id: "n5", type: "task", name: "台帳に保管", meta: {}, lane: { row: 2, col: 4 }, indexInCell: 0 },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", kind: "normal" },
      { id: "e2", source: "n2", target: "n3", kind: "normal" },
      { id: "e3", source: "n3", target: "n4", kind: "normal" },
      { id: "e4", source: "n4", target: "n5", kind: "normal" },
    ],
  },
  {
    key: "inventory-flow",
    name: "在庫管理",
    description: "入庫→検品→棚入れ→ピッキング→出荷",
    tags: ["在庫", "物流"],
    version: "v1",
    lanes: { rows: ["倉庫受付", "検品", "庫内", "出荷"], cols: ["入庫", "検品", "棚入れ", "ピッキング", "出荷"] },
    nodes: [
      { id: "n1", type: "task", name: "入庫受付", meta: {}, lane: { row: 0, col: 0 }, indexInCell: 0 },
      { id: "n2", type: "task", name: "数量・状態検品", meta: {}, lane: { row: 1, col: 1 }, indexInCell: 0 },
      { id: "n3", type: "task", name: "ロケーション登録", meta: {}, lane: { row: 2, col: 2 }, indexInCell: 0 },
      { id: "n4", type: "task", name: "ピッキング", meta: {}, lane: { row: 2, col: 3 }, indexInCell: 0 },
      { id: "n5", type: "task", name: "出荷確定", meta: {}, lane: { row: 3, col: 4 }, indexInCell: 0 },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", kind: "normal" },
      { id: "e2", source: "n2", target: "n3", kind: "normal" },
      { id: "e3", source: "n3", target: "n4", kind: "normal" },
      { id: "e4", source: "n4", target: "n5", kind: "normal" },
    ],
  },
  {
    key: "purchase-flow",
    name: "発注管理",
    description: "需要確認→発注書→承認→発注→納品確認",
    tags: ["購買", "バックオフィス"],
    version: "v1",
    lanes: { rows: ["依頼部門", "購買部", "承認者"], cols: ["需要確認", "発注書作成", "承認", "発注", "納品確認"] },
    nodes: [
      { id: "n1", type: "task", name: "需要の確認", meta: {}, lane: { row: 0, col: 0 }, indexInCell: 0 },
      { id: "n2", type: "task", name: "発注書作成", meta: {}, lane: { row: 1, col: 1 }, indexInCell: 0 },
      { id: "n3", type: "task", name: "購買部長承認", meta: {}, lane: { row: 2, col: 2 }, indexInCell: 0 },
      { id: "n4", type: "task", name: "ベンダーへ発注", meta: {}, lane: { row: 1, col: 3 }, indexInCell: 0 },
      { id: "n5", type: "task", name: "納品確認・検収", meta: {}, lane: { row: 0, col: 4 }, indexInCell: 0 },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", kind: "normal" },
      { id: "e2", source: "n2", target: "n3", kind: "normal" },
      { id: "e3", source: "n3", target: "n4", kind: "normal" },
      { id: "e4", source: "n4", target: "n5", kind: "normal" },
    ],
  },
  {
    key: "hr-recruiting",
    name: "人材管理（採用）",
    description: "応募→面接→評価→内定→配属",
    tags: ["人事", "採用"],
    version: "v1",
    lanes: { rows: ["応募者", "採用担当", "面接官", "人事"], cols: ["応募受付", "一次面接", "最終面接", "内定", "配属"] },
    nodes: [
      { id: "n1", type: "task", name: "応募受付", meta: {}, lane: { row: 1, col: 0 }, indexInCell: 0 },
      { id: "n2", type: "task", name: "一次面接", meta: {}, lane: { row: 2, col: 1 }, indexInCell: 0 },
      { id: "n3", type: "task", name: "最終面接", meta: {}, lane: { row: 2, col: 2 }, indexInCell: 0 },
      { id: "n4", type: "task", name: "内定通知", meta: {}, lane: { row: 3, col: 3 }, indexInCell: 0 },
      { id: "n5", type: "task", name: "配属手続き", meta: {}, lane: { row: 3, col: 4 }, indexInCell: 0 },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", kind: "normal" },
      { id: "e2", source: "n2", target: "n3", kind: "normal" },
      { id: "e3", source: "n3", target: "n4", kind: "normal" },
      { id: "e4", source: "n4", target: "n5", kind: "normal" },
    ],
  },
];
