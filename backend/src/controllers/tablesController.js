import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  getWorkspaceDbName,
  getTableDataDbName,
  getProjectDbName,
} from "../config/db.js";

export async function createTable(req, res) {
  try {
    const { workspaceId, name, type, headers, color, icon, projectId } = req.body;
    if (!workspaceId || !name) {
      return res.status(400).json({ error: "workspaceId and name are required" });
    }
    const tableDb = await connectDB(getWorkspaceDbName(workspaceId));
    const table = {
      _id: uuidv4(),
      name,
      description: req.body.description || "",
      type: type || "contacts",
      headers: headers || [],
      color: color || "#4CAF50",
      icon: icon || { name: "table" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await tableDb.insert(table);

    const dataDb = await connectDB(getTableDataDbName(workspaceId, table._id));
    await dataDb.insert({
      _id: uuidv4(),
      main: true,
      tableId: table._id,
      name: table.name,
      headers: table.headers,
      type: table.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (projectId) {
      const projectDb = await connectDB(getProjectDbName(workspaceId));
      const project = await projectDb.get(projectId).catch(() => null);
      if (project) {
        project.tables = project.tables || [];
        project.tables.push({
          id: table._id,
          tableId: table._id,
          title: table.name,
          color: table.color,
          icon: table.icon,
        });
        await projectDb.insert(project);
      }
    }

    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listTables(req, res) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
    const db = await connectDB(getWorkspaceDbName(workspaceId));
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

export async function getTableData(req, res) {
  try {
    const { workspaceId, tableId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const db = await connectDB(getTableDataDbName(workspaceId, tableId));
    const result = await db.find({
      // Importante: las filas reales normalmente NO tienen el campo "main".
      // El doc principal de metadatos sí tiene main: true.
      // Usamos un OR para obtener todos los docs que no sean el main:
      selector: {
        $or: [
          { main: { $exists: false } },
          { main: { $ne: true } },
        ],
      },
      limit: Number(limit),
      skip: Number(skip),
    });
    res.json(result.docs || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function addTableRow(req, res) {
  try {
    const { workspaceId, tableId } = req.params;
    const row = req.body;
    const db = await connectDB(getTableDataDbName(workspaceId, tableId));
    const doc = {
      _id: uuidv4(),
      ...row,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.insert(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
