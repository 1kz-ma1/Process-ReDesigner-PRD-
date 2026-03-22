/**
 * NodeView
 * SVG ノード描画：task/condition 区別、選択状態、ドラッグ対応
 */

import { useRef, useState } from "react";
import type { NodeData, Position } from "../models/types";
import { designTokens } from "../utils/designTokens";
import "../styles/node.css";

interface NodeViewProps {
  node: NodeData;
  isSelected: boolean;
  isConnectSource: boolean;
  isLoopTarget: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent<SVGGElement>) => void;
  onDragMove: (dx: number, dy: number) => void;
}

export default function NodeView({
  node,
  isSelected,
  isConnectSource,
  isLoopTarget,
  onSelect,
  onContextMenu,
  onDragMove,
}: NodeViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const groupRef = useRef<SVGGElement>(null);

  const handleMouseDown = (e: React.MouseEvent<SVGGElement>) => {
    if (e.button !== 0) return; // 左ボタンのみ
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGGElement>) => {
    if (!isDragging || !dragStart) return;

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

  return (
    <g
      ref={groupRef}
      className={`node-view ${isSelected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""} ${isLoopTarget ? "highlight" : ""}`}
      data-node-id={node.id}
      data-node-type={node.type}
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {isCondition ? (
        <>
          {/* 菱形（条件分岐） */}
          <polygon
            points={`0,-${height / 2} ${width / 2},0 0,${height / 2} -${width / 2},0`}
            fill={designTokens.blockFillColor}
            stroke={isSelected ? designTokens.blockStrokeColor : designTokens.border}
            strokeWidth={designTokens.blockStrokeWidth}
          />
        </>
      ) : (
        <>
          {/* 矩形（タスク） */}
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            rx={radius}
            fill={designTokens.blockFillColor}
            stroke={isSelected ? designTokens.blockStrokeColor : designTokens.border}
            strokeWidth={designTokens.blockStrokeWidth}
          />
        </>
      )}

      {/* テキストラベル */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        className="node-label"
        fill={designTokens.text}
        fontSize={designTokens.fontSize}
      >
        {node.name}
      </text>
    </g>
  );
}
