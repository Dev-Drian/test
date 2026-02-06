import { v4 as uuidv4 } from "uuid";
import { connectDB, getAgentsDbName } from "../config/db.js";

export async function createAgent(req, res) {
  try {
    const { workspaceId, agent } = req.body;
    if (!workspaceId || !agent?.name) {
      return res.status(400).json({ error: "workspaceId and agent.name are required" });
    }
    const db = await connectDB(getAgentsDbName(workspaceId));
    const newAgent = {
      _id: uuidv4(),
      name: agent.name,
      description: agent.description || "",
      workspaceId,
      type: agent.type || "private",
      aiModel: agent.aiModel || [],
      language: agent.language || "es",
      tables: agent.tables || [],
      workflows: agent.workflows || [],
      instructions: agent.instructions || [],
      tone: agent.tone ?? 50,
      answer: agent.answer ?? 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...agent,
    };
    await db.insert(newAgent);
    res.status(201).json(newAgent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listAgents(req, res) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
    const db = await connectDB(getAgentsDbName(workspaceId));
    const result = await db.find({ selector: {}, limit: 200 });
    res.json(result.docs || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getAgentById(req, res) {
  try {
    const { workspaceId, agentId } = req.params;
    const db = await connectDB(getAgentsDbName(workspaceId));
    const doc = await db.get(agentId).catch(() => null);
    if (!doc) return res.status(404).json({ error: "Agent not found" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateAgent(req, res) {
  try {
    const { workspaceId, agentId } = req.params;
    const updates = req.body;
    const db = await connectDB(getAgentsDbName(workspaceId));
    const doc = await db.get(agentId).catch(() => null);
    if (!doc) return res.status(404).json({ error: "Agent not found" });
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
