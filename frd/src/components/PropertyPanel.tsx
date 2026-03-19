import { useMemo, useState } from "react";
import { useFlowStore } from "../store/flowStore";

export function PropertyPanel() {
  const flow = useFlowStore((s) => s.flow);
  const selectedBlockId = useFlowStore((s) => s.selectedBlockId);
  const updateName = useFlowStore((s) => s.updateSelectedName);
  const updateMeta = useFlowStore((s) => s.updateSelectedMeta);
  const deleteBlock = useFlowStore((s) => s.deleteBlock);

  const block = useMemo(
    () => flow?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [flow, selectedBlockId]
  );

  const [metaText, setMetaText] = useState("{}");
  const [message, setMessage] = useState("");

  if (!block) {
    return (
      <section className="panel">
        <h2>プロパティ</h2>
        <p className="muted">ブロックを選択してください。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>プロパティ</h2>
      <div className="field">
        <label>名前</label>
        <input value={block.name} onChange={(e) => updateName(e.target.value)} />
      </div>
      <div className="field">
        <label>meta(JSON)</label>
        <textarea
          rows={10}
          defaultValue={JSON.stringify(block.meta, null, 2)}
          onChange={(e) => setMetaText(e.target.value)}
        />
      </div>
      <div className="row">
        <button
          onClick={() => {
            const text = metaText.trim().length > 0 ? metaText : JSON.stringify(block.meta);
            const error = updateMeta(text);
            setMessage(error ?? "保存しました");
          }}
        >
          metaを保存
        </button>
        <button className="danger" onClick={() => deleteBlock(block.id)}>
          削除
        </button>
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
