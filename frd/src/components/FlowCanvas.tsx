import { useMemo, useEffect } from "react";
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
      <div className="canvas-box">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
