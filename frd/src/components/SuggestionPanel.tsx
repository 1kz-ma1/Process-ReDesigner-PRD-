import { useFlowStore } from "../store/flowStore";

export function SuggestionPanel() {
  const suggestions = useFlowStore((s) => s.suggestions);
  const analyze = useFlowStore((s) => s.analyze);
  const applySuggestion = useFlowStore((s) => s.applySuggestion);

  return (
    <section className="panel">
      <div className="row between">
        <h2>改善提案</h2>
        <button onClick={analyze}>解析実行</button>
      </div>
      {suggestions.length === 0 ? <p className="muted">提案はまだありません。</p> : null}
      <div className="stack">
        {suggestions.map((s) => (
          <article key={s.id} className={`suggestion ${s.severity}`}>
            <strong>{s.summary}</strong>
            <p>{s.detail}</p>
            <small>{s.rule_code}</small>
            <button onClick={() => applySuggestion(s.id)}>ワンクリック適用</button>
          </article>
        ))}
      </div>
    </section>
  );
}
