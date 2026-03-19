import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TYPE_LABELS } from "../utils/typeLabels";
export function BlockPalette({ blockTypes, onAdd }) {
    return (_jsxs("section", { className: "panel palette-panel", children: [_jsx("h2", { children: "\u30D6\u30ED\u30C3\u30AF\u30D1\u30EC\u30C3\u30C8" }), _jsx("p", { className: "muted", children: "\u5DE5\u7A0B\u30D6\u30ED\u30C3\u30AF\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8FFD\u52A0" }), _jsx("div", { className: "palette-grid", children: blockTypes.map((type) => (_jsx("button", { className: `block-chip type-${type.toLowerCase()}`, onClick: () => onAdd(type), children: TYPE_LABELS[type] ?? type }, type))) })] }));
}
