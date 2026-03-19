import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { store } from "../data/store.js";
import type { Block } from "../models/types.js";

const blocksRouter = Router();

blocksRouter.post("/flows/:id/blocks", (req, res) => {
  const flow = store.flows.find((f) => f.id === req.params.id);
  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  const now = new Date().toISOString();
  const block: Block = {
    id: uuidv4(),
    flowId: flow.id,
    type: req.body.type,
    name: req.body.name ?? req.body.type,
    x: req.body.x ?? 0,
    y: req.body.y ?? 0,
    meta: req.body.meta ?? {},
    createdAt: now,
    updatedAt: now
  };

  store.blocks.push(block);
  return res.status(201).json(block);
});

blocksRouter.patch("/blocks/:id", (req, res) => {
  const index = store.blocks.findIndex((b) => b.id === req.params.id);
  if (index < 0) {
    return res.status(404).json({ message: "Block not found" });
  }

  store.blocks[index] = {
    ...store.blocks[index],
    ...req.body,
    meta: {
      ...store.blocks[index].meta,
      ...(req.body.meta ?? {})
    },
    updatedAt: new Date().toISOString()
  };

  return res.json(store.blocks[index]);
});

blocksRouter.delete("/blocks/:id", (req, res) => {
  const target = store.blocks.find((b) => b.id === req.params.id);
  if (!target) {
    return res.status(404).json({ message: "Block not found" });
  }

  store.blocks = store.blocks.filter((b) => b.id !== target.id);
  store.edges = store.edges.filter((e) => e.fromBlockId !== target.id && e.toBlockId !== target.id);

  return res.status(204).send();
});

export { blocksRouter };
