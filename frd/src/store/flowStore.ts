import { create } from "zustand";
import type { Connection, EdgeChange, Node, NodeChange } from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import { defaultMeta } from "../models/blockCatalog";
import type { Block, BlockType, Flow, Iteration, PersistedRoot, Suggestion } from "../models/types";
import { loadRoot, saveRoot } from "../services/storage";
import { analyzeFlow } from "../utils/analyzeRules";

const validRoles = ["Staff", "Leader", "Manager", "Admin"];
const targetSLAmin = 240;

function toNodes(blocks: Block[]): Node[] {
  return blocks.map((b) => ({
    id: b.id,
    position: { x: b.x, y: b.y },
    data: { label: b.name, blockType: b.type },
    type: "default"
  }));
}

function toBlocks(nodes: Node[], current: Block[]): Block[] {
  return nodes.map((n) => {
    const c = current.find((b) => b.id === n.id);
    return {
      id: n.id,
      type: (c?.type ?? "Input") as BlockType,
      name: String((n.data as { label?: string })?.label ?? c?.name ?? "Block"),
      x: n.position.x,
      y: n.position.y,
      meta: c?.meta ?? {}
    };
  });
}

interface FlowState {
  schemaVersion: number;
  flow: Flow | null;
  iterations: Iteration[];
  suggestions: Suggestion[];
  selectedBlockId: string | null;
  initialized: boolean;
  load: () => Promise<void>;
  persist: () => Promise<void>;
  addBlock: (type: BlockType, x?: number, y?: number) => void;
  deleteBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  updateSelectedMeta: (metaText: string) => string | null;
  updateSelectedName: (name: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  analyze: () => void;
  applySuggestion: (suggestionId: string) => void;
  saveIteration: (note?: string) => void;
  exportJson: () => void;
  importJsonFile: (file: File) => Promise<string | null>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  schemaVersion: 1,
  flow: null,
  iterations: [],
  suggestions: [],
  selectedBlockId: null,
  initialized: false,

  load: async () => {
    const root = await loadRoot();
    set({
      schemaVersion: root.schemaVersion,
      flow: root.flow,
      iterations: root.iterations,
      initialized: true
    });
  },

  persist: async () => {
    const { schemaVersion, flow, iterations } = get();
    if (!flow) return;
    const root: PersistedRoot = { schemaVersion, flow, iterations };
    await saveRoot(root);
  },

  addBlock: (type, x?, y?) => {
    const { flow } = get();
    if (!flow) return;
    const id = crypto.randomUUID();

    const computeCenter = () => {
      try {
        const el = document.querySelector(".canvas-box") as HTMLElement | null;
        if (!el) return { x: 300, y: 120 };
        const rect = el.getBoundingClientRect();
        const clientCenterX = rect.left + rect.width / 2;
        const clientCenterY = rect.top + rect.height / 2;

        // If React Flow viewport transform exists, account for translate/scale
        const vp = el.querySelector(".react-flow__viewport") as HTMLElement | null;
        if (vp) {
          const t = vp.style.transform || getComputedStyle(vp).transform;
          // transform usually like: "translate(123px, 45px) scale(1)"
          const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)\s*scale\((-?\d+(?:\.\d+)?)\)/.exec(t || "");
          if (m) {
            const tx = Number(m[1]);
            const ty = Number(m[2]);
            const scale = Number(m[3]);
            const cx = Math.round((clientCenterX - rect.left - tx) / scale);
            const cy = Math.round((clientCenterY - rect.top - ty) / scale);
            return { x: cx, y: cy };
          }
        }

        return { x: Math.round(rect.width / 2), y: Math.round(rect.height / 2) };
      } catch {
        return { x: 300, y: 120 };
      }
    };

    const center = x != null && y != null ? { x, y } : computeCenter();

    const next: Block = {
      id,
      type,
      name: `${type}（${type === "Approve" ? "承認" : "工程"}）`,
      x: center.x,
      y: center.y,
      meta: defaultMeta(type)
    };
    set({
      flow: {
        ...flow,
        version: flow.version + 1,
        blocks: [...flow.blocks, next]
      },
      selectedBlockId: id
    });
    void get().persist();
  },

