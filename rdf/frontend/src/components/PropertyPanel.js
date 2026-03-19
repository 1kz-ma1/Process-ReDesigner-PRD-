import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function PropertyPanel({ block, onUpdate }) {
    const [name, setName] = useState("");
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [meta, setMeta] = useState("{}");
    useEffect(() => {
        if (!block) {
            setName("");
            setX(0);
            setY(0);
            setMeta("{}");
            return;
        }
        setName(block.name);
        setX(block.x);
        setY(block.y);
        setMeta(JSON.stringify(block.meta, null, 2));
    }, [block]);
    const disabled = !block;
    const onSave = () => {
        if (!block)
            return;
        try {
            const parsed = JSON.parse(meta);
            onUpdate(block.id, { name, x, y, meta: parsed });
        }
        catch {
            alert("meta JSON が不正です");
        }
    };
    return (_jsxs("section", { className: "panel property-panel", children: [_jsx("h2", { children: "\u30D7\u30ED\u30D1\u30C6\u30A3" }), !block && _jsx("p", { className: "muted", children: "\u30D6\u30ED\u30C3\u30AF\u3092\u9078\u629E\u3059\u308B\u3068\u7DE8\u96C6\u3067\u304D\u307E\u3059" }), _jsxs("div", { className: "form-grid", children: [_jsx("label", { children: "\u540D\u524D" }), _jsx("input", { value: name, disabled: disabled, onChange: (e) => setName(e.target.value) }), _jsx("label", { children: "X\u5EA7\u6A19" }), _jsx("input", { type: "number", value: x, disabled: disabled, onChange: (e) => setX(Number(e.target.value)) }), _jsx("label", { children: "Y\u5EA7\u6A19" }), _jsx("input", { type: "number", value: y, disabled: disabled, onChange: (e) => setY(Number(e.target.value)) }), _jsx("label", { children: "meta (JSON)" }), _jsx("textarea", { value: meta, disabled: disabled, onChange: (e) => setMeta(e.target.value), rows: 12 })] }), _jsx("button", { disabled: disabled, onClick: onSave, children: "\u4FDD\u5B58" })] }));
}
