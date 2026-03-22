/**
 * ValidationPanel
 * 下部パネル：バリデーション結果（エラー・警告りスト）
 */

import { useMemo } from "react";
import type { ValidationResult, ValidationMessage } from "../models/types";
import { getLabel } from "../utils/i18n";

interface ValidationPanelProps {
  validation: ValidationResult;
  onSelectMessage: (msg: ValidationMessage) => void;
}

export default function ValidationPanel({ validation, onSelectMessage }: ValidationPanelProps) {
  const { errors, warnings, infos } = useMemo(() => {
    const errors = validation.messages.filter((m) => m.type === "error");
    const warnings = validation.messages.filter((m) => m.type === "warning");
    const infos = validation.messages.filter((m) => m.type === "info");
    return { errors, warnings, infos };
  }, [validation.messages]);

  const isValid = validation.valid;

  return (
    <aside className="validation-panel">
      <h2>{getLabel("validation_results")}</h2>

      {isValid && (
        <div className="validation-summary success">
          <p>✓ {getLabel("all_valid")}</p>
        </div>
      )}

      {!isValid && (
        <div className="validation-summary">
          {errors.length > 0 && <p className="error">エラー: {errors.length}件</p>}
          {warnings.length > 0 && <p className="warning">警告: {warnings.length}件</p>}
          {infos.length > 0 && <p className="info">情報: {infos.length}件</p>}
        </div>
      )}

      {errors.length > 0 && (
        <div className="message-group">
          <h3 className="error">エラー</h3>
          <ul>
            {errors.map((msg, idx) => (
              <li key={idx} className="error" onClick={() => onSelectMessage(msg)}>
                <span>{msg.message}</span>
                {msg.nodeId && <span className="id">#{msg.nodeId}</span>}
                {msg.edgeId && <span className="id">#{msg.edgeId}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="message-group">
          <h3 className="warning">警告</h3>
          <ul>
            {warnings.map((msg, idx) => (
              <li key={idx} className="warning" onClick={() => onSelectMessage(msg)}>
                <span>{msg.message}</span>
                {msg.nodeId && <span className="id">#{msg.nodeId}</span>}
                {msg.edgeId && <span className="id">#{msg.edgeId}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {infos.length > 0 && (
        <div className="message-group">
          <h3 className="info">情報</h3>
          <ul>
            {infos.map((msg, idx) => (
              <li key={idx} className="info" onClick={() => onSelectMessage(msg)}>
                <span>{msg.message}</span>
                {msg.nodeId && <span className="id">#{msg.nodeId}</span>}
                {msg.edgeId && <span className="id">#{msg.edgeId}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.messages.length === 0 && isValid && (
        <div className="empty">{getLabel("no_messages")}</div>
      )}
    </aside>
  );
}
