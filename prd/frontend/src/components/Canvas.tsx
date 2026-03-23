import { useMemo, useState } from "react";
import type { Block, Edge } from "../models/types";
import { TYPE_LABELS } from "../utils/typeLabels";

interface CanvasProps {
  blocks: Block[];
  edges: Edge[];
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (fromBlockId: string, toBlockId: string, label?: string) => void;
}

export function Canvas({ blocks, edges, selectedBlockId, onSelect, onDelete, onConnect }: CanvasProps) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [label, setLabel] = useState("");

  const edgeLabels = useMemo(() => {
    return edges.map((edge) => `${edge.fromBlockId.slice(0, 6)} -> ${edge.toBlockId.slice(0, 6)} ${edge.label ?? ""}`);
  }, [edges]);

  return (
    <section className="panel canvas-panel">
      <header className="panel-header">
        <h2>フローキャンバス</h2>
        <p className="muted">配置済みブロック: {blocks.length} / 接続: {edges.length}</p>
      </header>

      <div className="canvas-grid">
        {blocks.map((block) => (
          <article
            key={block.id}
            className={`canvas-block ${selectedBlockId === block.id ? "selected" : ""}`}
            onClick={() => onSelect(block.id)}
          >
            <div className="canvas-block-head">
              <strong>{block.name}</strong>
              <span>{TYPE_LABELS[block.type] ?? block.type}</span>
            </div>
            <div className="canvas-block-body">
              <small>x:{block.x} y:{block.y}</small>
              <button className="danger-link" onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}>
                削除
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="edge-builder">
        <h3>接続作成</h3>
        <div className="edge-builder-row">
          <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value="">送信元を選択</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">送信先を選択</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ラベル／条件" />
          <button
            onClick={() => {
              if (!fromId || !toId || fromId === toId) return;
              onConnect(fromId, toId, label);
              setLabel("");
            }}
          >
            接続
          </button>
        </div>
        <ul className="edge-list">
          {edgeLabels.map((text, idx) => (
            <li key={`${text}-${idx}`}>{text}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
