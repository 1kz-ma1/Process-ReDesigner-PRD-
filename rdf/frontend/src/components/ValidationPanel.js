import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ValidationPanel
 * 下部パネル：バリデーション結果（エラー・警告りスト）
 */
import { useMemo } from "react";
import { getLabel } from "../utils/i18n";
export default function ValidationPanel({ validation, onSelectMessage }) {
    const { errors, warnings, infos } = useMemo(() => {
        const errors = validation.messages.filter((m) => m.type === "error");
        const warnings = validation.messages.filter((m) => m.type === "warning");
        const infos = validation.messages.filter((m) => m.type === "info");
        return { errors, warnings, infos };
    }, [validation.messages]);
    const isValid = validation.valid;
    return (_jsxs("aside", { className: "validation-panel", children: [_jsx("h2", { children: getLabel("validation_results") }), isValid && (_jsx("div", { className: "validation-summary success", children: _jsxs("p", { children: ["\u2713 ", getLabel("all_valid")] }) })), !isValid && (_jsxs("div", { className: "validation-summary", children: [errors.length > 0 && _jsxs("p", { className: "error", children: ["\u30A8\u30E9\u30FC: ", errors.length, "\u4EF6"] }), warnings.length > 0 && _jsxs("p", { className: "warning", children: ["\u8B66\u544A: ", warnings.length, "\u4EF6"] }), infos.length > 0 && _jsxs("p", { className: "info", children: ["\u60C5\u5831: ", infos.length, "\u4EF6"] })] })), errors.length > 0 && (_jsxs("div", { className: "message-group", children: [_jsx("h3", { className: "error", children: "\u30A8\u30E9\u30FC" }), _jsx("ul", { children: errors.map((msg, idx) => (_jsxs("li", { className: "error", onClick: () => onSelectMessage(msg), children: [_jsx("span", { children: msg.message }), msg.nodeId && _jsxs("span", { className: "id", children: ["#", msg.nodeId] }), msg.edgeId && _jsxs("span", { className: "id", children: ["#", msg.edgeId] })] }, idx))) })] })), warnings.length > 0 && (_jsxs("div", { className: "message-group", children: [_jsx("h3", { className: "warning", children: "\u8B66\u544A" }), _jsx("ul", { children: warnings.map((msg, idx) => (_jsxs("li", { className: "warning", onClick: () => onSelectMessage(msg), children: [_jsx("span", { children: msg.message }), msg.nodeId && _jsxs("span", { className: "id", children: ["#", msg.nodeId] }), msg.edgeId && _jsxs("span", { className: "id", children: ["#", msg.edgeId] })] }, idx))) })] })), infos.length > 0 && (_jsxs("div", { className: "message-group", children: [_jsx("h3", { className: "info", children: "\u60C5\u5831" }), _jsx("ul", { children: infos.map((msg, idx) => (_jsxs("li", { className: "info", onClick: () => onSelectMessage(msg), children: [_jsx("span", { children: msg.message }), msg.nodeId && _jsxs("span", { className: "id", children: ["#", msg.nodeId] }), msg.edgeId && _jsxs("span", { className: "id", children: ["#", msg.edgeId] })] }, idx))) })] })), validation.messages.length === 0 && isValid && (_jsx("div", { className: "empty", children: getLabel("no_messages") }))] }));
}
