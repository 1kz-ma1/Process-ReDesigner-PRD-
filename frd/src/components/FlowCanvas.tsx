import { useMemo, useEffect, useRef, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useFlowStore } from "../store/flowStore";

export function FlowCanvas() {
  // Feature flags / dev helpers
  const SHOW_DEBUG = false; // set true temporarily during deep debugging

  const flow = useFlowStore((s) => s.flow);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const selectBlock = useFlowStore((s) => s.selectBlock);

  const nodes = useMemo<Node[]>(() => {
    if (!flow) return [];
    return flow.blocks.map((b) => ({
      id: String(b.id),
      position: { x: Number(b.x) || 0, y: Number(b.y) || 0 },
      data: { label: b.name ?? '(無題)' },
      className: "rf-node"
    }));
  }, [flow?.version]);

  const edges = useMemo<Edge[]>(() => {
    if (!flow) return [];
    return flow.edges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      label: e.label
    }));
  }, [flow]);

  const selectedBlockId = useFlowStore((s) => s.selectedBlockId);
  const rf = useReactFlow();
  const addBlock = useFlowStore((s) => s.addBlock);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const prevNodesCountRef = useRef<number>(0);
  const dropLockRef = useRef(false);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    try {
      // allow drop
      (event.dataTransfer as DataTransfer).dropEffect = "copy";
    } catch {
      // ignore
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      // ignore closely spaced duplicate drop events
      if (dropLockRef.current) {
        // eslint-disable-next-line no-console
        console.debug("handleDrop ignored: locked");
        return;
      }
      dropLockRef.current = true;
      setTimeout(() => {
        dropLockRef.current = false;
      }, 250);
      try {
        const type = (event.dataTransfer && (event.dataTransfer.getData("application/reactflow") || event.dataTransfer.getData("text/plain"))) || "";
        if (!type) return;
        if (!containerRef.current) {
          // fallback to store's center compute
          addBlock(type as any, undefined, undefined, "canvas-drop-fallback");
          return;
        }
        // Compute coordinates and convert to flow coords.
        try {
          const rect = containerRef.current!.getBoundingClientRect();
          const relX = event.clientX - rect.left;
          const relY = event.clientY - rect.top;
          let pos: { x: number; y: number } | undefined;

          // Prefer modern API: screenToFlowPosition accepts screen/client coordinates
          if ((rf as any)?.screenToFlowPosition) {
            try {
              pos = (rf as any).screenToFlowPosition({ x: event.clientX, y: event.clientY });
            } catch {
              // ignore and fallback
            }
          }

          // Fallback to deprecated project (some versions expect container-relative coords)
          if (!pos && rf.project) {
            try {
              pos = rf.project({ x: relX, y: relY });
            } catch {
              // ignore
            }
          }

          // Last-resort fallback: compute inverse of viewport transform to map screen->flow
          if (!pos) {
            try {
              const container = containerRef.current;
              const vp = container?.querySelector('.react-flow__viewport') as HTMLElement | null;
              const rect = container?.getBoundingClientRect();
              if (vp && rect) {
                const t = vp.style.transform || getComputedStyle(vp).transform || '';
                const mm = /matrix\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(t);
                if (mm) {
                  const a = Number(mm[1]);
                  const tx = Number(mm[5]);
                  const ty = Number(mm[6]);
                  const scale = Number(a || 1);
                  pos = { x: (relX - tx) / scale, y: (relY - ty) / scale };
                } else {
                  const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)\s*scale\((-?\d+(?:\.\d+)?)\)/.exec(t || '');
                  if (m) {
                    const tx = Number(m[1]);
                    const ty = Number(m[2]);
                    const scale = Number(m[3]);
                    pos = { x: (relX - tx) / scale, y: (relY - ty) / scale };
                  }
                }
              }
            } catch {}
          }

          // Final fallback: container-relative (best effort)
          if (!pos) pos = { x: relX, y: relY };

          addBlock(type as any, Math.round(pos.x), Math.round(pos.y), "canvas-drop");
        } catch (err) {
          // fallback
          // eslint-disable-next-line no-console
          console.error("handleDrop mapping error", err);
          addBlock(type as any, undefined, undefined, "canvas-drop-fallback");
        }
      } catch {
        // safest fallback
        const t = event.dataTransfer && event.dataTransfer.getData("application/reactflow");
        if (t) addBlock(t as any, undefined, undefined, "canvas-drop-dataTransfer");
      }
    },
    [rf, addBlock]
  );

  useEffect(() => {
    if (!selectedBlockId) return;
    const node = nodes.find((n) => n.id === selectedBlockId);
    if (!node) return;
    try {
      (rf as any).panTo(node.position as { x: number; y: number });
    } catch {
      // ignore
    }
  }, [selectedBlockId, nodes, rf]);

  // When nodes change, ensure the viewport fits them so newly added nodes are visible.
  useEffect(() => {
    try {
      if (!nodes || nodes.length === 0) return;
      // prefer screenToFlowPosition/fitted API if available
      if ((rf as any)?.fitView) {
        try {
          (rf as any).fitView({ padding: 0.15 });
        } catch {}
        // ensure fitView runs after render commit as well
        setTimeout(() => {
          try {
            (rf as any).fitView({ padding: 0.15 });
          } catch {}
        }, 60);
      } else if ((rf as any).zoomTo) {
        try {
          (rf as any).zoomTo(1);
        } catch {}
      }

      // If nodes increased, schedule a requestAnimationFrame to handle viewport updates
      try {
        const prev = prevNodesCountRef.current || 0;
        if (nodes.length > prev) {
          const last = nodes[nodes.length - 1];
          // Batch DOM reads/writes inside rAF to avoid forced reflows
          requestAnimationFrame(() => {
            try {
              // try reactflow panTo first
              if (last && (rf as any)?.panTo) {
                try {
                  (rf as any).panTo(last.position);
                } catch {}
                // retry after short delays to let layout settle
                setTimeout(() => {
                  try {
                    (rf as any).panTo(last.position);
                  } catch {}
                }, 160);
              }

              // compute container rect once
              const container = containerRef.current;
              const rect = container?.getBoundingClientRect();
              const zoom = 1;

              // prefer reactflow API if available
              if ((rf as any)?.setViewport && rect) {
                const vx = Math.round(-last.position.x * zoom + rect.width / 2);
                const vy = Math.round(-last.position.y * zoom + rect.height / 2);
                try {
                  (rf as any).setViewport({ x: vx, y: vy, zoom });
                } catch {}
              }

              // Last-resort: directly set viewport transform (DOM write)
              try {
                const vp = container?.querySelector('.react-flow__viewport') as HTMLElement | null;
                if (vp && rect) {
                  vp.style.transition = 'none';
                  vp.style.transform = `translate(${Math.round(rect.width / 2 - last.position.x)}px, ${Math.round(
                    rect.height / 2 - last.position.y
                  )}px) scale(${zoom})`;
                }

                // verify node intersection inside rAF to avoid layout thrash
                requestAnimationFrame(() => {
                  try {
                    const nodeEl = container?.querySelector(`.react-flow__node[data-id="${last.id}"]`) as HTMLElement | null;
                    const nodeRect = nodeEl?.getBoundingClientRect();
                    const contRect = container?.getBoundingClientRect();
                    if (nodeRect && contRect) {
                      const intersects = !(nodeRect.right < contRect.left || nodeRect.left > contRect.right || nodeRect.bottom < contRect.top || nodeRect.top > contRect.bottom);
                      if (!intersects && vp && contRect) {
                        const dx = Math.round(contRect.width / 2 - (nodeRect.left - contRect.left + nodeRect.width / 2));
                        const dy = Math.round(contRect.height / 2 - (nodeRect.top - contRect.top + nodeRect.height / 2));
                        vp.style.transform = `translate(${dx}px, ${dy}px) scale(${zoom})`;
                      }
                    }
                  } catch {}
                });
              } catch {}
            } catch {}
          });
        }
        prevNodesCountRef.current = nodes.length;
      } catch {
        // ignore
      }
    } catch {
      // ignore errors from reactflow API differences
    }
  }, [nodes.length, rf]);

  useEffect(() => {
    // debug: log nodes count when flow changes
    // eslint-disable-next-line no-console
    console.debug("FlowCanvas nodes count:", nodes.length, "flow version:", (flow as any)?.version);
  }, [nodes, flow]);

  // Debug overlay: render red markers at block positions (screen coords)
  useEffect(() => {
    if (!SHOW_DEBUG) return;
    try {
      if (!containerRef.current) return;
      if (!overlayRef.current) {
        const ov = document.createElement('div');
        ov.className = 'debug-overlay';
        ov.style.position = 'absolute';
        ov.style.left = '0';
        ov.style.top = '0';
        ov.style.width = '100%';
        ov.style.height = '100%';
        ov.style.pointerEvents = 'none';
        containerRef.current.appendChild(ov);
        overlayRef.current = ov;
      }
      const ov = overlayRef.current!;
      ov.innerHTML = '';
      const blocks = (flow?.blocks ?? []) as Array<any>;
      blocks.forEach((b, idx) => {
        try {
          let screen = { x: b.x, y: b.y };
          // Prefer modern API: flowToScreenPosition (if available)
          if ((rf as any)?.flowToScreenPosition) {
            try {
              screen = (rf as any).flowToScreenPosition({ x: b.x, y: b.y });
            } catch {}
          }

          // Fallback to deprecated project if present
          else if (rf.project) {
            try {
              screen = rf.project({ x: b.x, y: b.y });
            } catch {}
          } else {
            // Last-resort: compute using viewport transform matrix/translate+scale
            try {
              const container = containerRef.current;
              const vp = container?.querySelector('.react-flow__viewport') as HTMLElement | null;
              const rect = container?.getBoundingClientRect();
              if (vp && rect) {
                const t = vp.style.transform || getComputedStyle(vp).transform || '';
                const mm = /matrix\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(t);
                if (mm) {
                  const a = Number(mm[1]);
                  const tx = Number(mm[5]);
                  const ty = Number(mm[6]);
                  const scale = Number(a || 1);
                  screen = { x: Math.round(b.x * scale + tx + rect.left), y: Math.round(b.y * scale + ty + rect.top) };
                } else {
                  const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)\s*scale\((-?\d+(?:\.\d+)?)\)/.exec(t || '');
                  if (m) {
                    const tx = Number(m[1]);
                    const ty = Number(m[2]);
                    const scale = Number(m[3]);
                    screen = { x: Math.round(b.x * scale + tx + rect.left), y: Math.round(b.y * scale + ty + rect.top) };
                  }
                }
              }
            } catch {}
          }

          const m = document.createElement('div');
          m.className = 'debug-marker';
          m.style.position = 'absolute';
          m.style.left = `${Math.round(screen.x)}px`;
          m.style.top = `${Math.round(screen.y)}px`;
          m.style.transform = 'translate(-50%, -50%)';
          m.style.zIndex = '2000';
          m.textContent = `${b.type}[${idx}]`;
          ov.appendChild(m);
        } catch {}
      });
    } catch (err) {
      // ignore
    }
  }, [flow, nodes.length, rf]);

  return (
    <section className="panel canvas-wrap">
      <h2>フローキャンバス</h2>
      <div className="canvas-box" ref={containerRef}>
        <ReactFlow
          key={`rf-${(flow as any)?.version ?? 0}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={(e) => handleDrop(e as unknown as DragEvent)}
          onDragOver={(e) => handleDragOver(e as unknown as DragEvent)}
          fitView
          onNodeClick={(_, node) => selectBlock(node.id)}
        >
          <MiniMap />
          <Controls />
          <Background />
            </ReactFlow>

          {/* Center view button for debugging/QA */}
          <button
            onClick={() => {
              try {
                const container = containerRef.current;
                const vp = container?.querySelector('.react-flow__viewport') as HTMLElement | null;
                const nodeEl = container?.querySelector('.react-flow__node') as HTMLElement | null;
                if (!container || !vp || !nodeEl) return;
                const cont = container.getBoundingClientRect();
                const nr = nodeEl.getBoundingClientRect();
                const dx = Math.round(cont.width / 2 - (nr.left - cont.left + nr.width / 2));
                const dy = Math.round(cont.height / 2 - (nr.top - cont.top + nr.height / 2));
                vp.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
              } catch {}
            }}
            style={{ position: 'absolute', right: 8, top: 8, zIndex: 3000 }}
          >
            Center view
          </button>
        </div>
    </section>
  );
}
