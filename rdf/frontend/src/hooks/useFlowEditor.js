import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { getDefaultMetaByType } from "../utils/analysisRules";
const blockTypes = [
    "Input",
    "Validate",
    "Approve",
    "Handoff",
    "Transform",
    "Notify",
    "Store",
    "Review",
    "Decision",
    "Complete"
];
export function useFlowEditor() {
    const [flow, setFlow] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [edges, setEdges] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [iterations, setIterations] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedBlockId) ?? null, [blocks, selectedBlockId]);
    const bootstrap = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const created = await api.createFlow({
                name: "PRD Demo Flow",
                description: "MVPサンプル",
                targetSLAmin: 240
            });
            const bundle = await api.getFlow(created.id);
            setFlow(bundle.flow);
            setBlocks(bundle.blocks);
            setEdges(bundle.edges);
            setSuggestions(bundle.suggestions);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "初期化に失敗しました");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void bootstrap();
    }, [bootstrap]);
    const refresh = useCallback(async () => {
        if (!flow)
            return;
        const bundle = await api.getFlow(flow.id);
        setFlow(bundle.flow);
        setBlocks(bundle.blocks);
        setEdges(bundle.edges);
        setSuggestions(bundle.suggestions);
    }, [flow]);
    const addBlock = useCallback(async (type, x, y) => {
        if (!flow)
            return;
        const computeCenter = () => {
            try {
                if (typeof window === "undefined")
                    return { x: 300, y: 120 };
                const el = document.querySelector(".canvas-box");
                if (!el)
                    return { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
                const rect = el.getBoundingClientRect();
                return { x: Math.round(rect.width / 2), y: Math.round(rect.height / 2) };
            }
            catch {
                return { x: 300, y: 120 };
            }
        };
        const pos = x != null && y != null ? { x, y } : computeCenter();
        await api.createBlock(flow.id, {
            type,
            name: type,
            x: pos.x,
            y: pos.y,
            meta: getDefaultMetaByType(type)
        });
        await refresh();
    }, [flow, refresh]);
    const updateBlock = useCallback(async (id, patch) => {
        await api.patchBlock(id, patch);
        await refresh();
    }, [refresh]);
    const removeBlock = useCallback(async (id) => {
        await api.deleteBlock(id);
        setSelectedBlockId((prev) => (prev === id ? null : prev));
        await refresh();
    }, [refresh]);
    const connectBlocks = useCallback(async (fromBlockId, toBlockId, label) => {
        if (!flow)
            return;
        await api.createEdge(flow.id, { fromBlockId, toBlockId, label });
        await refresh();
    }, [flow, refresh]);
    const analyze = useCallback(async () => {
        if (!flow)
            return;
        const result = await api.analyze(flow.id);
        setSuggestions(result.suggestions);
    }, [flow]);
    const applySuggestion = useCallback(async (id) => {
        await api.applySuggestion(id);
        await refresh();
    }, [refresh]);
    const saveIteration = useCallback(async (note) => {
        if (!flow)
            return;
        await api.createIteration(flow.id, note);
        const result = await api.getIterations(flow.id);
        setIterations(result.iterations);
    }, [flow]);
    const loadIterations = useCallback(async () => {
        if (!flow)
            return;
        const result = await api.getIterations(flow.id);
        setIterations(result.iterations);
    }, [flow]);
    const exportJson = useCallback(() => {
        if (!flow)
            return;
        api.exportFlowBundle({ flow, blocks, edges, suggestions });
    }, [flow, blocks, edges, suggestions]);
    const importJson = useCallback(async (file) => {
        if (!flow)
            return;
        const text = await file.text();
        const bundle = JSON.parse(text);
        await api.patchFlow(flow.id, {
            name: bundle.flow.name,
            description: bundle.flow.description,
            targetSLAmin: bundle.flow.targetSLAmin
        });
        for (const edge of edges) {
            await api.deleteEdge(edge.id);
        }
        for (const block of blocks) {
            await api.deleteBlock(block.id);
        }
        const idMap = new Map();
        for (const block of bundle.blocks) {
            const created = await api.createBlock(flow.id, {
                type: block.type,
                name: block.name,
                x: block.x,
                y: block.y,
                meta: block.meta
            });
            idMap.set(block.id, created.id);
        }
        for (const edge of bundle.edges) {
            const from = idMap.get(edge.fromBlockId);
            const to = idMap.get(edge.toBlockId);
            if (!from || !to)
                continue;
            await api.createEdge(flow.id, {
                fromBlockId: from,
                toBlockId: to,
                label: edge.label,
                condition: edge.condition
            });
        }
        await refresh();
    }, [flow, edges, blocks, refresh]);
    return {
        blockTypes,
        flow,
        blocks,
        edges,
        suggestions,
        iterations,
        selectedBlock,
        selectedBlockId,
        setSelectedBlockId,
        loading,
        error,
        addBlock,
        updateBlock,
        removeBlock,
        connectBlocks,
        analyze,
        applySuggestion,
        saveIteration,
        loadIterations,
        exportJson,
        importJson,
        refresh
    };
}
