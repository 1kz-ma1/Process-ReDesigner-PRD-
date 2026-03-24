import type {
  EdgeData,
  EdgeId,
  Fix,
  FixDecisionHistory,
  FlowDoc,
  NodeData,
  NodeId,
  Rule,
  RuleContext,
  RulePack,
  RuleResult,
  RuleRuntimeSettings,
  RuleSeverity,
  ValidationMessage,
} from "../models/types";
import { generateEdgeId, generateNodeId } from "./id";

const SETTINGS_KEY = "prd.rule.settings.v1";
const HISTORY_KEY = "prd.rule.history.v1";

const severityWeight: Record<RuleSeverity, number> = {
  error: 0,
  warning: 1,
  suggestion: 2,
};

function severityScore(type: ValidationMessage["type"]): number {
  if (type === "error") return severityWeight.error;
  if (type === "warning") return severityWeight.warning;
  return severityWeight.suggestion;
}

function cloneDoc(doc: FlowDoc): FlowDoc {
  return JSON.parse(JSON.stringify(doc)) as FlowDoc;
}

function nodeCategory(node: NodeData): string {
  const raw = node.meta?.category;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  const name = node.name.toLowerCase();
  if (name.includes("入力") || name.includes("申請") || name.includes("input")) return "入力";
  if (name.includes("検証") || name.includes("validate")) return "検証";
  if (name.includes("承認") || name.includes("approve")) return "承認";
  if (name.includes("通知") || name.includes("notify")) return "通知";
  return "";
}

function laneNameById(doc: FlowDoc, laneId?: string): string {
  if (!laneId) {
    return "未割当レーン";
  }
  const lane = (doc.systemLanes ?? []).find((item) => item.laneId === laneId);
  return lane?.name ?? laneId;
}

