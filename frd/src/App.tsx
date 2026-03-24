import { useEffect } from "react";
import { BlockPalette } from "./components/BlockPalette";
import { FlowCanvas } from "./components/FlowCanvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { SuggestionPanel } from "./components/SuggestionPanel";
import { Toolbar } from "./components/Toolbar";
import { useFlowStore } from "./store/flowStore";

export function App() {
  const load = useFlowStore((s) => s.load);
  const initialized = useFlowStore((s) => s.initialized);

  useEffect(() => {
    void load();
  }, [load]);

  if (!initialized) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <main className="app">
      <Toolbar />
      <section className="layout">
        <aside className="left">
          <BlockPalette />
        </aside>
        <section className="center">
          <FlowCanvas />
        </section>
        <aside className="right">
          <PropertyPanel />
          <SuggestionPanel />
        </aside>
      </section>
    </main>
  );
}
