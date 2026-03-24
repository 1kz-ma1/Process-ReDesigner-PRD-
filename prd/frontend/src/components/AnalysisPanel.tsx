import { useMemo, useState } from "react";
import type { AnalysisMetrics } from "../models/types";

interface AnalysisPanelProps {
  metrics: AnalysisMetrics;
  onFocusWarnings: () => void;
}

function RatioBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="ratio-bar" aria-label={`${pct}%`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalysisPanel({ metrics, onFocusWarnings }: AnalysisPanelProps) {
  const [open, setOpen] = useState(true);

  const caution = useMemo(() => {
    return {
      loop: metrics.loopRatio > 0.2,
      backflow: metrics.backflowCount > 0,
      imbalance: metrics.laneDistribution.some((x) => x.ratio > 0.55),
    };
  }, [metrics]);

  return (
    <section className="analysis-panel" aria-label="分析パネル">
      <button className="analysis-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "▾" : "▸"} 分析
      </button>
      {open && (
        <div className="analysis-body">
          <div className="analysis-grid">
            <p>総ノード数: <strong>{metrics.nodeCount}</strong></p>
            <p>総エッジ数: <strong>{metrics.edgeCount}</strong></p>
            <p>
              承認段数: <strong>最大 {metrics.approvalDepthMax}</strong> / 平均 {metrics.approvalDepthAvg.toFixed(1)}
            </p>
            <p>
              ループ率: <strong>{Math.round(metrics.loopRatio * 100)}%</strong>
              {caution.loop && <button className="warn-badge" onClick={onFocusWarnings}>注意</button>}
            </p>
            <p>
              逆流件数: <strong>{metrics.backflowCount}</strong>
              {caution.backflow && <button className="warn-badge" onClick={onFocusWarnings}>注意</button>}
            </p>
          </div>

          <div className="lane-bars">
            <h4>レーンバランス</h4>
            {metrics.laneDistribution.map((lane) => (
              <div key={lane.name} className="lane-row">
                <span>{lane.name}</span>
                <RatioBar value={lane.ratio} />
                <small>{Math.round(lane.ratio * 100)}%</small>
              </div>
            ))}
            {caution.imbalance && <button className="warn-badge" onClick={onFocusWarnings}>偏りに注意</button>}
          </div>

          <div className="bottleneck-list">
            <h4>推定ボトルネック</h4>
            {metrics.bottlenecks.length === 0 && <p>該当なし</p>}
            {metrics.bottlenecks.map((b) => (
              <p key={b.nodeId}>#{b.nodeId}: {b.reason}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
