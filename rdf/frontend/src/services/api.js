const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
async function request(path, init) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...init
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `HTTP ${res.status}`);
    }
    if (res.status === 204) {
        return undefined;
    }
    return res.json();
}
export const api = {
    createFlow(payload) {
        return request("/flows", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },
    getFlow(flowId) {
        return request(`/flows/${flowId}`, { method: "GET" });
    },
    patchFlow(flowId, payload) {
        return request(`/flows/${flowId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
    },
    createBlock(flowId, payload) {
        return request(`/flows/${flowId}/blocks`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },
    patchBlock(blockId, payload) {
        return request(`/blocks/${blockId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
    },
    deleteBlock(blockId) {
        return request(`/blocks/${blockId}`, { method: "DELETE" });
    },
    createEdge(flowId, payload) {
        return request(`/flows/${flowId}/edges`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },
    deleteEdge(edgeId) {
        return request(`/edges/${edgeId}`, { method: "DELETE" });
    },
    analyze(flowId) {
        return request(`/flows/${flowId}/analyze`, {
            method: "POST"
        });
    },
    applySuggestion(suggestionId) {
        return request(`/suggestions/${suggestionId}/apply`, {
            method: "POST"
        });
    },
    createIteration(flowId, note) {
        return request(`/flows/${flowId}/iterations`, {
            method: "POST",
            body: JSON.stringify({ note })
        });
    },
    getIterations(flowId) {
        return request(`/flows/${flowId}/iterations`, {
            method: "GET"
        });
    },
    exportFlowBundle(bundle) {
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundle.flow.name || "flow"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
