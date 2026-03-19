import type { Iteration } from "../models/types";

interface ToolbarProps {
  flowName?: string;
  onSaveIteration: () => void;
  onLoadIterations: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  iterations: Iteration[];
}

export function Toolbar({ flowName, onSaveIteration, onLoadIterations, onExport, onImport, iterations }: ToolbarProps) {
  return (
    <section className="panel toolbar-panel">
      <div className="toolbar-left">
        <h1>プロセスリデザイナー (PRD)</h1>
        <p className="muted">フロー: {flowName ?? "読み込み中..."}</p>
      </div>
      <div className="toolbar-actions">
        <button onClick={onSaveIteration}>Iteration保存</button>
        <button onClick={onLoadIterations}>履歴読み込み</button>
        <label className="file-button">
          JSON入力
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImport(file);
              }
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button onClick={onExport}>JSON出力</button>
      </div>
      <div className="toolbar-iterations">
        <span>イテレーション数: {iterations.length}</span>
      </div>
    </section>
  );
}
