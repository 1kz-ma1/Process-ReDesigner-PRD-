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
import type { NodeId, NodeData, RuleSeverity, RuleRuntimeSettings, ValidationMessage } from "../models/types";
import { templates } from "../templates";
import { mergeWithTemplate, replaceWithTemplate } from "../utils/templateApply";
import Toolbar from "./Toolbar";
import CanvasRoot from "./CanvasRoot";
import PropertyPanel from "./PropertyPanel";
import ValidationPanel from "./ValidationPanel.tsx";
import TemplateModal from "./TemplateModal";
import "../styles/app.css";

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
  const [showProperties, setShowProperties] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [ruleSettingsOpen, setRuleSettingsOpen] = useState(false);

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

  // 選択ノード取得
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return store.current.nodes.find((n) => n.id === selectedNodeId);
  }, [selectedNodeId, store.current.nodes]);

  const showStartGuide = store.current.nodes.length === 0;
  const validationCount = validation.messages.length;

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
    setSelectedNodeId(id);
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
        onAutoLayout={() => {
          const newDoc = autoLayout(store.current);
          store.setDocument(newDoc);
        }}
        onToggleProperties={() => setShowProperties(!showProperties)}
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
      <main className={`app-main main ${showProperties ? "" : "right-hidden"}`}>
        <aside className="left-rail" aria-label="クイック操作">
          <button onClick={() => setTemplateOpen(true)}>{getLabel("open_template_modal")}</button>
          <button onClick={handleQuickAdd}>{getLabel("add_block")}</button>
          <button onClick={() => setRuleSettingsOpen((v) => !v)} aria-expanded={ruleSettingsOpen}>
            ルール設定（任意）
          </button>

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
            />
          </div>
        </section>

        <aside className="right-panel-slot" aria-hidden={!showProperties}>
          {showProperties && (
            <PropertyPanel
              node={selectedNode ?? null}
              onUpdateNode={(patch) => {
                if (selectedNodeId) {
                  store.updateNode(selectedNodeId, patch);
                }
              }}
            />
          )}
        </aside>
      </main>

      {/* 検証ログ（下部） */}
      <ValidationPanel
        validation={validation}
        defaultCollapsed={true}
        open={validationOpen}
        onOpenChange={setValidationOpen}
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
