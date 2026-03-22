import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { designTokens } from "../utils/designTokens";
import "../styles/edge.css";
export default function EdgeView({ edge, nodes, isSelected, onDelete }) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode)
        return null;
    // 開始・終端座標（ノード中心）
    const x1 = sourceNode.position.x;
    const y1 = sourceNode.position.y;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y;
    // 直線／ベジェ曲線選択（簡略版：直線 + 矢印）
    const strokeColor = edge.kind === "loop"
        ? designTokens.edgeLoopStrokeColor
        : isSelected
            ? designTokens.edgeSelectedStrokeColor
            : designTokens.edgeStrokeColor;
    const strokeDasharray = edge.kind === "loop" ? "5,5" : "none";
    // 矢印マーカー
    const markerId = `arrow-${edge.id.slice(0, 8)}`;
    return (_jsxs("g", { className: `edge-view ${isSelected ? "selected" : ""}`, "data-edge-kind": edge.kind, children: [_jsx("defs", { children: _jsx("marker", { id: markerId, markerWidth: "10", markerHeight: "10", refX: "8", refY: "3", orient: "auto", markerUnits: "strokeWidth", children: _jsx("path", { d: "M0,0 L0,6 L9,3 z", fill: strokeColor }) }) }), _jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: strokeColor, strokeWidth: designTokens.edgeStrokeWidth, strokeDasharray: strokeDasharray, markerEnd: `url(#${markerId})`, className: "edge-line" }), edge.label && (_jsx("text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 10, textAnchor: "middle", className: "edge-label", fill: designTokens.muted, children: edge.label }))] }));
}
