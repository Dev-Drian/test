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

/**
 * Actualiza la estructura de una tabla (nombre, headers, permisos)
 * Solo permitido si la tabla no tiene datos (o muy pocos para migrar fácil)
 */
export async function updateTable(req, res) {
  try {
    const { workspaceId, tableId } = req.params;
    const { name, description, headers, permissions, color, icon } = req.body;
    
    if (!workspaceId || !tableId) {
      return res.status(400).json({ error: "workspaceId and tableId are required" });
    }
    
    const tableDb = await connectDB(getWorkspaceDbName(workspaceId));
    const table = await tableDb.get(tableId).catch(() => null);
    
    if (!table) {
      return res.status(404).json({ error: "Tabla no encontrada" });
    }
    
    // Verificar si la tabla tiene datos
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    const dataResult = await dataDb.find({
      selector: {
        $and: [
          { tableId: tableId },
          { $or: [
            { main: { $exists: false } },
            { main: { $ne: true } },
          ]},
        ],
      },
      limit: 1,
    });
    
    const hasData = (dataResult.docs || []).length > 0;
    
    // Si tiene datos, solo permitir cambios seguros (nombre, descripción, color, icon)
    // No permitir cambiar headers si hay datos
    if (hasData && headers && JSON.stringify(headers) !== JSON.stringify(table.headers)) {
      return res.status(400).json({ 
        error: "No se puede modificar la estructura de campos cuando la tabla tiene datos. Elimina los datos primero o crea una tabla nueva.",
        hasData: true 
      });
    }
    
    // Actualizar tabla
    const updatedTable = {
      ...table,
      name: name || table.name,
      description: description !== undefined ? description : table.description,
      headers: headers || table.headers,
      permissions: permissions ? { ...table.permissions, ...permissions } : table.permissions,
      color: color || table.color,
      icon: icon || table.icon,
      updatedAt: new Date().toISOString(),
    };
    
    await tableDb.insert(updatedTable);
    
    // También actualizar el documento de metadatos en la DB de datos
    try {
      const metaResult = await dataDb.find({
        selector: { main: true },
        limit: 1,
      });
      const metaDoc = metaResult.docs?.[0];
      if (metaDoc) {
        await dataDb.insert({
          ...metaDoc,
          name: updatedTable.name,
          headers: updatedTable.headers,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Could not update meta doc:', e.message);
    }
    
    res.json(updatedTable);
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
