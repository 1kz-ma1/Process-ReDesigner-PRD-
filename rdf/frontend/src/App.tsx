import { BlockPalette } from "./components/BlockPalette";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { SuggestionPanel } from "./components/SuggestionPanel";
import { TemplateManager } from "./components/TemplateManager";
import { Toolbar } from "./components/Toolbar";
import { useFlowEditor } from "./hooks/useFlowEditor";
import type { BlockType } from "./models/types";

export function App() {
  const editor = useFlowEditor();

  return (
    <main className="app-shell">
      <Toolbar
        flowName={editor.flow?.name}
        onSaveIteration={() => void editor.saveIteration("manual snapshot")}
        onLoadIterations={() => void editor.loadIterations()}
        onImport={(file) => void editor.importJson(file)}
        onExport={editor.exportJson}
        iterations={editor.iterations}
      />

      {editor.error && <p className="error-banner">{editor.error}</p>}
      {editor.loading && <p className="muted">読み込み中...</p>}

      <section className="layout-grid">
        <div className="left-col">
          <BlockPalette blockTypes={editor.blockTypes} onAdd={(type) => void editor.addBlock(type)} />
          <TemplateManager
            blockTypes={editor.blockTypes}
            onCreateFromTemplate={(type: BlockType, meta) => {
              void editor.addBlock(type);
              // 直後にmeta反映したい場合は selectedBlock への patch を追加予定
              console.log("template meta", meta);
            }}
          />
        </div>

        <Canvas
          blocks={editor.blocks}
          edges={editor.edges}
          selectedBlockId={editor.selectedBlockId}
          onSelect={editor.setSelectedBlockId}
          onDelete={(id) => void editor.removeBlock(id)}
          onConnect={(from, to, label) => void editor.connectBlocks(from, to, label)}
        />

        <div className="right-col">
          <PropertyPanel block={editor.selectedBlock} onUpdate={(id, patch) => void editor.updateBlock(id, patch)} />
          <SuggestionPanel
            suggestions={editor.suggestions}
            onAnalyze={() => void editor.analyze()}
            onApply={(id) => void editor.applySuggestion(id)}
          />
        </div>
      </section>
    </main>
  );
}
