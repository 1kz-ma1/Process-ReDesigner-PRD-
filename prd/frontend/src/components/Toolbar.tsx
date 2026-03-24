/**
 * Toolbar
 * ツールバー：モード切替、Undo/Redo、Validate、Auto Layout、Zoom etc
 */

import { getLabel } from "../utils/i18n";

interface ToolbarProps {
  mode: "roadmap" | "free";
  onSetMode: (mode: "roadmap" | "free") => void;
  onQuickAdd: () => void;
  onOpenTemplates: () => void;
  validationCount: number;
  onValidate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoLayout: () => void;
  onToggleProperties: () => void;
  improveHighlight: boolean;
  onToggleImproveHighlight: () => void;
  rightPaneOpen: boolean;
  onExportKintone: () => void;
}

export default function Toolbar({
  mode,
  onSetMode,
  onQuickAdd,
  onOpenTemplates,
  validationCount,
  onValidate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoLayout,
  onToggleProperties,
  improveHighlight,
  onToggleImproveHighlight,
  rightPaneOpen,
  onExportKintone,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <h1>🔄 PRD-プロセスリデザイナー</h1>
      </div>

      <div className="toolbar-group mode-selector">
        <label>
          {getLabel("mode_roadmap")}:
          <input
            type="radio"
            name="mode"
            value="roadmap"
            checked={mode === "roadmap"}
            onChange={() => onSetMode("roadmap")}
          />
        </label>
        <label>
          {getLabel("mode_free")}:
          <input
            type="radio"
            name="mode"
            value="free"
            checked={mode === "free"}
            onChange={() => onSetMode("free")}
          />
        </label>
      </div>

      <div className="toolbar-group">
        <button onClick={onQuickAdd} title={getLabel("add_block")}>
          ＋ {getLabel("add_block")}
        </button>
        <button onClick={onOpenTemplates} title={getLabel("open_template_modal")}>
          🧩 {getLabel("open_template_modal")}
        </button>
        <button onClick={onExportKintone} title="kintoneレーンをJSON出力">
          ⬇ kintone JSON
        </button>
        <button className="btn-with-badge" onClick={onValidate} title={getLabel("validate")}>
          {getLabel("validate")}
          {validationCount > 0 && (
            <span className="badge-dot" aria-label={`検証結果 ${validationCount} 件`}>
              {validationCount > 99 ? "99+" : validationCount}
            </span>
          )}
        </button>
        <button onClick={onAutoLayout} title="自動整列">
          📐 {getLabel("auto_layout")}
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={onUndo} disabled={!canUndo} title={getLabel("undo")}>
          ↶ {getLabel("undo")}
        </button>
        <button onClick={onRedo} disabled={!canRedo} title={getLabel("redo")}>
          ↷ {getLabel("redo")}
        </button>
        <button onClick={onToggleImproveHighlight} title="改善をハイライト">
          {improveHighlight ? "🟢 改善ハイライトON" : "⚪ 改善ハイライト"}
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={onToggleProperties} title={getLabel("toggle_properties")} className={rightPaneOpen ? "btn-active" : ""}>
          ⚙️ {getLabel("toggle_properties")} {rightPaneOpen ? "✓" : ""}
        </button>
      </div>
    </header>
  );
}
