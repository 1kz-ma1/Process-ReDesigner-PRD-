import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { TYPE_LABELS } from "../utils/typeLabels";
export function Canvas({ blocks, edges, selectedBlockId, onSelect, onDelete, onConnect }) {
    const [fromId, setFromId] = useState("");
    const [toId, setToId] = useState("");
    const [label, setLabel] = useState("");
    const edgeLabels = useMemo(() => {
        return edges.map((edge) => `${edge.fromBlockId.slice(0, 6)} -> ${edge.toBlockId.slice(0, 6)} ${edge.label ?? ""}`);
    }, [edges]);
    return (_jsxs("section", { className: "panel canvas-panel", children: [_jsxs("header", { className: "panel-header", children: [_jsx("h2", { children: "\u30D5\u30ED\u30FC\u30AD\u30E3\u30F3\u30D0\u30B9" }), _jsxs("p", { className: "muted", children: ["\u914D\u7F6E\u6E08\u307F\u30D6\u30ED\u30C3\u30AF: ", blocks.length, " / \u63A5\u7D9A: ", edges.length] })] }), _jsx("div", { className: "canvas-grid", children: blocks.map((block) => (_jsxs("article", { className: `canvas-block ${selectedBlockId === block.id ? "selected" : ""}`, onClick: () => onSelect(block.id), children: [_jsxs("div", { className: "canvas-block-head", children: [_jsx("strong", { children: block.name }), _jsx("span", { children: TYPE_LABELS[block.type] ?? block.type })] }), _jsxs("div", { className: "canvas-block-body", children: [_jsxs("small", { children: ["x:", block.x, " y:", block.y] }), _jsx("button", { className: "danger-link", onClick: (e) => {
                                        e.stopPropagation();
                                        onDelete(block.id);
                                    }, children: "\u524A\u9664" })] })] }, block.id))) }), _jsxs("div", { className: "edge-builder", children: [_jsx("h3", { children: "\u63A5\u7D9A\u4F5C\u6210" }), _jsxs("div", { className: "edge-builder-row", children: [_jsxs("select", { value: fromId, onChange: (e) => setFromId(e.target.value), children: [_jsx("option", { value: "", children: "\u9001\u4FE1\u5143\u3092\u9078\u629E" }), blocks.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id)))] }), _jsxs("select", { value: toId, onChange: (e) => setToId(e.target.value), children: [_jsx("option", { value: "", children: "\u9001\u4FE1\u5148\u3092\u9078\u629E" }), blocks.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id)))] }), _jsx("input", { value: label, onChange: (e) => setLabel(e.target.value), placeholder: "\u30E9\u30D9\u30EB\uFF0F\u6761\u4EF6" }), _jsx("button", { onClick: () => {
                                    if (!fromId || !toId || fromId === toId)
                                        return;
                                    onConnect(fromId, toId, label);
                                    setLabel("");
                                }, children: "\u63A5\u7D9A" })] }), _jsx("ul", { className: "edge-list", children: edgeLabels.map((text, idx) => (_jsx("li", { children: text }, `${text}-${idx}`))) })] })] }));
}
