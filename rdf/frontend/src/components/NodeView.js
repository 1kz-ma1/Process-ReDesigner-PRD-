import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * NodeView
 * SVG ノード描画：task/condition 区別、選択状態、ドラッグ対応
 */
import { useRef, useState } from "react";
import { designTokens } from "../utils/designTokens";
import "../styles/node.css";
export default function NodeView({ node, isSelected, isConnectSource, isLoopTarget, onSelect, onContextMenu, onDragMove, }) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const groupRef = useRef(null);
    const handleMouseDown = (e) => {
        if (e.button !== 0)
            return; // 左ボタンのみ
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };
    const handleMouseMove = (e) => {
        if (!isDragging || !dragStart)
            return;
        const ctm = groupRef.current?.ownerSVGElement?.getScreenCTM();
        const scale = ctm?.a ?? 1;
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;
        onDragMove(dx, dy);
        setDragStart({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
    };
    const isCondition = node.type === "condition";
    const width = designTokens.blockWidth;
    const height = designTokens.blockHeight;
    const radius = designTokens.blockRadius;
    return (_jsxs("g", { ref: groupRef, className: `node-view ${isSelected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""} ${isLoopTarget ? "highlight" : ""}`, "data-node-id": node.id, "data-node-type": node.type, transform: `translate(${node.position.x}, ${node.position.y})`, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, onClick: onSelect, onContextMenu: onContextMenu, style: { cursor: isDragging ? "grabbing" : "grab" }, children: [isCondition ? (_jsx(_Fragment, { children: _jsx("polygon", { points: `0,-${height / 2} ${width / 2},0 0,${height / 2} -${width / 2},0`, fill: designTokens.blockFillColor, stroke: isSelected ? designTokens.blockStrokeColor : designTokens.border, strokeWidth: designTokens.blockStrokeWidth }) })) : (_jsx(_Fragment, { children: _jsx("rect", { x: -width / 2, y: -height / 2, width: width, height: height, rx: radius, fill: designTokens.blockFillColor, stroke: isSelected ? designTokens.blockStrokeColor : designTokens.border, strokeWidth: designTokens.blockStrokeWidth }) })), _jsx("text", { x: 0, y: 0, textAnchor: "middle", dominantBaseline: "middle", className: "node-label", fill: designTokens.text, fontSize: designTokens.fontSize, children: node.name })] }));
}
