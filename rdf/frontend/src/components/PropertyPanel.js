import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PropertyPanel
 * 右側パネル：選択ノードの名前・meta 編集
 */
import { useEffect, useState } from "react";
import { getLabel } from "../utils/i18n";
export default function PropertyPanel({ node, onUpdateNode }) {
    const [name, setName] = useState("");
    const [metaText, setMetaText] = useState("{}");
    const [metaError, setMetaError] = useState(null);
    useEffect(() => {
        if (!node) {
            setName("");
            setMetaText("{}");
            setMetaError(null);
            return;
        }
        setName(node.name);
        setMetaText(JSON.stringify(node.meta, null, 2));
        setMetaError(null);
    }, [node]);
    const handleSave = () => {
        if (!node)
            return;
        try {
            const parsed = JSON.parse(metaText);
            setMetaError(null);
            onUpdateNode({ name, meta: parsed });
        }
        catch (err) {
            setMetaError(`JSON 構文エラー: ${err instanceof Error ? err.message : "不明"}`);
        }
    };
    const disabled = !node;
    return (_jsxs("aside", { className: "property-panel", children: [_jsx("h2", { children: getLabel("properties") }), !node && _jsxs("p", { className: "muted", children: [getLabel("block_name"), "\u3092\u9078\u629E\u3059\u308B\u3068\u7DE8\u96C6\u3067\u304D\u307E\u3059"] }), node && (_jsxs("div", { className: "form-group", children: [_jsx("label", { children: getLabel("block_name") }), _jsx("input", { type: "text", value: name, disabled: disabled, onChange: (e) => setName(e.target.value), placeholder: "\u30D6\u30ED\u30C3\u30AF\u540D" }), _jsx("label", { children: getLabel("meta_json") }), _jsx("textarea", { value: metaText, disabled: disabled, onChange: (e) => setMetaText(e.target.value), rows: 12, placeholder: "{}", className: metaError ? "error" : "" }), metaError && _jsx("p", { className: "error-text", children: metaError }), _jsx("button", { disabled: disabled || !!metaError, onClick: handleSave, children: getLabel("save") })] }))] }));
}
