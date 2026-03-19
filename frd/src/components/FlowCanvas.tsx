import { useMemo, useEffect, useRef, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useFlowStore } from "../store/flowStore";

export function FlowCanvas() {
  const flow = useFlowStore((s) => s.flow);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const selectBlock = useFlowStore((s) => s.selectBlock);

  const nodes = useMemo<Node[]>(() => {
    if (!flow) return [];
    return flow.blocks.map((b) => ({
      id: b.id,
      position: { x: b.x, y: b.y },
      data: { label: b.name },
      className: "rf-node"
    }));
  }, [flow]);

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
      try {
        const type = (event.dataTransfer && (event.dataTransfer.getData("application/reactflow") || event.dataTransfer.getData("text/plain"))) || "";
        if (!type) return;
        if (!containerRef.current) {
          // fallback to store's center compute
          addBlock(type as any);
          return;
        }
        const bounds = containerRef.current.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const pos = rf.project({ x, y });
        addBlock(type as any, Math.round(pos.x), Math.round(pos.y));
      } catch {
        // safest fallback
        const t = event.dataTransfer && event.dataTransfer.getData("application/reactflow");
        if (t) addBlock(t as any);
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

  return (
    <section className="panel canvas-wrap">
      <h2>フローキャンバス</h2>
      <div className="canvas-box" ref={containerRef}>
        <ReactFlow
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
      </div>
    </section>
  );
}
