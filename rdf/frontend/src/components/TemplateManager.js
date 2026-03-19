import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { getDefaultMetaByType } from "../utils/analysisRules";
import { TYPE_LABELS } from "../utils/typeLabels";
export function TemplateManager({ blockTypes, onCreateFromTemplate }) {
    const [type, setType] = useState("Input");
    const [name, setName] = useState("MyTemplate");
    const [metaText, setMetaText] = useState(JSON.stringify(getDefaultMetaByType("Input"), null, 2));
    const preview = useMemo(() => {
        try {
            return JSON.parse(metaText);
        }
        catch {
            return null;
        }
    }, [metaText]);
    return (_jsxs("section", { className: "panel template-panel", children: [_jsx("h2", { children: "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u7BA1\u7406" }), _jsxs("div", { className: "form-grid compact", children: [_jsx("label", { children: "\u7A2E\u5225" }), _jsx("select", { value: type, onChange: (e) => {
                            const next = e.target.value;
                            setType(next);
                            setMetaText(JSON.stringify(getDefaultMetaByType(next), null, 2));
                        }, children: blockTypes.map((bt) => (_jsx("option", { value: bt, children: TYPE_LABELS[bt] ?? bt }, bt))) }), _jsx("label", { children: "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u540D" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value) }), _jsx("label", { children: "\u30E1\u30BF (JSON)" }), _jsx("textarea", { rows: 8, value: metaText, onChange: (e) => setMetaText(e.target.value) })] }), _jsx("button", { disabled: !preview, onClick: () => {
                    if (!preview)
                        return;
                    onCreateFromTemplate(type, { ...preview, templateName: name });
                }, children: "\u30C6\u30F3\u30D7\u30EC\u304B\u3089\u8FFD\u52A0" }), !preview && _jsx("p", { className: "muted", children: "meta JSON \u304C\u4E0D\u6B63\u3067\u3059" })] }));
}
