import { useEffect, useState } from "react";
import type { Block } from "../models/types";

interface PropertyPanelProps {
  block: Block | null;
  onUpdate: (id: string, patch: Partial<Block>) => void;
}

export function PropertyPanel({ block, onUpdate }: PropertyPanelProps) {
  const [name, setName] = useState("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [meta, setMeta] = useState("{}");

  useEffect(() => {
    if (!block) {
      setName("");
      setX(0);
      setY(0);
      setMeta("{}");
      return;
    }
    setName(block.name);
    setX(block.x);
    setY(block.y);
    setMeta(JSON.stringify(block.meta, null, 2));
  }, [block]);

  const disabled = !block;

  const onSave = () => {
    if (!block) return;
    try {
      const parsed = JSON.parse(meta) as Record<string, unknown>;
      onUpdate(block.id, { name, x, y, meta: parsed });
    } catch {
      alert("meta JSON が不正です");
    }
  };

  return (
    <section className="panel property-panel">
      <h2>プロパティ</h2>
      {!block && <p className="muted">ブロックを選択すると編集できます</p>}
      <div className="form-grid">
        <label>名前</label>
        <input value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />

        <label>X座標</label>
        <input type="number" value={x} disabled={disabled} onChange={(e) => setX(Number(e.target.value))} />

        <label>Y座標</label>
        <input type="number" value={y} disabled={disabled} onChange={(e) => setY(Number(e.target.value))} />

        <label>meta (JSON)</label>
        <textarea value={meta} disabled={disabled} onChange={(e) => setMeta(e.target.value)} rows={12} />
      </div>
      <button disabled={disabled} onClick={onSave}>保存</button>
    </section>
  );
}
