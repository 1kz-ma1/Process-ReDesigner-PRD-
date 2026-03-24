import { useEffect, useMemo, useRef, useState } from "react";
import type { ValidationResult, ValidationMessage, PatchHistoryItem } from "../models/types";
import { getLabel } from "../utils/i18n";

interface ValidationPanelProps {
  validation: ValidationResult;
  onSelectMessage: (msg: ValidationMessage) => void;
  defaultCollapsed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openTargetSeverity?: "error" | "warning" | "info";
  focusRequestKey?: number;
  scrollMode?: "priority" | "top";
  patchHistory?: PatchHistoryItem[];
  onClearPatchHistory?: () => void;
  onApplyFix?: (msg: ValidationMessage, fixId?: string) => void;
  onIgnoreMessage?: (msg: ValidationMessage) => void;
  onApplyBulk?: (items: Array<{ messageId: string; fixId?: string }>) => void;
}

export default function ValidationPanel({
  validation,
  onSelectMessage,
  defaultCollapsed = true,
  open,
  onOpenChange,
  openTargetSeverity,
  focusRequestKey = 0,
  scrollMode = "priority",
  patchHistory = [],
  onClearPatchHistory,
  onApplyFix,
  onIgnoreMessage,
  onApplyBulk,
}: ValidationPanelProps) {
  const [internalOpen, setInternalOpen] = useState(!defaultCollapsed);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedFixByRow, setSelectedFixByRow] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
      return;
    }
    setInternalOpen(next);
  };

  const { errors, warnings, suggestions } = useMemo(() => {
    const errors = validation.messages.filter((m) => m.type === "error");
    const warnings = validation.messages.filter((m) => m.type === "warning");
    const suggestions = validation.messages.filter((m) => m.type === "suggestion" || m.type === "info");
    return { errors, warnings, suggestions };
  }, [validation.messages]);

  const isValid = validation.valid;
  const count = errors.length + warnings.length + suggestions.length;

  useEffect(() => {
    if (!isOpen || focusRequestKey <= 0) {
      return;
    }

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      panel.focus();
      const body = bodyRef.current;

      if (scrollMode === "top") {
        body?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const targetClass = openTargetSeverity ?? "error";
      const target = panel.querySelector<HTMLElement>(`li.${targetClass}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        body?.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, [focusRequestKey, isOpen, openTargetSeverity, scrollMode]);

  const toggleRow = (messageId: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(messageId);
      } else {
        next.delete(messageId);
      }
      return next;
    });
  };

  const pickFix = (messageId: string, fixId: string) => {
    setSelectedFixByRow((prev) => ({ ...prev, [messageId]: fixId }));
  };

  const getConfidenceLabel = (msg: ValidationMessage): "高" | "中" | "低" => {
    if (msg.type === "error") {
      return "高";
    }
    if ((msg.fixes?.length ?? 0) > 0) {
      return "中";
    }
    return "低";
  };

  const getImpactText = (msg: ValidationMessage, chosenFixId?: string): string => {
    const nodeCount = msg.targets?.nodes?.length ?? 0;
    const edgeCount = msg.targets?.edges?.length ?? 0;
    const scope = nodeCount + edgeCount;
    const selectedFix = (msg.fixes ?? []).find((fix) => fix.id === chosenFixId) ?? msg.fixes?.[0];

    const scopeText = scope > 0 ? `対象 ${scope} 箇所` : "対象範囲は局所";
    if (!selectedFix) {
      return `${scopeText} - 手動対応が必要です`;
    }
    return `${scopeText} - 「${selectedFix.label}」を適用`;
  };

  const renderRows = (messages: ValidationMessage[], className: "error" | "warning" | "info") => {
    return (
      <ul>
        {messages.map((msg, idx) => {
          const msgId = msg.id ?? `${className}-${idx}`;
          const fixes = msg.fixes ?? [];
          const chosenFixId = selectedFixByRow[msgId] ?? fixes[0]?.id;
          const isChecked = selectedRows.has(msgId);
          const showDetail = detailsOpen[msgId] ?? false;

          return (
            <li key={msgId} className={className} onClick={() => onSelectMessage(msg)}>
              <input
                type="checkbox"
                aria-label="まとめて適用に含める"
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => toggleRow(msgId, e.target.checked)}
              />
              <div className="validation-row-main">
                <span>{msg.message}</span>
                {msg.nodeId && <span className="id">#{msg.nodeId}</span>}
                {msg.edgeId && <span className="id">#{msg.edgeId}</span>}

                {fixes.length > 1 && (
                  <div className="fix-choice" onClick={(e) => e.stopPropagation()}>
                    {fixes.map((fix) => (
                      <label key={fix.id}>
                        <input
                          type="radio"
                          name={`fix-choice-${msgId}`}
                          checked={chosenFixId === fix.id}
                          onChange={() => pickFix(msgId, fix.id)}
                        />
                        {fix.label}
                      </label>
                    ))}
                  </div>
                )}

                {showDetail && (
                  <div className="validation-detail explainability-card">
                    <div>rule: {msg.ruleId ?? "-"}</div>
                    {msg.detail && <div>reason: {msg.detail}</div>}
                    <div>impact: {getImpactText(msg, chosenFixId)}</div>
                    <div className="confidence-row">
                      confidence: <span className={`confidence-badge ${getConfidenceLabel(msg) === "高" ? "high" : getConfidenceLabel(msg) === "中" ? "medium" : "low"}`}>{getConfidenceLabel(msg)}</span>
                    </div>
                    {msg.targets?.nodes && msg.targets.nodes.length > 0 && <div>nodes: {msg.targets.nodes.join(", ")}</div>}
                    {msg.targets?.edges && msg.targets.edges.length > 0 && <div>edges: {msg.targets.edges.join(", ")}</div>}
                  </div>
                )}
              </div>

              <div className="validation-actions" onClick={(e) => e.stopPropagation()}>
                {onApplyFix && fixes.length > 0 && (
                  <button className="fix-btn" onClick={() => onApplyFix(msg, chosenFixId)}>
                    適用
                  </button>
                )}
                {onIgnoreMessage && (
                  <button className="fix-btn ghost" onClick={() => onIgnoreMessage(msg)}>
                    無視
                  </button>
                )}
                <button
                  className="fix-btn ghost"
                  onClick={() => setDetailsOpen((prev) => ({ ...prev, [msgId]: !showDetail }))}
                >
                  根拠
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section
      id="validation-results"
      className="validation-panel validation"
      aria-label={getLabel("validation_results")}
      ref={panelRef}
      tabIndex={-1}
    >
      <button className="validation__header" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}>
        <strong>{getLabel("validation_results")}</strong>
        {count > 0 ? (
          <span className="badge" aria-label={`検証結果 ${count}件`}>
            {count > 99 ? "99+" : count}
          </span>
        ) : (
          <small>✓ {getLabel("all_valid")}</small>
        )}
      </button>

      {isOpen && (
        <div className="validation__body" ref={bodyRef}>
          {isValid && <div className="validation-summary success">✓ {getLabel("all_valid")}</div>}

          {selectedRows.size > 0 && onApplyBulk && (
            <div className="validation-bulk-actions">
              <button
                className="fix-btn"
                onClick={() => {
                  const payload = [...selectedRows].map((messageId) => ({
                    messageId,
                    fixId: selectedFixByRow[messageId],
                  }));
                  onApplyBulk(payload);
                  setSelectedRows(new Set());
                }}
              >
                選択項目をまとめて適用
              </button>
            </div>
          )}

          <section className="patch-history" aria-label="Fix適用履歴">
            <div className="patch-history-head">
              <strong>Fix適用履歴</strong>
              {onClearPatchHistory && patchHistory.length > 0 && (
                <button className="fix-btn ghost" onClick={onClearPatchHistory}>履歴クリア</button>
              )}
            </div>
            {patchHistory.length === 0 ? (
              <p className="muted">まだ履歴はありません</p>
            ) : (
              <ul className="patch-history-list">
                {patchHistory.slice(0, 10).map((item) => (
                  <li key={item.id} className="patch-history-item">
                    <span className={`patch-mode ${item.mode}`}>{item.mode === "bulk" ? "一括" : "単発"}</span>
                    <span>{item.summary}</span>
                    <time>{new Date(item.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {errors.length > 0 && (
            <div className="message-group">
              <h3 className="error">エラー</h3>
              {renderRows(errors, "error")}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="message-group">
              <h3 className="warning">警告</h3>
              {renderRows(warnings, "warning")}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="message-group">
              <h3 className="info">提案</h3>
              {renderRows(suggestions, "info")}
            </div>
          )}

          {validation.messages.length === 0 && isValid && <div className="empty">{getLabel("no_messages")}</div>}
        </div>
      )}
    </section>
  );
}