function buildContext(doc: FlowDoc): RuleContext {
  const outgoingMap = new Map<NodeId, EdgeData[]>();
  const incomingMap = new Map<NodeId, EdgeData[]>();
  for (const node of doc.nodes) {
    outgoingMap.set(node.id, []);
    incomingMap.set(node.id, []);
  }
  for (const edge of doc.edges) {
    const out = outgoingMap.get(edge.source) ?? [];
    out.push(edge);
    outgoingMap.set(edge.source, out);

    const inc = incomingMap.get(edge.target) ?? [];
    inc.push(edge);
    incomingMap.set(edge.target, inc);
  }

  const normalAdj = new Map<NodeId, NodeId[]>();
  for (const node of doc.nodes) {
    normalAdj.set(node.id, []);
  }
  for (const edge of doc.edges) {
    if (edge.kind === "loop") continue;
    const arr = normalAdj.get(edge.source) ?? [];
    arr.push(edge.target);
    normalAdj.set(edge.source, arr);
  }

  const reverseAdj = new Map<NodeId, NodeId[]>();
  for (const node of doc.nodes) {
    reverseAdj.set(node.id, []);
  }
  for (const [source, targets] of normalAdj.entries()) {
    for (const target of targets) {
      const arr = reverseAdj.get(target) ?? [];
      arr.push(source);
      reverseAdj.set(target, arr);
    }
  }

  const isAncestor = (a: NodeId, b: NodeId): boolean => {
    const queue: NodeId[] = [b];
    const visited = new Set<NodeId>();
    while (queue.length > 0) {
      const current = queue.shift() as NodeId;
      if (current === a) {
        return true;
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const parents = reverseAdj.get(current) ?? [];
      for (const p of parents) {
        queue.push(p);
      }
    }
    return false;
  };

  const hasCycleWithAdj = (adj: Map<NodeId, NodeId[]>): boolean => {
    const visited = new Set<NodeId>();
    const stack = new Set<NodeId>();

    const dfs = (id: NodeId): boolean => {
      visited.add(id);
      stack.add(id);
      for (const next of adj.get(id) ?? []) {
        if (!visited.has(next) && dfs(next)) {
          return true;
        }
        if (stack.has(next)) {
          return true;
        }
      }
      stack.delete(id);
      return false;
    };

    for (const node of doc.nodes) {
      if (!visited.has(node.id) && dfs(node.id)) {
        return true;
      }
    }
    return false;
  };

  const createsCycleIfAdd = (edge: EdgeData): boolean => {
    if (edge.kind === "loop") {
      return false;
    }
    const adj = new Map<NodeId, NodeId[]>();
    for (const node of doc.nodes) {
      adj.set(node.id, [...(normalAdj.get(node.id) ?? [])]);
    }
    const arr = adj.get(edge.source) ?? [];
    arr.push(edge.target);
    adj.set(edge.source, arr);
    return hasCycleWithAdj(adj);
  };

  const byLane = (row: number, col: number): NodeData[] => {
    return doc.nodes.filter((node) => node.lane?.row === row && node.lane?.col === col);
  };

  return {
    doc,
    utils: {
      isAncestor,
      createsCycleIfAdd,
      outgoing: (id: NodeId) => outgoingMap.get(id) ?? [],
      incoming: (id: NodeId) => incomingMap.get(id) ?? [],
      byLane,
      clone: <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T,
    },
  };
}

function laneMoveFix(nodeId: NodeId, row: number, col: number, label: string, priority = 100): Fix {
  return {
    id: `fix-lane-${nodeId}-${row}-${col}`,
    label,
    priority,
    apply: (doc) => {
      const next = cloneDoc(doc);
      const node = next.nodes.find((n) => n.id === nodeId);
      if (!node) return doc;
      node.lane = { row, col };
      node.indexInCell = 0;
      node.position = { x: col * 220 + 110, y: row * 120 + 60 };
      return next;
    },
  };
}

function makeRules(): Rule[] {
  const rules: Rule[] = [];

  rules.push({
    id: "lane.node-assigned",
    name: "レーン割当チェック",
    description: "ロードマップモードでは全ノードにsystem laneを割り当てる",
    severityDefault: "error",
    appliesToModes: ["roadmap"],
    check: ({ doc }) => {
      if ((doc.systemLanes?.length ?? 0) === 0) {
        return [];
      }
      return doc.nodes
        .filter((node) => !node.laneId)
        .map((node) => ({
          ruleId: "lane.node-assigned",
          severity: "error" as const,
          message: `ノード「${node.name}」がシステムレーン未割当です`,
          targets: { nodes: [node.id] },
        }));
    },
  });

  rules.push({
    id: "integration.cross-lane-metadata",
    name: "レーン間連携メタ情報",
    description: "レーン間エッジには連携定義を紐付ける",
    severityDefault: "warning",
    appliesToModes: ["roadmap"],
    check: ({ doc }) => {
      const connSet = new Set(
        (doc.laneConnections ?? []).map(
          (connection) => `${connection.from.blockId}->${connection.to.blockId}`
        )
      );

      const nodeMap = new Map(doc.nodes.map((node) => [node.id, node]));
      const results: RuleResult[] = [];
      for (const edge of doc.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        if (!source.laneId || !target.laneId || source.laneId === target.laneId) continue;
        if (connSet.has(`${edge.source}->${edge.target}`)) continue;

        results.push({
          ruleId: "integration.cross-lane-metadata",
          severity: "warning",
          message: `連携定義不足: ${laneNameById(doc, source.laneId)} → ${laneNameById(doc, target.laneId)}`,
          targets: { edges: [edge.id], nodes: [source.id, target.id] },
        });
      }
      return results;
    },
  });

  rules.push({
    id: "integration.connection-endpoint",
    name: "連携接続先整合",
    description: "連携定義は存在するノード/レーンを参照する",
    severityDefault: "error",
    appliesToModes: ["roadmap"],
    check: ({ doc }) => {
      const nodeSet = new Set(doc.nodes.map((node) => node.id));
      const laneSet = new Set((doc.systemLanes ?? []).map((lane) => lane.laneId));

      const results: RuleResult[] = [];
      for (const connection of doc.laneConnections ?? []) {
        const hasFromNode = nodeSet.has(connection.from.blockId);
        const hasToNode = nodeSet.has(connection.to.blockId);
        const hasFromLane = laneSet.has(connection.from.laneId);
        const hasToLane = laneSet.has(connection.to.laneId);
        if (hasFromNode && hasToNode && hasFromLane && hasToLane) {
          continue;
        }
        results.push({
          ruleId: "integration.connection-endpoint",
          severity: "error",
          message: `連携「${connection.connectionId}」の参照先が存在しません`,
          targets: {
            nodes: [connection.from.blockId, connection.to.blockId],
          },
        });
      }
      return results;
    },
  });

  rules.push({
    id: "order.input-validate",
    name: "入力→検証の順序",
    description: "入力ノードの直後に検証ノードが来ることを推奨",
    severityDefault: "warning",
    check: ({ doc }) => {
      if (doc.mode !== "roadmap") return [];
      const results: RuleResult[] = [];
      const inputNodes = doc.nodes.filter((n) => nodeCategory(n) === "入力" && n.lane);
      for (const input of inputNodes) {
        const validates = doc.nodes.filter(
          (n) => nodeCategory(n) === "検証" && n.lane && n.lane.row === input.lane?.row
        );
        const hasAfter = validates.some((n) => (n.lane?.col ?? -1) === (input.lane?.col ?? 0) + 1);
        if (!hasAfter && validates.length > 0) {
          const target = validates[0];
          results.push({
            ruleId: "order.input-validate",
            severity: "warning",
            message: `入力「${input.name}」の直後に検証がありません`,
            targets: { nodes: [input.id, target.id] },
            fixes: [
              laneMoveFix(
                target.id,
                input.lane?.row ?? 0,
                Math.min((input.lane?.col ?? 0) + 1, (doc.lanes?.cols.length ?? 1) - 1),
                "検証ノードを入力直後の列へ移動",
                10
              ),
            ],
          });
        }
      }
      return results;
    },
  });

  rules.push({
    id: "condition.two-branches",
    name: "分岐2本制約",
    description: "conditionノードの外向きはYes/Noの2本",
    severityDefault: "error",
    check: ({ doc, utils }) => {
      const results: RuleResult[] = [];
      const conditions = doc.nodes.filter((n) => n.type === "condition");
      for (const node of conditions) {
        const out = utils.outgoing(node.id).filter((e) => e.kind !== "loop");
        if (out.length !== 2) {
          const fixes: Fix[] = [];
          if (out.length < 2) {
            fixes.push({
              id: `fix-branch-add-${node.id}`,
              label: "不足分岐を自動追加（Yes/No）",
              priority: 10,
              apply: (doc) => {
                const next = cloneDoc(doc);
                const src = next.nodes.find((n) => n.id === node.id);
                if (!src) return doc;
                const currentOut = next.edges.filter((e) => e.source === node.id && e.kind !== "loop");
                const need = 2 - currentOut.length;
                for (let i = 0; i < need; i += 1) {
                  const label = i === 0 && currentOut.length === 0 ? "Yes" : "No";
                  const newNodeId = generateNodeId();
                  next.nodes.push({
                    id: newNodeId,
                    type: "task",
                    name: label,
                    meta: { category: "処理" },
                    position: { x: (src.position?.x ?? 0) + 220, y: (src.position?.y ?? 0) + (i === 0 ? -80 : 80) },
                    lane: src.lane ? { row: src.lane.row, col: Math.min(src.lane.col + 1, (next.lanes?.cols.length ?? 2) - 1) } : undefined,
                    indexInCell: 0,
                  });
                  next.edges.push({
                    id: generateEdgeId(),
                    source: node.id,
                    target: newNodeId,
                    kind: "condition",
                    label,
                  });
                }
                return next;
              },
            });
          }
          if (out.length > 2) {
            fixes.push({
              id: `fix-branch-trim-${node.id}`,
              label: "余分な分岐を削除（先頭2本を維持）",
              priority: 20,
              apply: (doc) => {
                const next = cloneDoc(doc);
                const current = next.edges.filter((e) => e.source === node.id && e.kind !== "loop");
                const keep = new Set(current.slice(0, 2).map((e) => e.id));
                next.edges = next.edges.filter((e) => e.source !== node.id || e.kind === "loop" || keep.has(e.id));
                const keepEdges = next.edges.filter((e) => e.source === node.id && e.kind !== "loop");
                if (keepEdges[0]) keepEdges[0].label = "Yes";
                if (keepEdges[1]) keepEdges[1].label = "No";
                return next;
              },
            });
          }
          results.push({
            ruleId: "condition.two-branches",
            severity: "error",
            message: `分岐「${node.name}」の外向きエッジは2本必要です（現在 ${out.length} 本）`,
            targets: { nodes: [node.id], edges: out.map((e) => e.id) },
            fixes,
          });
        }
      }
      return results;
    },
  });

  rules.push({
    id: "role.approval-lane",
    name: "承認レーン整合",
    description: "承認タスクは承認レーンに置く",
    severityDefault: "warning",
    appliesToModes: ["roadmap"],
    check: ({ doc }) => {
      const laneRows = doc.lanes?.rows ?? [];
      const approvalRow = Math.max(
        0,
        laneRows.findIndex((r) => r.includes("承認") || r.includes("管理"))
      );
      const results: RuleResult[] = [];
      for (const node of doc.nodes) {
        if (nodeCategory(node) !== "承認") continue;
        if (!node.lane || node.lane.row !== approvalRow) {
          results.push({
            ruleId: "role.approval-lane",
            severity: "warning",
            message: `承認タスク「${node.name}」が承認レーン外にあります`,
            targets: { nodes: [node.id], lane: node.lane ?? { row: 0, col: 0 } },
            fixes: [laneMoveFix(node.id, approvalRow, node.lane?.col ?? 0, "承認レーンへ移動", 10)],
          });
        }
      }
      return results;
    },
  });

  rules.push({
    id: "notify.dedupe",
    name: "通知重複削減",
    description: "連続する通知ノードの重複を削減",
    severityDefault: "suggestion",
    check: ({ doc }) => {
      const results: RuleResult[] = [];
      for (const edge of doc.edges) {
        const source = doc.nodes.find((n) => n.id === edge.source);
        const target = doc.nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;
        if (nodeCategory(source) !== "通知" || nodeCategory(target) !== "通知") continue;
        results.push({
          ruleId: "notify.dedupe",
          severity: "suggestion",
          message: `連続通知を検出: ${source.name} → ${target.name}`,
          targets: { nodes: [source.id, target.id], edges: [edge.id] },
          fixes: [
            {
              id: `fix-notify-dedupe-${edge.id}`,
              label: "後段通知を統合して削除",
              priority: 30,
              apply: (doc) => {
                const next = cloneDoc(doc);
                const outgoing = next.edges.filter((e) => e.source === target.id);
                next.edges = next.edges.filter((e) => e.id !== edge.id && e.source !== target.id && e.target !== target.id);
                for (const out of outgoing) {
                  next.edges.push({ ...out, id: generateEdgeId(), source: source.id });
                }
                next.nodes = next.nodes.filter((n) => n.id !== target.id);
                return next;
              },
            },
          ],
        });
      }
      return results;
    },
  });

  rules.push({
    id: "structure.isolated",
    name: "孤立ノード",
    description: "未接続ノードに接続候補を提示",
    severityDefault: "warning",
    check: ({ doc }) => {
      const linked = new Set<NodeId>();
      for (const edge of doc.edges) {
        linked.add(edge.source);
        linked.add(edge.target);
      }
      const results: RuleResult[] = [];
      for (const node of doc.nodes) {
        if (linked.has(node.id)) continue;
        const candidates = doc.nodes
          .filter((n) => n.id !== node.id)
          .sort((a, b) => {
            const ax = a.position?.x ?? 0;
            const bx = b.position?.x ?? 0;
            return Math.abs(ax - (node.position?.x ?? 0)) - Math.abs(bx - (node.position?.x ?? 0));
          })
          .slice(0, 2);
        const fixes: Fix[] = candidates.map((cand, idx) => ({
          id: `fix-isolated-connect-${node.id}-${cand.id}`,
          label: `「${cand.name}」へ接続`,
          priority: 40 + idx,
          apply: (doc) => {
            const next = cloneDoc(doc);
            next.edges.push({
              id: generateEdgeId(),
              source: cand.id,
              target: node.id,
              kind: "normal",
            });
            return next;
          },
        }));
        results.push({
          ruleId: "structure.isolated",
          severity: "warning",
          message: `孤立ノード: ${node.name}`,
          targets: { nodes: [node.id] },
          fixes,
        });
      }
      return results;
    },
  });

  rules.push({
    id: "flow.no-back-edge",
    name: "逆流禁止",
    description: "loop以外で逆流する接続を抑制",
    severityDefault: "warning",
    check: ({ doc }) => {
      const results: RuleResult[] = [];
      for (const edge of doc.edges) {
        if (edge.kind === "loop") continue;
        const source = doc.nodes.find((n) => n.id === edge.source);
        const target = doc.nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const isBackInRoadmap = doc.mode === "roadmap" && source.lane && target.lane && target.lane.col < source.lane.col;
        const isBackInFree = doc.mode === "free" && source.position && target.position && target.position.x < source.position.x;

        if (!isBackInRoadmap && !isBackInFree) continue;

        const fixes: Fix[] = [];
        if (isBackInRoadmap && source.lane && target.lane) {
          fixes.push(laneMoveFix(target.id, target.lane.row, source.lane.col + 1, "列を前進方向へ再配置", 20));
        }
        if (isBackInFree && source.position && target.position) {
          fixes.push({
            id: `fix-backedge-move-${target.id}`,
            label: "終点ノードを右側へ移動",
            priority: 25,
            apply: (doc) => {
              const next = cloneDoc(doc);
              const t = next.nodes.find((n) => n.id === target.id);
              if (!t || !t.position) return doc;
              t.position.x = (source.position?.x ?? 0) + 220;
              return next;
            },
          });
        }

        results.push({
          ruleId: "flow.no-back-edge",
          severity: "warning",
          message: `逆流エッジを検出: ${source.name} → ${target.name}`,
          targets: { edges: [edge.id], nodes: [source.id, target.id] },
          fixes,
        });
      }
      return results;
    },
  });

  rules.push({
    id: "structure.no-cycle-normal",
    name: "通常循環禁止",
    description: "normal/conditionで循環してはいけない",
    severityDefault: "error",
    check: ({ doc, utils }) => {
      const results: RuleResult[] = [];
      for (const edge of doc.edges) {
        if (edge.kind === "loop") continue;
        const rest = doc.edges.filter((e) => e.id !== edge.id);
        const fakeDoc: FlowDoc = { ...doc, edges: rest };
        const fakeCtx = buildContext(fakeDoc);
        const formsCycle = fakeCtx.utils.createsCycleIfAdd(edge);
        if (!formsCycle) continue;

        const fixes: Fix[] = [
          {
            id: `fix-cycle-delete-${edge.id}`,
            label: "循環エッジを削除",
            priority: 10,
            apply: (doc) => {
              const next = cloneDoc(doc);
              next.edges = next.edges.filter((e) => e.id !== edge.id);
              return next;
            },
          },
        ];

        if (utils.isAncestor(edge.target, edge.source)) {
          fixes.push({
            id: `fix-cycle-loop-${edge.id}`,
            label: "循環エッジをloopへ変換",
            priority: 20,
            apply: (doc) => {
              const next = cloneDoc(doc);
              const target = next.edges.find((e) => e.id === edge.id);
              if (!target) return doc;
              target.kind = "loop";
              return next;
            },
          });
        }

        results.push({
          ruleId: "structure.no-cycle-normal",
          severity: "error",
          message: `通常エッジで循環が発生: ${edge.id}`,
          targets: { edges: [edge.id], nodes: [edge.source, edge.target] },
          fixes,
        });
      }
      return results;
    },
  });

  rules.push({
    id: "loop.only-to-ancestor",
    name: "loop祖先制約",
    description: "loopは祖先ノードのみを指せる",
    severityDefault: "error",
    check: ({ doc, utils }) => {
      const results: RuleResult[] = [];
      for (const edge of doc.edges) {
        if (edge.kind !== "loop") continue;
        const ok = utils.isAncestor(edge.target, edge.source);
        if (ok) continue;

        const sourceParents = doc.nodes.filter((n) => utils.isAncestor(n.id, edge.source));
        const alt = sourceParents[0];
        const fixes: Fix[] = [];
        if (alt) {
          fixes.push({
            id: `fix-loop-retarget-${edge.id}-${alt.id}`,
            label: `近い祖先「${alt.name}」へ付け替え`,
            priority: 10,
            apply: (doc) => {
              const next = cloneDoc(doc);
              const target = next.edges.find((e) => e.id === edge.id);
              if (!target) return doc;
              target.target = alt.id;
              return next;
            },
          });
        }
        fixes.push({
          id: `fix-loop-remove-${edge.id}`,
          label: "loop指定を解除（normalへ）",
          priority: 30,
          apply: (doc) => {
            const next = cloneDoc(doc);
            const target = next.edges.find((e) => e.id === edge.id);
            if (!target) return doc;
            target.kind = "normal";
            return next;
          },
        });

        results.push({
          ruleId: "loop.only-to-ancestor",
          severity: "error",
          message: `loopは祖先のみ許可: ${edge.source} -> ${edge.target}`,
          targets: { edges: [edge.id], nodes: [edge.source, edge.target] },
          fixes,
        });
      }
      return results;
    },
  });

  rules.push({
    id: "loop.excessive-ratio",
    name: "loop多用注意",
    description: "loop比率が閾値を超えると警告",
    severityDefault: "warning",
    check: ({ doc }) => {
      const loopEdges = doc.edges.filter((e) => e.kind === "loop");
      const ratio = doc.edges.length === 0 ? 0 : loopEdges.length / doc.edges.length;
      if (ratio <= 0.2) {
        return [];
      }
      const candidate = loopEdges[loopEdges.length - 1];
      return [
        {
          ruleId: "loop.excessive-ratio",
          severity: "warning",
          message: `loop比率が高すぎます (${Math.round(ratio * 100)}%)`,
          targets: { edges: loopEdges.map((e) => e.id) },
          fixes: candidate
            ? [
                {
                  id: `fix-loop-ratio-drop-${candidate.id}`,
                  label: "影響の小さいloopを1本削除",
                  priority: 50,
                  apply: (doc) => {
                    const next = cloneDoc(doc);
                    next.edges = next.edges.filter((e) => e.id !== candidate.id);
                    return next;
                  },
                },
              ]
            : [],
        },
      ];
    },
  });

  return rules;
}

export function getRulePacks(): RulePack[] {
  const rules = makeRules();
  return [
    {
      id: "core",
      name: "Core Pack",
      version: "1.0.0",
      rules: rules.filter((r) => r.id.startsWith("structure") || r.id.startsWith("flow") || r.id.startsWith("condition") || r.id.startsWith("loop") || r.id.startsWith("lane") || r.id.startsWith("integration")),
      defaultEnabled: rules
        .filter((r) => r.id.startsWith("structure") || r.id.startsWith("flow") || r.id.startsWith("condition") || r.id.startsWith("loop") || r.id.startsWith("lane") || r.id.startsWith("integration"))
        .map((r) => r.id),
    },
    {
      id: "domain",
      name: "Domain Pack",
      version: "1.0.0",
      rules: rules.filter((r) => r.id.startsWith("order") || r.id.startsWith("role") || r.id.startsWith("notify")),
      defaultEnabled: rules
        .filter((r) => r.id.startsWith("order") || r.id.startsWith("role") || r.id.startsWith("notify"))
        .map((r) => r.id),
    },
    {
      id: "company",
      name: "Company Pack",
      version: "1.0.0",
      rules: [],
      defaultEnabled: [],
    },
  ];
}

function allRules(packs: RulePack[]): Rule[] {
  return packs.flatMap((pack) => pack.rules);
}

export function defaultRuleSettings(packs: RulePack[]): RuleRuntimeSettings {
  const enabledSet = new Set(packs.flatMap((p) => p.defaultEnabled ?? p.rules.map((r) => r.id)));
  const settings: RuleRuntimeSettings = {};
  for (const rule of allRules(packs)) {
    settings[rule.id] = {
      enabled: enabledSet.has(rule.id),
      severity: rule.severityDefault,
      priorityBias: 0,
    };
  }
  return settings;
}

export function loadRuleSettings(packs: RulePack[]): RuleRuntimeSettings {
  const defaults = defaultRuleSettings(packs);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<RuleRuntimeSettings>;
    for (const key of Object.keys(defaults)) {
      const saved = parsed[key];
      if (!saved) continue;
      defaults[key] = {
        enabled: Boolean(saved.enabled),
        severity: saved.severity ?? defaults[key].severity,
        priorityBias: Number.isFinite(saved.priorityBias) ? saved.priorityBias : 0,
      };
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export function saveRuleSettings(settings: RuleRuntimeSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadFixDecisionHistory(): FixDecisionHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FixDecisionHistory;
  } catch {
    return {};
  }
}

export function saveFixDecisionHistory(history: FixDecisionHistory): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function decisionKey(ruleId: string, fixId: string): string {
  return `${ruleId}::${fixId}`;
}

function adjustedFixPriority(ruleId: string, fix: Fix, history: FixDecisionHistory): number {
  const base = fix.priority ?? 100;
  const stat = history[decisionKey(ruleId, fix.id)];
  if (!stat) return base;
  return base - stat.accepted * 0.5 + stat.rejected * 0.5;
}

function normalizeResults(results: RuleResult[]): RuleResult[] {
  const map = new Map<string, RuleResult>();
  for (const result of results) {
    const key = `${result.ruleId}|${result.message}|${(result.targets.nodes ?? []).join(",")}|${(result.targets.edges ?? []).join(",")}`;
    if (!map.has(key)) {
      map.set(key, result);
      continue;
    }
    const existing = map.get(key) as RuleResult;
    const existingFixes = existing.fixes ?? [];
    const nextFixes = result.fixes ?? [];
    existing.fixes = [...existingFixes, ...nextFixes];
    map.set(key, existing);
  }
  return [...map.values()];
}

export function evaluateRules(
  doc: FlowDoc,
  packs: RulePack[],
  settings: RuleRuntimeSettings,
  history: FixDecisionHistory
): ValidationMessage[] {
  const ctx = buildContext(doc);
  const ruleMetaById = new Map(allRules(packs).map((rule) => [rule.id, { name: rule.name, description: rule.description }]));
  const results: RuleResult[] = [];

  for (const rule of allRules(packs)) {
    const setting = settings[rule.id];
    if (!setting?.enabled) continue;
    if (rule.appliesToModes && !rule.appliesToModes.includes(doc.mode)) continue;

    try {
      const rows = rule.check(ctx).map((row) => ({
        ...row,
        severity: setting.severity,
      }));
      results.push(...rows);
    } catch (error) {
      results.push({
        ruleId: rule.id,
        severity: "error",
        message: `ルール実行エラー: ${rule.name}`,
        detail: error instanceof Error ? error.message : "unknown",
        targets: {},
      });
    }
  }

  const normalized = normalizeResults(results);

  const messages: ValidationMessage[] = normalized
    .map((result, idx) => {
      const ruleMeta = ruleMetaById.get(result.ruleId);
      const explainDetail = result.detail ?? (ruleMeta ? `${ruleMeta.name}: ${ruleMeta.description}` : undefined);
      const sortedFixes = [...(result.fixes ?? [])].sort(
        (a, b) => adjustedFixPriority(result.ruleId, a, history) - adjustedFixPriority(result.ruleId, b, history)
      );
      return {
        id: `vm-${idx}-${result.ruleId}`,
        ruleId: result.ruleId,
        type: result.severity,
        message: result.message,
        nodeId: result.targets.nodes?.[0],
        edgeId: result.targets.edges?.[0],
        targets: result.targets,
        fixes: sortedFixes,
        detail: explainDetail,
      };
    })
    .sort((a, b) => {
      const aWeight = severityScore(a.type);
      const bWeight = severityScore(b.type);
      if (aWeight !== bWeight) return aWeight - bWeight;
      const aBias = settings[a.ruleId ?? ""]?.priorityBias ?? 0;
      const bBias = settings[b.ruleId ?? ""]?.priorityBias ?? 0;
      return aBias - bBias;
    });

  return messages;
}

export function validateByRules(
  doc: FlowDoc,
  packs: RulePack[],
  settings: RuleRuntimeSettings,
  history: FixDecisionHistory
): { valid: boolean; messages: ValidationMessage[] } {
  const messages = evaluateRules(doc, packs, settings, history);
  const valid = messages.every((m) => m.type !== "error");
  return { valid, messages };
}

export function applySelectedFixes(
  doc: FlowDoc,
  messages: ValidationMessage[],
  selections: Array<{ messageId: string; fixId?: string }>
): FlowDoc {
  const selectionMap = new Map(selections.map((s) => [s.messageId, s.fixId]));
  const selectedMessages = messages
    .filter((message) => message.id && selectionMap.has(message.id))
    .sort((a, b) => {
      const aWeight = severityScore(a.type);
      const bWeight = severityScore(b.type);
      if (aWeight !== bWeight) {
        return aWeight - bWeight;
      }
      const aChosenId = selectionMap.get(a.id as string);
      const bChosenId = selectionMap.get(b.id as string);
      const aFix = (a.fixes ?? []).find((fix) => fix.id === aChosenId) ?? a.fixes?.[0];
      const bFix = (b.fixes ?? []).find((fix) => fix.id === bChosenId) ?? b.fixes?.[0];
      return (aFix?.priority ?? 100) - (bFix?.priority ?? 100);
    });

  let next = cloneDoc(doc);
  for (const message of selectedMessages) {
    const fixes = message.fixes ?? [];
    if (fixes.length === 0) continue;
    const pickedId = selectionMap.get(message.id as string);
    const picked = fixes.find((fix) => fix.id === pickedId) ?? fixes[0];
    next = picked.apply(next);
  }
  return next;
}

export function recordFixDecision(
  history: FixDecisionHistory,
  ruleId: string,
  fixId: string,
  accepted: boolean
): FixDecisionHistory {
  const key = decisionKey(ruleId, fixId);
  const prev = history[key] ?? { accepted: 0, rejected: 0 };
  const next = {
    accepted: prev.accepted + (accepted ? 1 : 0),
    rejected: prev.rejected + (accepted ? 0 : 1),
  };
  return {
    ...history,
    [key]: next,
  };
}

export function findConflictingFixTargets(messages: ValidationMessage[]): Map<string, string[]> {
  const hitMap = new Map<string, string[]>();
  for (const message of messages) {
    if (!message.id) continue;
    const nodes = message.targets?.nodes ?? [];
    const edges = message.targets?.edges ?? [];
    const keys = [...nodes.map((n) => `N:${n}`), ...edges.map((e) => `E:${e}`)];
    for (const key of keys) {
      const current = hitMap.get(key) ?? [];
      current.push(message.id);
      hitMap.set(key, current);
    }
  }
  return hitMap;
}

export function enforceEdgePolicy(doc: FlowDoc, edge: EdgeData): { allowed: boolean; reason?: string } {
  const ctx = buildContext(doc);
  if (edge.kind === "loop") {
    if (!ctx.utils.isAncestor(edge.target, edge.source)) {
      return { allowed: false, reason: "loopは祖先ノードへの接続のみ許可されています" };
    }
    return { allowed: true };
  }

  if (ctx.utils.createsCycleIfAdd(edge)) {
    return { allowed: false, reason: "normal/conditionエッジで循環を作る操作は禁止です" };
  }

  return { allowed: true };
}
