/**
 * Toolbar
 * ツールバー：モード切替、Undo/Redo、Validate、Auto Layout、Zoom etc
 */

import { getLabel } from "../utils/i18n";

interface ToolbarProps {
  mode: "roadmap" | "free";
  onSetMode: (mode: "roadmap" | "free") => void;
  onValidate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoLayout: () => void;
  onToggleProperties: () => void;
}

export default function Toolbar({
  mode,
  onSetMode,
  onValidate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoLayout,
  onToggleProperties,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <h1>🔄 RDF プロセスリデザイナー</h1>
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
        <button onClick={onValidate} title={getLabel("validate")}>
          {getLabel("validate")}
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
      </div>

      <div className="toolbar-group">
        <button onClick={onToggleProperties} title={getLabel("toggle_properties")}>
          ⚙️ {getLabel("toggle_properties")}
        </button>
      </div>
    </header>
  );
}
