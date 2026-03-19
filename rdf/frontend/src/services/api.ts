import type { Block, Edge, FlowBundle, Iteration, Suggestion } from "../models/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  createFlow(payload: { name: string; description?: string; targetSLAmin?: number }) {
    return request<{ id: string }>("/flows", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  getFlow(flowId: string) {
    return request<FlowBundle>(`/flows/${flowId}`, { method: "GET" });
  },

  patchFlow(flowId: string, payload: { name?: string; description?: string; targetSLAmin?: number }) {
    return request<{ id: string }>(`/flows/${flowId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  createBlock(flowId: string, payload: Partial<Block>) {
    return request<Block>(`/flows/${flowId}/blocks`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  patchBlock(blockId: string, payload: Partial<Block>) {
    return request<Block>(`/blocks/${blockId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  deleteBlock(blockId: string) {
    return request<void>(`/blocks/${blockId}`, { method: "DELETE" });
  },

  createEdge(flowId: string, payload: Partial<Edge>) {
    return request<Edge>(`/flows/${flowId}/edges`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  deleteEdge(edgeId: string) {
    return request<void>(`/edges/${edgeId}`, { method: "DELETE" });
  },

  analyze(flowId: string) {
    return request<{ flowId: string; suggestions: Suggestion[] }>(`/flows/${flowId}/analyze`, {
      method: "POST"
    });
  },

  applySuggestion(suggestionId: string) {
    return request<{ applied: boolean }>(`/suggestions/${suggestionId}/apply`, {
      method: "POST"
    });
  },

  createIteration(flowId: string, note?: string) {
    return request<Iteration>(`/flows/${flowId}/iterations`, {
      method: "POST",
      body: JSON.stringify({ note })
    });
  },

  getIterations(flowId: string) {
    return request<{ flowId: string; iterations: Iteration[] }>(`/flows/${flowId}/iterations`, {
      method: "GET"
    });
  },

  exportFlowBundle(bundle: FlowBundle) {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bundle.flow.name || "flow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
