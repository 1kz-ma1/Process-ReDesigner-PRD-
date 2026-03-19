import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Toolbar({ flowName, onSaveIteration, onLoadIterations, onExport, onImport, iterations }) {
    return (_jsxs("section", { className: "panel toolbar-panel", children: [_jsxs("div", { className: "toolbar-left", children: [_jsx("h1", { children: "\u30D7\u30ED\u30BB\u30B9\u30EA\u30C7\u30B6\u30A4\u30CA\u30FC (PRD)" }), _jsxs("p", { className: "muted", children: ["\u30D5\u30ED\u30FC: ", flowName ?? "読み込み中..."] })] }), _jsxs("div", { className: "toolbar-actions", children: [_jsx("button", { onClick: onSaveIteration, children: "Iteration\u4FDD\u5B58" }), _jsx("button", { onClick: onLoadIterations, children: "\u5C65\u6B74\u8AAD\u307F\u8FBC\u307F" }), _jsxs("label", { className: "file-button", children: ["JSON\u5165\u529B", _jsx("input", { type: "file", accept: "application/json", onChange: (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        onImport(file);
                                    }
                                    e.currentTarget.value = "";
                                } })] }), _jsx("button", { onClick: onExport, children: "JSON\u51FA\u529B" })] }), _jsx("div", { className: "toolbar-iterations", children: _jsxs("span", { children: ["\u30A4\u30C6\u30EC\u30FC\u30B7\u30E7\u30F3\u6570: ", iterations.length] }) })] }));
}
