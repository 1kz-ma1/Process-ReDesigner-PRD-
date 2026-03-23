import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { store } from "../data/store.js";
import type { Edge } from "../models/types.js";

const edgesRouter = Router();

edgesRouter.post("/flows/:id/edges", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const from = store.blocks.find((b) => b.id === req.body.fromBlockId && b.flowId === flow.id);
  const to = store.blocks.find((b) => b.id === req.body.toBlockId && b.flowId === flow.id);
  if (!from || !to) {
    return res.status(400).json({ message: "Invalid block connection" });
  }

  const now = new Date().toISOString();
  const edge: Edge = {
    id: uuidv4(),
    flowId: flow.id,
    fromBlockId: from.id,
    toBlockId: to.id,
    label: req.body.label,
    condition: req.body.condition,
    createdAt: now,
    updatedAt: now
  };

  store.edges.push(edge);
  return res.status(201).json(edge);
});

edgesRouter.delete("/edges/:id", (req, res) => {
  const exists = store.edges.some((e) => e.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ message: "Edge not found" });
  }
  store.edges = store.edges.filter((e) => e.id !== req.params.id);
  return res.status(204).send();
});

export { edgesRouter };
