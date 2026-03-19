import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BlockPalette } from "./components/BlockPalette";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { SuggestionPanel } from "./components/SuggestionPanel";
import { TemplateManager } from "./components/TemplateManager";
import { Toolbar } from "./components/Toolbar";
import { useFlowEditor } from "./hooks/useFlowEditor";
export function App() {
    const editor = useFlowEditor();
    return (_jsxs("main", { className: "app-shell", children: [_jsx(Toolbar, { flowName: editor.flow?.name, onSaveIteration: () => void editor.saveIteration("manual snapshot"), onLoadIterations: () => void editor.loadIterations(), onImport: (file) => void editor.importJson(file), onExport: editor.exportJson, iterations: editor.iterations }), editor.error && _jsx("p", { className: "error-banner", children: editor.error }), editor.loading && _jsx("p", { className: "muted", children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." }), _jsxs("section", { className: "layout-grid", children: [_jsxs("div", { className: "left-col", children: [_jsx(BlockPalette, { blockTypes: editor.blockTypes, onAdd: (type) => void editor.addBlock(type) }), _jsx(TemplateManager, { blockTypes: editor.blockTypes, onCreateFromTemplate: (type, meta) => {
                                    void editor.addBlock(type);
                                    // 直後にmeta反映したい場合は selectedBlock への patch を追加予定
                                    console.log("template meta", meta);
                                } })] }), _jsx(Canvas, { blocks: editor.blocks, edges: editor.edges, selectedBlockId: editor.selectedBlockId, onSelect: editor.setSelectedBlockId, onDelete: (id) => void editor.removeBlock(id), onConnect: (from, to, label) => void editor.connectBlocks(from, to, label) }), _jsxs("div", { className: "right-col", children: [_jsx(PropertyPanel, { block: editor.selectedBlock, onUpdate: (id, patch) => void editor.updateBlock(id, patch) }), _jsx(SuggestionPanel, { suggestions: editor.suggestions, onAnalyze: () => void editor.analyze(), onApply: (id) => void editor.applySuggestion(id) })] })] })] }));
}
