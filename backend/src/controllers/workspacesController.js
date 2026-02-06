import { v4 as uuidv4 } from "uuid";
import { connectDB } from "../config/db.js";

export async function createWorkspace(req, res) {
  try {
    const { name, color, createdBy } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const db = await connectDB("db_workspaces");
    const workspace = {
      _id: uuidv4(),
      name,
      color: color || "rgb(0, 158, 121)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: createdBy || null,
      members: [],
    };
    await db.insert(workspace);
    res.status(201).json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listWorkspaces(req, res) {
  try {
    const db = await connectDB("db_workspaces");
    const result = await db.find({
      selector: {},
      limit: 200,
    });
    res.json(result.docs || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getWorkspaceById(req, res) {
  try {
    const { workspaceId } = req.params;
    const db = await connectDB("db_workspaces");
    const doc = await db.get(workspaceId).catch(() => null);
    if (!doc) return res.status(404).json({ error: "Workspace not found" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    const updates = req.body;
    const db = await connectDB("db_workspaces");
    const doc = await db.get(workspaceId).catch(() => null);
    if (!doc) return res.status(404).json({ error: "Workspace not found" });
    const updated = {
      ...doc,
      ...updates,
      _id: doc._id,
      _rev: doc._rev,
      updatedAt: new Date().toISOString(),
    };
    await db.insert(updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
