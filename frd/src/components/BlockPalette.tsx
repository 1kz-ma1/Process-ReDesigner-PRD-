import { blockCatalog } from "../models/blockCatalog";
import { useFlowStore } from "../store/flowStore";

export function BlockPalette() {
  const addBlock = useFlowStore((s) => s.addBlock);
  const computeCanvasCenter = () => {
    try {
      const el = document.querySelector(".canvas-box") as HTMLElement | null;
      if (!el) return { x: 300, y: 120 };
      const rect = el.getBoundingClientRect();
      const clientCenterX = rect.left + rect.width / 2;
      const clientCenterY = rect.top + rect.height / 2;

      const vp = el.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (vp) {
        const t = vp.style.transform || getComputedStyle(vp).transform || "";
        const mm = /matrix\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(t);
        if (mm) {
          const a = Number(mm[1]);
          const tx = Number(mm[5]);
          const ty = Number(mm[6]);
          const scale = Number(a || 1);
          if (Number.isFinite(scale) && scale !== 0) {
            const cx = Math.round((clientCenterX - rect.left - tx) / scale);
            const cy = Math.round((clientCenterY - rect.top - ty) / scale);
            return { x: cx, y: cy };
          }
        }

        const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)\s*scale\((-?\d+(?:\.\d+)?)\)/.exec(t || "");
        if (m) {
          const tx = Number(m[1]);
          const ty = Number(m[2]);
          const scale = Number(m[3]);
          if (Number.isFinite(scale) && scale !== 0) {
            const cx = Math.round((clientCenterX - rect.left - tx) / scale);
            const cy = Math.round((clientCenterY - rect.top - ty) / scale);
            return { x: cx, y: cy };
          }
        }
      }

      return { x: Math.round(rect.width / 2), y: Math.round(rect.height / 2) };
    } catch {
      return { x: 300, y: 120 };
    }
  };

  return (
    <section className="panel">
      <h2>ブロックパレット</h2>
      <p className="muted">クリックで追加</p>
      <div className="grid-2">
        {blockCatalog.map((b) => (
          <button
            key={b.type}
            className="secondary"
            onClick={() => {
              try {
                const c = computeCanvasCenter();
                addBlock(b.type as any, Math.round(c.x), Math.round(c.y), "palette-click");
              } catch {
                addBlock(b.type as any, undefined, undefined, "palette-click");
              }
            }}
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
