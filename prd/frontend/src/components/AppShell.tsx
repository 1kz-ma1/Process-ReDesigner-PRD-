/**
 * AppShell
 * メインレイアウト：ツールバー / キャンバス / プロパティパネル / 検証ログ
 */

import { useEffect, useMemo, useState } from "react";
import { useFlowStore } from "../hooks/useFlowStore";
import {
  applyValidationFixes,
  getDefaultRuleSettings,
  getDefaultRulePacks,
  persistFixDecisionHistory,
  persistRuleSettings,
  readFixDecisionHistory,
  readRuleSettings,
  updateFixDecisionHistory,
  validateFlow,
} from "../utils/validator.ts";
import { autoLayout } from "../utils/layout";
import { injectDesignTokens } from "../utils/designTokens";
import { getLabel } from "../utils/i18n";
import type {
  NodeId,
  NodeData,
  RuleSeverity,
  RuleRuntimeSettings,
  UIFlags,
  PatchHistoryItem,
  ValidationBadgeSettings,
  ValidationCounts,
  ValidationMessage,
  LaneConnectionType,
  SystemType,
} from "../models/types";
import { templates } from "../templates";
import { mergeWithTemplate, replaceWithTemplate } from "../utils/templateApply";
import { calcAnalysisMetrics } from "../utils/analysisMetrics";
import Toolbar from "./Toolbar";
import CanvasRoot from "./CanvasRoot";
import PropertyPanel from "./PropertyPanel";
import ValidationPanel from "./ValidationPanel.tsx";
import TemplateModal from "./TemplateModal";
import AnalysisPanel from "./AnalysisPanel";
import PaneSplitter from "./PaneSplitter";
import ValidationFloatingBadge from "./ValidationFloatingBadge";
import { exportKintoneAppJson } from "../utils/kintoneExport";
import "../styles/app.css";

const DEFAULT_VALIDATION_BADGE_SETTINGS: ValidationBadgeSettings = {
  visibility: "auto",
  threshold: {
    minCount: 1,
  },
};

const PATCH_HISTORY_KEY = "prd.ui.patchHistory.v1";

