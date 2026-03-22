/**
 * EdgeView
 * SVG エッジ（コネクタ）描画：normal/condition/loop の区別、矢印付き
 */

import type { EdgeData, NodeData } from "../models/types";
import { designTokens } from "../utils/designTokens";
import "../styles/edge.css";

interface EdgeViewProps {
  edge: EdgeData;
  nodes: NodeData[];
  isSelected: boolean;
  onDelete: () => void;
}

export default function EdgeView({ edge, nodes, isSelected, onDelete }: EdgeViewProps) {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  // 開始・終端座標（ノード中心）
  const x1 = sourceNode.position.x;
  const y1 = sourceNode.position.y;
  const x2 = targetNode.position.x;
  const y2 = targetNode.position.y;

  // 直線／ベジェ曲線選択（簡略版：直線 + 矢印）
  const strokeColor =
    edge.kind === "loop"
      ? designTokens.edgeLoopStrokeColor
      : isSelected
      ? designTokens.edgeSelectedStrokeColor
      : designTokens.edgeStrokeColor;

  const strokeDasharray = edge.kind === "loop" ? "5,5" : "none";

  // 矢印マーカー
  const markerId = `arrow-${edge.id.slice(0, 8)}`;

  return (
    <g className={`edge-view ${isSelected ? "selected" : ""}`} data-edge-kind={edge.kind}>
      {/* マーカー定義 */}
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
        </marker>
      </defs>

      {/* エッジ线 */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={designTokens.edgeStrokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={`url(#${markerId})`}
        className="edge-line"
      />

      {/* ラベル（中点に配置） */}
      {edge.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 10}
          textAnchor="middle"
          className="edge-label"
          fill={designTokens.muted}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}
