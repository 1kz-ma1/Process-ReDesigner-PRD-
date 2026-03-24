import { describe, expect, it } from "vitest";
import type { FlowDoc } from "../models/types";
import { exportKintoneAppJson } from "./kintoneExport";
import { defaultRuleSettings, getRulePacks, validateByRules } from "./ruleEngine";

describe("exportKintoneAppJson", () => {
  it("maps meta attributes to kintone field properties", () => {
    const doc: FlowDoc = {
      mode: "roadmap",
      nodes: [
        {
          id: "n1",
          type: "task",
          name: "申請種別",
          meta: {
            fieldType: "dropdown",
            required: true,
            options: ["通常", "緊急"],
            defaultValue: "通常",
            description: "申請の優先度を指定",
          },
          lane: { row: 0, col: 0 },
          laneId: "lane-kintone",
          indexInCell: 0,
        },
      ],
      edges: [],
      systemLanes: [{ laneId: "lane-kintone", name: "kintone", systemType: "kintone" }],
      laneConnections: [],
      lanes: { rows: ["申請"], cols: ["入力"] },
      laneConfig: { rows: ["申請"], cols: ["入力"] },
      viewport: { x: 0, y: 0, zoom: 1 },
      version: "v1",
    };

    const result = exportKintoneAppJson(doc, "Test App");
    expect(result.kintoneApp.name).toBe("Test App");
    expect(result.kintoneApp.fields).toHaveLength(1);
    expect(result.kintoneApp.fields[0]).toMatchObject({
      code: "申請種別",
      label: "申請種別",
      type: "DROP_DOWN",
      required: true,
      description: "申請の優先度を指定",
      defaultValue: "通常",
    });
    expect(result.kintoneApp.fields[0].options).toEqual(["通常", "緊急"]);
  });

  it("deduplicates field code when labels are the same", () => {
    const doc: FlowDoc = {
      mode: "roadmap",
      nodes: [
        {
          id: "n1",
          type: "task",
          name: "申請",
          meta: {},
          lane: { row: 0, col: 0 },
          laneId: "lane-kintone",
          indexInCell: 0,
        },
        {
          id: "n2",
          type: "task",
          name: "申請",
          meta: {},
          lane: { row: 0, col: 1 },
          laneId: "lane-kintone",
          indexInCell: 0,
        },
      ],
      edges: [],
      systemLanes: [{ laneId: "lane-kintone", name: "kintone", systemType: "kintone" }],
      laneConnections: [],
      lanes: { rows: ["申請"], cols: ["入力", "確認"] },
      laneConfig: { rows: ["申請"], cols: ["入力", "確認"] },
      viewport: { x: 0, y: 0, zoom: 1 },
      version: "v1",
    };

    const result = exportKintoneAppJson(doc);
    expect(result.kintoneApp.fields.map((f) => f.code)).toEqual(["申請", "申請_2"]);
  });
});

describe("lane integration validation", () => {
  it("reports invalid lane connection endpoints", () => {
    const doc: FlowDoc = {
      mode: "roadmap",
      nodes: [
        {
          id: "n1",
          type: "task",
          name: "入力",
          meta: {},
          lane: { row: 0, col: 0 },
          laneId: "lane-kintone",
          indexInCell: 0,
        },
      ],
      edges: [],
      systemLanes: [{ laneId: "lane-kintone", name: "kintone", systemType: "kintone" }],
      laneConnections: [
        {
          connectionId: "lc-1",
          from: { laneId: "lane-kintone", blockId: "n1" },
          to: { laneId: "lane-external", blockId: "missing-node" },
          type: "api",
        },
      ],
      lanes: { rows: ["申請"], cols: ["入力"] },
      laneConfig: { rows: ["申請"], cols: ["入力"] },
      viewport: { x: 0, y: 0, zoom: 1 },
      version: "v1",
    };

    const packs = getRulePacks();
    const settings = defaultRuleSettings(packs);
    const result = validateByRules(doc, packs, settings, {});

    expect(result.valid).toBe(false);
    expect(result.messages.some((m) => m.ruleId === "integration.connection-endpoint")).toBe(true);
  });
});
