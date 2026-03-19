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
          <button
            key={b.type}
            className="secondary"
            onClick={() => addBlock(b.type)}
            draggable={true}
            onDragStart={(e) => {
              try {
                e.dataTransfer?.setData("application/reactflow", b.type);
                e.dataTransfer!.effectAllowed = "copy";
              } catch {
                // ignore
              }
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </section>
  );
}
