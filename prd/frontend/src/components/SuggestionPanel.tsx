import type { Suggestion } from "../models/types";
import { summarizeSuggestionImpact } from "../utils/analysisRules";

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onAnalyze: () => void;
  onApply: (suggestionId: string) => void;
}

export function SuggestionPanel({ suggestions, onAnalyze, onApply }: SuggestionPanelProps) {
  return (
    <section className="panel suggestion-panel">
      <div className="panel-header">
        <h2>提案</h2>
        <button onClick={onAnalyze}>解析実行</button>
      </div>
      <p className="muted">{summarizeSuggestionImpact(suggestions)}</p>
      <div className="suggestion-list">
        {suggestions.length === 0 && <p className="muted">まだ提案はありません</p>}
        {suggestions.map((s) => (
          <article key={s.id} className={`suggestion-item sev-${s.severity}`}>
            <header>
              <strong>{s.summary}</strong>
              <span>{s.severity === "critical" ? "重要" : s.severity === "warn" ? "警告" : "情報"}</span>
            </header>
            <p>{s.detail}</p>
            <button onClick={() => onApply(s.id)}>ワンクリック適用</button>
          </article>
        ))}
      </div>
    </section>
  );
}
