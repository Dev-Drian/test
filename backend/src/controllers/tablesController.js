import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  getWorkspaceDbName,
  getTableDataDbName,
  getProjectDbName,
} from "../config/db.js";

export async function createTable(req, res) {
  try {
    const { workspaceId, name, type, headers, color, icon, projectId, permissions } = req.body;
    if (!workspaceId || !name) {
      return res.status(400).json({ error: "workspaceId and name are required" });
    }
    const tableDb = await connectDB(getWorkspaceDbName(workspaceId));
    
    // Permisos por defecto - delete desactivado por seguridad
    const defaultPermissions = {
      allowQuery: true,
      allowCreate: true,
      allowUpdate: true,
      allowDelete: false,
    };
    
    const table = {
      _id: uuidv4(),
      name,
      description: req.body.description || "",
      type: type || "contacts",
      headers: headers || [],
      permissions: { ...defaultPermissions, ...(permissions || {}) },
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
      selector: {
        headers: { $exists: true }  // Solo documentos que tienen headers (tablas)
      },
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
      // Filtrar por tableId Y excluir documentos de metadatos (main: true)
      selector: {
        $and: [
          { tableId: tableId },
          { $or: [
            { main: { $exists: false } },
            { main: { $ne: true } },
          ]},
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
      tableId: tableId, // Agregar tableId para filtrar correctamente
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

export async function updateTableRow(req, res) {
  try {
    const { workspaceId, tableId, rowId } = req.params;
    const updates = req.body;
    const db = await connectDB(getTableDataDbName(workspaceId, tableId));
    
    // Obtener documento actual
    const doc = await db.get(rowId);
    
    // Actualizar campos (excepto _id, _rev, tableId)
    const updatedDoc = {
      ...doc,
      ...updates,
      _id: doc._id,
      _rev: doc._rev,
      tableId: doc.tableId,
      updatedAt: new Date().toISOString(),
    };
    
    await db.insert(updatedDoc);
    res.json(updatedDoc);
  } catch (err) {
    console.error(err);
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function deleteTableRow(req, res) {
  try {
    const { workspaceId, tableId, rowId } = req.params;
    const db = await connectDB(getTableDataDbName(workspaceId, tableId));
    
    // Obtener documento actual para obtener _rev
    const doc = await db.get(rowId);
    
    // Eliminar
    await db.destroy(rowId, doc._rev);
    res.json({ success: true, deleted: rowId });
  } catch (err) {
    console.error(err);
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.status(500).json({ error: err.message });
  }
}
