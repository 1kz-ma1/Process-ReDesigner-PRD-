import type { FlowDoc, LaneConnection, NodeData, SystemLane } from "../models/types";

interface KintoneField {
  code: string;
  label: string;
  type: string;
  required?: boolean;
  description?: string;
  options?: string[];
  defaultValue?: string;
}

interface KintoneProcess {
  name: string;
  from: string;
  to: string;
}

interface KintoneWebhook {
  name: string;
  payload?: string;
}

type JsonRecord = Record<string, unknown>;

const FIELD_TYPE_ALIASES: Record<string, string> = {
  text: "SINGLE_LINE_TEXT",
  single_line_text: "SINGLE_LINE_TEXT",
  multiline_text: "MULTI_LINE_TEXT",
  multi_line_text: "MULTI_LINE_TEXT",
  rich_text: "RICH_TEXT",
  number: "NUMBER",
  calc: "CALC",
  calculation: "CALC",
  date: "DATE",
  time: "TIME",
  datetime: "DATETIME",
  check_box: "CHECK_BOX",
  checkbox: "CHECK_BOX",
  drop_down: "DROP_DOWN",
  dropdown: "DROP_DOWN",
  radio_button: "RADIO_BUTTON",
  radio: "RADIO_BUTTON",
  link: "LINK",
  user_select: "USER_SELECT",
  organization_select: "ORGANIZATION_SELECT",
  group_select: "GROUP_SELECT",
  file: "FILE",
  lookup: "LOOKUP",
};

export interface KintoneAppExport {
  kintoneApp: {
    name: string;
    fields: KintoneField[];
    processManagement: KintoneProcess[];
    webhooks: KintoneWebhook[];
  };
}

function toFieldType(node: NodeData): string {
  const rawType = readString(node.meta, ["fieldType", "kintoneFieldType", "type"]);
  if (rawType) {
    const key = rawType.toLowerCase().replace(/[\s-]+/g, "_");
    return FIELD_TYPE_ALIASES[key] ?? rawType.trim().toUpperCase();
  }
  if (node.type === "condition") {
    return "DROP_DOWN";
  }
  return "SINGLE_LINE_TEXT";
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function readString(source: unknown, keys: string[]): string | undefined {
  const record = asRecord(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readBoolean(source: unknown, keys: string[]): boolean | undefined {
  const record = asRecord(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
  }
  return undefined;
}

function readOptions(source: unknown): string[] | undefined {
  const record = asRecord(source);
  const raw = record.options ?? record.choices ?? record.enumValues ?? record.enum;
  if (Array.isArray(raw)) {
    const options = raw
      .map((value) => {
        if (typeof value === "string") {
          return value.trim();
        }
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
        if (typeof value === "object" && value !== null) {
          const item = value as JsonRecord;
          const label = item.label;
          const optionValue = item.value;
          if (typeof label === "string" && label.trim()) {
            return label.trim();
          }
          if (typeof optionValue === "string" && optionValue.trim()) {
            return optionValue.trim();
          }
        }
        return "";
      })
      .filter((v) => v.length > 0);
    return options.length > 0 ? options : undefined;
  }

  if (typeof raw === "string") {
    const options = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return options.length > 0 ? options : undefined;
  }

  return undefined;
}

function toFieldDefaultValue(source: unknown): string | undefined {
  const record = asRecord(source);
  const raw = record.defaultValue ?? record.default;
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  return undefined;
}

function uniqueFieldCode(baseCode: string, usedCodes: Set<string>): string {
  if (!usedCodes.has(baseCode)) {
    usedCodes.add(baseCode);
    return baseCode;
  }

  let index = 2;
  while (true) {
    const candidate = `${baseCode}_${index}`.slice(0, 64);
    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

function toFieldCode(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u3040-\u30ff\u4e00-\u9faf]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64) || "field";
}

function lanesById(doc: FlowDoc): Map<string, SystemLane> {
  return new Map((doc.systemLanes ?? []).map((lane) => [lane.laneId, lane]));
}

function nodeById(doc: FlowDoc): Map<string, NodeData> {
  return new Map(doc.nodes.map((node) => [node.id, node]));
}

function isKintoneLaneId(laneId: string, laneMap: Map<string, SystemLane>): boolean {
  return laneMap.get(laneId)?.systemType === "kintone";
}

function isKintoneNode(node: NodeData, laneMap: Map<string, SystemLane>): boolean {
  if (!node.laneId) {
    return false;
  }
  return isKintoneLaneId(node.laneId, laneMap);
}

function laneConnectionTouchesKintone(connection: LaneConnection, laneMap: Map<string, SystemLane>): boolean {
  return (
    isKintoneLaneId(connection.from.laneId, laneMap) ||
    isKintoneLaneId(connection.to.laneId, laneMap)
  );
}

export function exportKintoneAppJson(doc: FlowDoc, appName = "PRD Generated App"): KintoneAppExport {
  const laneMap = lanesById(doc);
  const nodeMap = nodeById(doc);
  const kintoneNodes = doc.nodes.filter((node) => isKintoneNode(node, laneMap));
  const kintoneNodeIdSet = new Set(kintoneNodes.map((node) => node.id));
  const usedFieldCodes = new Set<string>();

  const fields = kintoneNodes.map((node) => {
    const code = uniqueFieldCode(toFieldCode(node.name), usedFieldCodes);
    const required = readBoolean(node.meta, ["required", "isRequired"]);
    const description = readString(node.meta, ["description", "helpText", "note"]);
    const options = readOptions(node.meta);
    const defaultValue = toFieldDefaultValue(node.meta);

    return {
      code,
      label: node.name,
      type: toFieldType(node),
      required,
      description,
      options,
      defaultValue,
    };
  });

  const processManagement = doc.edges
    .filter((edge) => kintoneNodeIdSet.has(edge.source) && kintoneNodeIdSet.has(edge.target))
    .map((edge) => ({
      name: edge.label ?? `${edge.source}->${edge.target}`,
      from: nodeMap.get(edge.source)?.name ?? edge.source,
      to: nodeMap.get(edge.target)?.name ?? edge.target,
    }));

  const webhooks = (doc.laneConnections ?? [])
    .filter((connection) => connection.type === "webhook" && laneConnectionTouchesKintone(connection, laneMap))
    .map((connection) => ({
      name: `${connection.from.laneId} -> ${connection.to.laneId}`,
      payload: connection.payload,
    }));

  return {
    kintoneApp: {
      name: appName,
      fields,
      processManagement,
      webhooks,
    },
  };
}
