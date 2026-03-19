import { blockCatalog } from "../models/blockCatalog";
import { useFlowStore } from "../store/flowStore";

export function BlockPalette() {
  const addBlock = useFlowStore((s) => s.addBlock);

  return (
    <section className="panel">
      <h2>ブロックパレット</h2>
      <p className="muted">クリックで追加</p>
      <div className="grid-2">
        {blockCatalog.map((b) => (
          <button key={b.type} className="secondary" onClick={() => addBlock(b.type)}>
            {b.label}
          </button>
        ))}
      </div>
    </section>
  );
}
