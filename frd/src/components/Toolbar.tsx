import { useState } from "react";
import { useFlowStore } from "../store/flowStore";

export function Toolbar() {
  const flow = useFlowStore((s) => s.flow);
  const iterations = useFlowStore((s) => s.iterations);
  const saveIteration = useFlowStore((s) => s.saveIteration);
  const exportJson = useFlowStore((s) => s.exportJson);
  const importJsonFile = useFlowStore((s) => s.importJsonFile);
  const [message, setMessage] = useState("");

  return (
    <header className="panel topbar">
      <div>
        <h1>Flow ReDesigner (FRD)</h1>
        <p className="muted">
          {flow?.name} / v{flow?.version ?? 0} / Iterations: {iterations.length}
        </p>
      </div>
      <div className="row">
        <button onClick={() => saveIteration("手動保存")}>Iteration保存</button>
        <button onClick={exportJson}>JSON出力</button>
        <label className="file-label">
          JSON入力
          <input
            type="file"
            accept=".json,.frd.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const error = await importJsonFile(file);
              setMessage(error ?? "読み込みました");
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </header>
  );
}
