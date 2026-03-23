import type { DataStore } from "../models/types.js";

export const store: DataStore = {
  users: [
    {
      id: "user-admin",
      name: "Admin User",
      email: "admin@example.com",
      role: "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "user-manager",
      name: "Manager User",
      email: "manager@example.com",
      role: "Manager",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  flows: [],
  blocks: [],
  edges: [],
  suggestions: [],
  iterations: []
};