  deleteBlock: (blockId) => {
    const { flow, selectedBlockId } = get();
    if (!flow) return;
    set({
      flow: {
        ...flow,
        version: flow.version + 1,
        blocks: flow.blocks.filter((b) => b.id !== blockId),
        edges: flow.edges.filter((e) => e.from !== blockId && e.to !== blockId)
      },
      selectedBlockId: selectedBlockId === blockId ? null : selectedBlockId
    });
    void get().persist();
  },

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),

  updateSelectedMeta: (metaText) => {
    const { flow, selectedBlockId } = get();
    if (!flow || !selectedBlockId) return "ブロックを選択してください";
    try {
      const parsed = JSON.parse(metaText) as Record<string, unknown>;
      set({
        flow: {
          ...flow,
          version: flow.version + 1,
          blocks: flow.blocks.map((b) => (b.id === selectedBlockId ? { ...b, meta: parsed } : b))
        }
      });
      void get().persist();
      return null;
    } catch {
      return "meta JSONの形式が不正です";
    }
  },

  updateSelectedName: (name) => {
    const { flow, selectedBlockId } = get();
    if (!flow || !selectedBlockId) return;
    set({
      flow: {
        ...flow,
        version: flow.version + 1,
        blocks: flow.blocks.map((b) => (b.id === selectedBlockId ? { ...b, name } : b))
      }
    });
    void get().persist();
  },

  onNodesChange: (changes) => {
    const { flow } = get();
    if (!flow) return;
    const nextNodes = applyNodeChanges(changes, toNodes(flow.blocks));
    set({
      flow: {
        ...flow,
        blocks: toBlocks(nextNodes, flow.blocks)
      }
    });
    void get().persist();
  },

  onEdgesChange: (changes) => {
    const { flow } = get();
    if (!flow) return;
    const rfEdges = flow.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, label: e.label }));
    const next = applyEdgeChanges(changes, rfEdges);
    set({
      flow: {
        ...flow,
        edges: next.map((e) => ({ id: e.id, from: e.source, to: e.target, label: String(e.label ?? "") }))
      }
    });
    void get().persist();
  },

  onConnect: (connection) => {
    const { flow } = get();
    if (!flow || !connection.source || !connection.target) return;
    const rfEdges = flow.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, label: e.label }));
    const next = addEdge(
      {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        label: "接続"
      },
      rfEdges
    );
    set({
      flow: {
        ...flow,
        version: flow.version + 1,
        edges: next.map((e) => ({ id: e.id, from: e.source, to: e.target, label: String(e.label ?? "") }))
      }
    });
    void get().persist();
  },

  analyze: () => {
    const { flow } = get();
    if (!flow) return;
    set({ suggestions: analyzeFlow(flow, targetSLAmin, validRoles) });
  },

  applySuggestion: (suggestionId) => {
    const { suggestions, flow } = get();
    if (!flow) return;
    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;
    let next = flow;

    if (target.fix_plan.action === "DELETE" && target.fix_plan.targetBlockIds?.[0]) {
      const deleteId = target.fix_plan.targetBlockIds[0];
      next = {
        ...next,
        blocks: next.blocks.filter((b) => b.id !== deleteId),
        edges: next.edges.filter((e) => e.from !== deleteId && e.to !== deleteId)
      };
    }

    if (target.fix_plan.action === "INSERT_AUTOMATION") {
      const block: Block = {
        id: crypto.randomUUID(),
        type: "Transform",
        name: "Transform（自動化）",
        x: 260,
        y: 260,
        meta: defaultMeta("Transform")
      };
      next = { ...next, blocks: [...next.blocks, block] };
    }

    if (target.fix_plan.action === "UPDATE_META" && target.fix_plan.targetBlockIds?.[0]) {
      const blockId = target.fix_plan.targetBlockIds[0];
      next = {
        ...next,
        blocks: next.blocks.map((b) =>
          b.id === blockId
            ? {
                ...b,
                meta: { ...b.meta, ...(target.fix_plan.payload ?? {}) }
              }
            : b
        )
      };
    }

    if (target.fix_plan.action === "MERGE" && target.fix_plan.targetBlockIds?.length) {
      const [first] = target.fix_plan.targetBlockIds;
      const deleteSet = new Set(target.fix_plan.targetBlockIds.slice(1));
      next = {
        ...next,
        blocks: next.blocks
          .filter((b) => !deleteSet.has(b.id))
          .map((b) => (b.id === first ? { ...b, name: `${b.name}（統合）` } : b)),
        edges: next.edges.filter((e) => !deleteSet.has(e.from) && !deleteSet.has(e.to))
      };
    }

    set({
      flow: { ...next, version: next.version + 1 },
      suggestions: suggestions.filter((s) => s.id !== suggestionId)
    });
    void get().persist();
  },

  saveIteration: (note) => {
    const { flow, iterations } = get();
    if (!flow) return;
    set({
      iterations: [
        ...iterations,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          note,
          snapshot: structuredClone(flow)
        }
      ]
    });
    void get().persist();
  },

  exportJson: () => {
    const { schemaVersion, flow, iterations } = get();
    if (!flow) return;
    const root: PersistedRoot = { schemaVersion, flow, iterations };
    const blob = new Blob([JSON.stringify(root, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flow.name.replace(/\s+/g, "_")}.frd.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJsonFile: async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PersistedRoot;
      if (!parsed.flow || typeof parsed.schemaVersion !== "number") {
        return "FRD JSON形式ではありません";
      }
      set({
        schemaVersion: parsed.schemaVersion,
        flow: parsed.flow,
        iterations: parsed.iterations ?? [],
        suggestions: [],
        selectedBlockId: null
      });
      await get().persist();
      return null;
    } catch {
      return "JSONの読み込みに失敗しました";
    }
  }
}));
