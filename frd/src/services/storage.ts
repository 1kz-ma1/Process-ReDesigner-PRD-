import { get, set } from "idb-keyval";
import { initialRoot } from "../models/dummyData";
import type { PersistedRoot } from "../models/types";

const FLOW_KEY = "frd:flows:primary";

export async function loadRoot(): Promise<PersistedRoot> {
  const saved = await get<PersistedRoot>(FLOW_KEY);
  return saved ?? initialRoot;
}

export async function saveRoot(root: PersistedRoot): Promise<void> {
  await set(FLOW_KEY, root);
}
