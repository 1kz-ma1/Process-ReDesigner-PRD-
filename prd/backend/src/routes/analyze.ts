import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { store } from "../data/store.js";
import { analyzeFlow } from "../services/analyzer.js";
import { applySuggestion } from "../services/suggestionApplier.js";
import type { Iteration } from "../models/types.js";

const analyzeRouter = Router();

analyzeRouter.post("/flows/:id/analyze", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const blocks = store.blocks.filter((b) => b.flowId === flow.id);
  const edges = store.edges.filter((e) => e.flowId === flow.id);

  const suggestions = analyzeFlow({
    flow,
    blocks,
    edges,
    users: store.users
  });

  store.suggestions = store.suggestions
    .filter((s) => s.flowId !== flow.id)
    .concat(suggestions);

  return res.json({ flowId: flow.id, suggestions });
});

analyzeRouter.post("/suggestions/:id/apply", (req, res) => {
  const suggestion = store.suggestions.find((s) => s.id === req.params.id);
  if (!suggestion) {
    return res.status(404).json({ message: "Suggestion not found" });
  }

  const flow = store.flows.find((f) => f.id === suggestion.flowId);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const currentBlocks = store.blocks.filter((b) => b.flowId === flow.id);
  const currentEdges = store.edges.filter((e) => e.flowId === flow.id);

  const result = applySuggestion({
    suggestion,
    flow,
    blocks: currentBlocks,
    edges: currentEdges
  });

  store.blocks = store.blocks.filter((b) => b.flowId !== flow.id).concat(result.blocks);
  store.edges = store.edges.filter((e) => e.flowId !== flow.id).concat(result.edges);

  return res.json({ applied: true, flowId: flow.id, suggestionId: suggestion.id });
});

analyzeRouter.post("/flows/:id/iterations", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const snapshot = {
    flow,
    blocks: store.blocks.filter((b) => b.flowId === flow.id),
    edges: store.edges.filter((e) => e.flowId === flow.id)
  };

  const last = store.iterations.filter((it) => it.flowId === flow.id).at(-1);
  const iteration: Iteration = {
    id: uuidv4(),
    flowId: flow.id,
    parentIterationId: last?.id,
    snapshot,
    note: req.body.note,
    createdAt: new Date().toISOString()
  };

  store.iterations.push(iteration);
  return res.status(201).json(iteration);
});

analyzeRouter.get("/flows/:id/iterations", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const iterations = store.iterations.filter((it) => it.flowId === flow.id);
  return res.json({ flowId: flow.id, iterations });
});

export { analyzeRouter };