export default function AppShell() {
  // デザイントークン inject
  useMemo(() => {
    injectDesignTokens();
  }, []);

  const store = useFlowStore();
  const packs = useMemo(() => getDefaultRulePacks(), []);
  const allRules = useMemo(() => packs.flatMap((pack) => pack.rules), [packs]);
  const recommendedRuleSettings = useMemo(() => getDefaultRuleSettings(packs), [packs]);
  const [ruleSettings, setRuleSettings] = useState<RuleRuntimeSettings>(() => readRuleSettings(packs));
  const [fixHistory, setFixHistory] = useState(() => readFixDecisionHistory());
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [rightPaneOpen, setRightPaneOpen] = useState(() => {
    const stored = localStorage.getItem("rdf.ui.rightPane.state");
    return stored ? JSON.parse(stored) : true;
  });
  const [rightPaneWidth, setRightPaneWidth] = useState(() => {
    const stored = localStorage.getItem("rdf.ui.rightPane.width");
    return stored ? parseInt(stored, 10) : 320;
  });
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationFocusTo, setValidationFocusTo] = useState<"error" | "warning" | "info" | undefined>(undefined);
  const [validationFocusRequestKey, setValidationFocusRequestKey] = useState(0);
  const [validationScrollMode, setValidationScrollMode] = useState<"priority" | "top">("priority");
  const [ruleSettingsOpen, setRuleSettingsOpen] = useState(false);
  const [uiFlags, setUiFlags] = useState<UIFlags>({
    improveHighlight: false,
    smartAddAutoConnect: false,
  });
  const [validationBadgeSettings] = useState<ValidationBadgeSettings>(() => {
    const stored = localStorage.getItem("rdf.ui.validationBadge.settings");
    if (!stored) {
      return DEFAULT_VALIDATION_BADGE_SETTINGS;
    }
    try {
      const parsed = JSON.parse(stored) as ValidationBadgeSettings;
      return {
        visibility: parsed.visibility ?? "auto",
        threshold: {
          minCount: parsed.threshold?.minCount ?? 1,
          minLevel: parsed.threshold?.minLevel,
        },
      };
    } catch {
      return DEFAULT_VALIDATION_BADGE_SETTINGS;
    }
  });
  const [patchHistory, setPatchHistory] = useState<PatchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(PATCH_HISTORY_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as PatchHistoryItem[];
      return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
    } catch {
      return [];
    }
  });

  const isEditableEventTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target.isContentEditable) {
      return true;
    }
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  };

  const isUsingRecommendedRules = useMemo(() => {
    const keys = Object.keys(recommendedRuleSettings);
    if (keys.length !== Object.keys(ruleSettings).length) {
      return false;
    }
    for (const key of keys) {
      const current = ruleSettings[key];
      const recommended = recommendedRuleSettings[key];
      if (!current || !recommended) {
        return false;
      }
      if (
        current.enabled !== recommended.enabled ||
        current.severity !== recommended.severity ||
        current.priorityBias !== recommended.priorityBias
      ) {
        return false;
      }
    }
    return true;
  }, [recommendedRuleSettings, ruleSettings]);

  // バリデーション実行
  const validation = useMemo(() => {
    return validateFlow(store.current, {
      packs,
      settings: ruleSettings,
      history: fixHistory,
    });
  }, [fixHistory, packs, ruleSettings, store.current]);

  useEffect(() => {
    persistRuleSettings(ruleSettings);
  }, [ruleSettings]);

  useEffect(() => {
    persistFixDecisionHistory(fixHistory);
  }, [fixHistory]);

  useEffect(() => {
    localStorage.setItem(PATCH_HISTORY_KEY, JSON.stringify(patchHistory.slice(0, 50)));
  }, [patchHistory]);

  // localStorage に右ペイン状態を保存
  useEffect(() => {
    localStorage.setItem("rdf.ui.rightPane.state", JSON.stringify(rightPaneOpen));
  }, [rightPaneOpen]);

  // localStorage に右ペイン幅を保存
  useEffect(() => {
    localStorage.setItem("rdf.ui.rightPane.width", String(rightPaneWidth));
  }, [rightPaneWidth]);

  // 画面幅監視（レスポンシブ）
  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1024;
      setIsSmallScreen(small);
      if (small && rightPaneOpen) {
        // 小画面でモーダル表示に自動切替（既に開いている場合は保持）
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 右ペイン折り畳みのショートカット (Shift+P)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setRightPaneOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPrimary = event.ctrlKey || event.metaKey;
      if (!isPrimary || isEditableEventTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        if (store.canUndo) {
          store.undo();
        }
        return;
      }

      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (isRedo) {
        event.preventDefault();
        if (store.canRedo) {
          store.redo();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [store]);

  // 選択ノード取得
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return store.current.nodes.find((n) => n.id === selectedNodeId);
  }, [selectedNodeId, store.current.nodes]);

  const showStartGuide = store.current.nodes.length === 0;
  const validationCount = validation.messages.length;
  const validationCounts = useMemo<ValidationCounts>(() => {
    const counts = validation.messages.reduce(
      (acc, message) => {
        if (message.type === "error") {
          acc.error += 1;
        } else if (message.type === "warning") {
          acc.warning += 1;
        } else {
          acc.info += 1;
        }
        return acc;
      },
      { error: 0, warning: 0, info: 0, total: 0 },
    );
    counts.total = counts.error + counts.warning + counts.info;
    return counts;
  }, [validation.messages]);

  const selectedNodeSuggestions = useMemo(() => {
    if (!selectedNodeId) {
      return [];
    }
    const order = { error: 0, warning: 1, suggestion: 2, info: 3 } as const;
    return validation.messages
      .filter((m) => (m.targets?.nodes ?? []).includes(selectedNodeId))
      .sort((a, b) => order[a.type] - order[b.type])
      .slice(0, 3);
  }, [selectedNodeId, validation.messages]);

  const backflowCount = useMemo(() => {
    return validation.messages.filter((m) => m.ruleId === "flow.no-back-edge").length;
  }, [validation.messages]);

  const analysisMetrics = useMemo(() => {
    return calcAnalysisMetrics(store.current, backflowCount);
  }, [backflowCount, store.current]);

  const handleRunValidate = () => {
    const latest = validateFlow(store.current, {
      packs,
      settings: ruleSettings,
      history: fixHistory,
    });
    store.setValidation(latest);
    setValidationOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("validation-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleOpenValidationFromBadge = (focusTo?: "error" | "warning" | "info") => {
    const alreadyOpen = validationOpen;
    setValidationOpen(true);
    setValidationScrollMode(alreadyOpen ? "top" : "priority");
    setValidationFocusTo(focusTo);
    setValidationFocusRequestKey((prev) => prev + 1);
    if (!alreadyOpen) {
      requestAnimationFrame(() => {
        document.getElementById("validation-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const refreshValidation = (doc: typeof store.current) => {
    const latest = validateFlow(doc, {
      packs,
      settings: ruleSettings,
      history: fixHistory,
    });
    store.setValidation(latest);
    setValidationOpen(true);
  };

  const rememberFixDecision = (msg: ValidationMessage, fixId: string | undefined, accepted: boolean) => {
    if (!msg.ruleId || !fixId) {
      return;
    }
    setFixHistory((prev) => updateFixDecisionHistory(prev, msg.ruleId as string, fixId, accepted));
  };

  const appendPatchHistory = (entry: Omit<PatchHistoryItem, "id" | "timestamp">) => {
    setPatchHistory((prev) => [
      {
        id: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        ...entry,
      },
      ...prev,
    ].slice(0, 50));
  };

  const handleApplyFixMessage = (msg: ValidationMessage, selectedFixId?: string) => {
    try {
      if (!msg.id || !msg.fixes || msg.fixes.length === 0) {
        setNotice("この指摘には適用可能なFixがありません");
        return;
      }
      const targetFixId = selectedFixId ?? msg.fixes[0].id;
      const nextDoc = applyValidationFixes(store.current, validation.messages, [{ messageId: msg.id, fixId: targetFixId }]);
      store.setDocument(nextDoc);
      rememberFixDecision(msg, targetFixId, true);
      const appliedFix = msg.fixes?.find((fix) => fix.id === targetFixId) ?? msg.fixes?.[0];
      appendPatchHistory({
        mode: "single",
        summary: `${msg.ruleId ?? "unknown"}: ${appliedFix?.label ?? "Fix適用"}`,
      });
      refreshValidation(nextDoc);
      setNotice("Fixを適用しました");
    } catch (err) {
      setNotice(`Fix適用に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  const handleApplyBulk = (items: Array<{ messageId: string; fixId?: string }>) => {
    try {
      if (items.length === 0) {
        return;
      }
      const nextDoc = applyValidationFixes(store.current, validation.messages, items);
      store.setDocument(nextDoc);

      for (const item of items) {
        const message = validation.messages.find((m) => m.id === item.messageId);
        const fixId = item.fixId ?? message?.fixes?.[0]?.id;
        if (message && fixId) {
          rememberFixDecision(message, fixId, true);
        }
      }

      appendPatchHistory({
        mode: "bulk",
        summary: `${items.length} 件のFixをまとめて適用`,
      });

      refreshValidation(nextDoc);
      setNotice(`${items.length}件のFixをまとめて適用しました`);
    } catch (err) {
      setNotice(`まとめ適用に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  const handleIgnoreMessage = (msg: ValidationMessage) => {
    const fixId = msg.fixes?.[0]?.id;
    rememberFixDecision(msg, fixId, false);
    setNotice("この提案を今回無視しました（優先度学習に反映）");
  };

  const updateRuleSetting = (ruleId: string, patch: Partial<RuleRuntimeSettings[string]>) => {
    setRuleSettings((prev) => {
      const current = prev[ruleId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [ruleId]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleQuickAdd = () => {
    const vp = store.current.viewport ?? { x: 0, y: 0, zoom: 1 };
    const safeZoom = Number.isFinite(vp.zoom) && vp.zoom > 0 ? vp.zoom : 1;
    const container = document.querySelector(".canvas-root") as HTMLElement | null;
    const rect = container ? container.getBoundingClientRect() : null;
    const centerX = rect ? rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.height / 2 : window.innerHeight / 2;
    const worldX = -vp.x + centerX / safeZoom;
    const worldY = -vp.y + centerY / safeZoom;
    const id = store.addNode("task", "新規タスク", worldX, worldY, {});
    const fallbackLaneId = store.current.systemLanes?.[0]?.laneId;
    if (fallbackLaneId) {
      store.updateNode(id, { laneId: fallbackLaneId, lane: { row: 0, col: 0 } });
    }
    setSelectedNodeId(id);
  };

  const addSystemLane = () => {
    const laneCount = store.current.systemLanes?.length ?? 0;
    const nextLane = {
      laneId: `lane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `システム${laneCount + 1}`,
      systemType: "custom" as SystemType,
    };
    store.setDocument({
      ...store.current,
      systemLanes: [...(store.current.systemLanes ?? []), nextLane],
    });
  };

  const updateSystemLane = (laneId: string, patch: { name?: string; systemType?: SystemType }) => {
    store.setDocument({
      ...store.current,
      systemLanes: (store.current.systemLanes ?? []).map((lane) =>
        lane.laneId === laneId ? { ...lane, ...patch } : lane
      ),
    });
  };

  const deleteSystemLane = (laneId: string) => {
    const lanes = store.current.systemLanes ?? [];
    if (lanes.length <= 1) {
      setNotice("最低1つのシステムレーンは必要です");
      return;
    }
    const fallback = lanes.find((lane) => lane.laneId !== laneId)?.laneId;
    if (!fallback) {
      return;
    }

    const reassignedNodes = store.current.nodes.map((node) =>
      node.laneId === laneId ? { ...node, laneId: fallback } : node
    );

    const nextConnections = (store.current.laneConnections ?? []).filter(
      (connection) => connection.from.laneId !== laneId && connection.to.laneId !== laneId
    );

    store.setDocument({
      ...store.current,
      nodes: reassignedNodes,
      systemLanes: lanes.filter((lane) => lane.laneId !== laneId),
      laneConnections: nextConnections,
    });
  };

  const addLaneConnection = (input: {
    fromLaneId: string;
    fromBlockId: string;
    toLaneId: string;
    toBlockId: string;
    type: LaneConnectionType;
    payload?: string;
  }) => {
    const nextConnection = {
      connectionId: `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      from: { laneId: input.fromLaneId, blockId: input.fromBlockId },
      to: { laneId: input.toLaneId, blockId: input.toBlockId },
      type: input.type,
      payload: input.payload,
    };

    store.setDocument({
      ...store.current,
      laneConnections: [...(store.current.laneConnections ?? []), nextConnection],
    });
  };

  const updateLaneConnection = (connectionId: string, patch: { type: LaneConnectionType; payload?: string }) => {
    store.setDocument({
      ...store.current,
      laneConnections: (store.current.laneConnections ?? []).map((connection) =>
        connection.connectionId === connectionId
          ? { ...connection, ...patch }
          : connection
      ),
    });
  };

  const deleteLaneConnection = (connectionId: string) => {
    store.setDocument({
      ...store.current,
      laneConnections: (store.current.laneConnections ?? []).filter(
        (connection) => connection.connectionId !== connectionId
      ),
    });
  };

  const handleExportKintone = () => {
    const payload = exportKintoneAppJson(store.current, "PRD Generated App");
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "prd-kintone-app.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("kintone用JSONを出力しました");
  };

  const applyReplace = (templateKey: string) => {
    const selected = templates.find((t) => t.key === templateKey);
    if (!selected) return;

    if (store.current.nodes.length > 0) {
      const confirmed = window.confirm(getLabel("replace_confirm"));
      if (!confirmed) return;
    }

    try {
      const nextDoc = replaceWithTemplate(selected);
      const result = validateFlow(nextDoc, {
        packs,
        settings: ruleSettings,
        history: fixHistory,
      });
      if (!result.valid) {
        throw new Error(result.messages.map((m) => m.message).join("\n"));
      }

      store.setDocument(nextDoc);
      setTemplateOpen(false);
      setSelectedNodeId(nextDoc.nodes[0]?.id ?? null);
      setNotice(`テンプレート「${selected.name}」を適用しました`);
    } catch (err) {
      setNotice(`${getLabel("apply_failed")}: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  const applyMerge = (templateKey: string) => {
    const selected = templates.find((t) => t.key === templateKey);
    if (!selected) return;

    try {
      const merged = mergeWithTemplate(store.current, selected);
      const result = validateFlow(merged, {
        packs,
        settings: ruleSettings,
        history: fixHistory,
      });
      if (!result.valid) {
        throw new Error(result.messages.map((m) => m.message).join("\n"));
      }

      store.setDocument(merged);
      setTemplateOpen(false);
      setNotice(`テンプレート「${selected.name}」をマージしました`);
    } catch (err) {
      setNotice(`${getLabel("merge_failed")}: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  return (
    <div className="app-shell app">
      {/* ツールバー */}
      <Toolbar
        mode={store.current.mode}
        onSetMode={store.setMode}
        onQuickAdd={handleQuickAdd}
        onOpenTemplates={() => setTemplateOpen(true)}
        validationCount={validationCount}
        onValidate={handleRunValidate}
        onUndo={store.undo}
        onRedo={store.redo}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        improveHighlight={uiFlags.improveHighlight}
        onToggleImproveHighlight={() => setUiFlags((prev) => ({ ...prev, improveHighlight: !prev.improveHighlight }))}
        onAutoLayout={() => {
          const newDoc = autoLayout(store.current);
          store.setDocument(newDoc);
        }}
        onToggleProperties={() => setRightPaneOpen((v: boolean) => !v)}
        rightPaneOpen={rightPaneOpen && !isSmallScreen}
        onExportKintone={handleExportKintone}
      />

      <ValidationFloatingBadge
        counts={validationCounts}
        settings={validationBadgeSettings}
        onOpenPanel={handleOpenValidationFromBadge}
      />

      {notice && (
        <div className="app-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="通知を閉じる">✕</button>
        </div>
      )}

      {showStartGuide && (
        <section className="start-guide-banner">
          <strong>{getLabel("start_guide")}</strong>
          <p>{getLabel("start_guide_desc")}</p>
          <div className="start-guide-actions">
            <button onClick={() => setTemplateOpen(true)}>{getLabel("open_template_modal")}</button>
            <button onClick={handleQuickAdd}>{getLabel("add_block")}</button>
          </div>
        </section>
      )}

      {/* メインレイアウト */}
      <main className={`app-main main ${rightPaneOpen && !isSmallScreen ? "" : "right-hidden"}`}>
        <aside className="left-rail" aria-label="クイック操作">
          <button onClick={() => setTemplateOpen(true)}>{getLabel("open_template_modal")}</button>
          <button onClick={handleQuickAdd}>{getLabel("add_block")}</button>
          <button onClick={() => setRuleSettingsOpen((v) => !v)} aria-expanded={ruleSettingsOpen}>
            ルール設定（任意）
          </button>
          <label className="left-rail-toggle">
            <input
              type="checkbox"
              checked={uiFlags.smartAddAutoConnect}
              onChange={(e) => setUiFlags((prev) => ({ ...prev, smartAddAutoConnect: e.target.checked }))}
            />
            スマート追加時に自動配線
          </label>

          {ruleSettingsOpen && (
            <section className="rule-settings" aria-label="ルール設定">
              <div className="rule-settings-summary">
                <strong>{isUsingRecommendedRules ? "推奨設定を使用中" : "カスタム設定を使用中"}</strong>
                <p>通常は推奨設定のままで問題ありません。必要な場合のみ調整してください。</p>
                <div className="rule-settings-actions">
                  <button
                    type="button"
                    onClick={() => setRuleSettings(recommendedRuleSettings)}
                    disabled={isUsingRecommendedRules}
                  >
                    推奨に戻す
                  </button>
                </div>
              </div>
              {allRules.map((rule) => {
                const setting = ruleSettings[rule.id];
                if (!setting) {
                  return null;
                }
                return (
                  <div className="rule-setting-item" key={rule.id}>
                    <strong>{rule.name}</strong>
                    <label>
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        onChange={(e) => updateRuleSetting(rule.id, { enabled: e.target.checked })}
                      />
                      ON
                    </label>
                    <label>
                      Severity
                      <select
                        value={setting.severity}
                        onChange={(e) => updateRuleSetting(rule.id, { severity: e.target.value as RuleSeverity })}
                      >
                        <option value="error">error</option>
                        <option value="warning">warning</option>
                        <option value="suggestion">suggestion</option>
                      </select>
                    </label>
                    <label>
                      優先度
                      <input
                        type="number"
                        value={setting.priorityBias}
                        onChange={(e) => updateRuleSetting(rule.id, { priorityBias: Number(e.target.value) || 0 })}
                      />
                    </label>
                  </div>
                );
              })}
            </section>
          )}
        </aside>

        <section className="canvas-wrap" aria-label="フローキャンバス">
          <div className="canvas-inner">
            <CanvasRoot
              doc={store.current}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onViewportChange={(x: number, y: number, zoom: number) => store.setViewport(x, y, zoom)}
              onAddNode={(type: "task" | "condition", name: string, x: number, y: number) => store.addNode(type, name, x, y)}
              onUpdateNode={(id: string, patch: Partial<NodeData>) => store.updateNode(id, patch)}
              onDeleteNode={store.deleteNode}
              onAddEdge={(source: string, target: string, kind: "normal" | "condition" | "loop", label?: string) => store.addEdge(source, target, kind, label)}
              onUpdateEdge={(id: string, patch: any) => store.updateEdge(id, patch)}
              onDeleteEdge={store.deleteEdge}
              validationMessages={validation.messages}
              improveHighlight={uiFlags.improveHighlight}
              smartAddAutoConnect={uiFlags.smartAddAutoConnect}
              onAddSystemLane={addSystemLane}
              onUpdateSystemLane={updateSystemLane}
              onDeleteSystemLane={deleteSystemLane}
              onAddLaneConnection={addLaneConnection}
              onUpdateLaneConnection={updateLaneConnection}
              onDeleteLaneConnection={deleteLaneConnection}
              onExportKintone={handleExportKintone}
              onJumpToValidation={(msg) => {
                setValidationOpen(true);
                if (msg.nodeId) {
                  setSelectedNodeId(msg.nodeId);
                }
              }}
            />
          </div>
        </section>

        {/* Splitter（デスクトップのみ） */}
        {rightPaneOpen && !isSmallScreen && (
          <PaneSplitter
            minWidth={240}
            maxWidth={520}
            initialWidth={rightPaneWidth}
            onWidthChange={setRightPaneWidth}
          />
        )}

        {/* 右ペイン（デスクトップ: サイドバー / モバイル: modal overlay） */}
        {isSmallScreen && rightPaneOpen && (
          <div className="right-panel-modal-overlay" onClick={() => setRightPaneOpen(false)}>
            <div className="right-panel-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="right-panel-close" onClick={() => setRightPaneOpen(false)} aria-label="閉じる">✕</button>
              <PropertyPanel
                node={selectedNode ?? null}
                inlineSuggestions={selectedNodeSuggestions}
                onApplySuggestion={(msg, fixId) => handleApplyFixMessage(msg, fixId)}
                onUpdateNode={(patch) => {
                  if (selectedNodeId) {
                    store.updateNode(selectedNodeId, patch);
                  }
                }}
              />
              <AnalysisPanel
                metrics={analysisMetrics}
                onFocusWarnings={() => {
                  handleOpenValidationFromBadge("warning");
                }}
              />
            </div>
          </div>
        )}

        {!isSmallScreen && (
          <aside className="right-panel-slot" aria-hidden={!rightPaneOpen}>
            {rightPaneOpen && (
              <PropertyPanel
                node={selectedNode ?? null}
                inlineSuggestions={selectedNodeSuggestions}
                onApplySuggestion={(msg, fixId) => handleApplyFixMessage(msg, fixId)}
                onUpdateNode={(patch) => {
                  if (selectedNodeId) {
                    store.updateNode(selectedNodeId, patch);
                  }
                }}
              />
            )}

            <AnalysisPanel
              metrics={analysisMetrics}
              onFocusWarnings={() => {
                handleOpenValidationFromBadge("warning");
              }}
            />
          </aside>
        )}
      </main>

      {/* 検証ログ（下部） */}
      <ValidationPanel
        validation={validation}
        defaultCollapsed={true}
        open={validationOpen}
        onOpenChange={setValidationOpen}
        openTargetSeverity={validationFocusTo}
        focusRequestKey={validationFocusRequestKey}
        scrollMode={validationScrollMode}
        patchHistory={patchHistory}
        onClearPatchHistory={() => setPatchHistory([])}
        onApplyFix={handleApplyFixMessage}
        onApplyBulk={handleApplyBulk}
        onIgnoreMessage={handleIgnoreMessage}
        onSelectMessage={(msg: any) => {
          if (msg.nodeId) {
            setSelectedNodeId(msg.nodeId);
          }
        }}
      />

      <TemplateModal
        open={templateOpen}
        templates={templates}
        onClose={() => setTemplateOpen(false)}
        onApplyReplace={(template) => applyReplace(template.key)}
        onApplyMerge={(template) => applyMerge(template.key)}
      />
    </div>
  );
}
