import type { BlockType } from "../models/types";
import { TYPE_LABELS } from "../utils/typeLabels";

interface BlockPaletteProps {
  blockTypes: BlockType[];
  onAdd: (type: BlockType) => void;
}

export function BlockPalette({ blockTypes, onAdd }: BlockPaletteProps) {
  return (
    <section className="panel palette-panel">
      <h2>ブロックパレット</h2>
      <p className="muted">工程ブロックをクリックして追加</p>
      <div className="palette-grid">
        {blockTypes.map((type) => (
          <button key={type} className={`block-chip type-${type.toLowerCase()}`} onClick={() => onAdd(type)}>
            {TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>
    </section>
  );
}
