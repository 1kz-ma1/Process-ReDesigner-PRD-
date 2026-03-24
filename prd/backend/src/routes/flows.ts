import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { store } from "../data/store.js";
import type { Flow } from "../models/types.js";

const flowsRouter = Router();

flowsRouter.post("/", (req, res) => {
  const now = new Date().toISOString();
  const flow: Flow = {
    id: uuidv4(),
    name: req.body.name ?? "Untitled Flow",
    description: req.body.description ?? "",
    ownerUserId: req.body.ownerUserId,
    version: 1,
    status: "draft",
    targetSLAmin: req.body.targetSLAmin ?? 240,
    createdAt: now,
    updatedAt: now
  };
  store.flows.push(flow);
  res.status(201).json(flow);
});

flowsRouter.get("/:id", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }
  const blocks = store.blocks.filter((b) => b.flowId === flow.id);
  const edges = store.edges.filter((e) => e.flowId === flow.id);
  const suggestions = store.suggestions.filter((s) => s.flowId === flow.id);
  return res.json({ flow, blocks, edges, suggestions });
});

flowsRouter.patch("/:id", (req, res) => {
  const index = store.flows.findIndex((f) => f.id === req.params.id);
  if (index < 0) {
    return res.status(404).json({ message: "Flow not found" });
  }
  store.flows[index] = {
    ...store.flows[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  return res.json(store.flows[index]);
});

export { flowsRouter };
