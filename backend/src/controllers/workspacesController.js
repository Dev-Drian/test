import { v4 as uuidv4 } from "uuid";
import { connectDB, getWorkspacesDbName, getDbPrefix } from "../config/db.js";
import { successResponse, createdResponse, errorResponse, notFoundError, ErrorCodes } from "../utils/response.js";

export async function createWorkspace(req, res) {
  try {
    const { name, color, createdBy, businessInfo } = req.body;
    const user = req.user;
    
    if (!name) {
      return errorResponse(res, "El nombre es requerido", ErrorCodes.VALIDATION_ERROR, 400);
    }
    
    const db = await connectDB(getWorkspacesDbName());
    const workspaceId = uuidv4();
    
    const workspace = {
      _id: workspaceId,
      name,
      color: color || "rgb(0, 158, 121)",
      ownerId: user?._id || createdBy || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?._id || createdBy || null,
      members: [],
      // Datos generales del negocio (dirección, teléfono, horarios)
      businessInfo: businessInfo || null,
    };
    await db.insert(workspace);
    
    // Agregar workspace al usuario como owner
    if (user?._id) {
      try {
        const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
        const userDoc = await accountsDb.get(user._id);
        const ownerList = userDoc.workspacesOwner || [];
        const workspacesList = userDoc.workspaces || [];
        
        if (!ownerList.includes(workspaceId)) {
          ownerList.push(workspaceId);
        }
        if (!workspacesList.some(w => (w.id || w) === workspaceId)) {
          workspacesList.push({ id: workspaceId, role: 'owner' });
        }
        
        await accountsDb.insert({
          ...userDoc,
          workspacesOwner: ownerList,
          workspaces: workspacesList,
          onboardingCompleted: true, // Marcar onboarding como completado
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error actualizando usuario con workspace:', err.message);
      }
    }
    
    return createdResponse(res, workspace, 'Proyecto creado exitosamente');
  } catch (err) {
    console.error('[createWorkspace]', err);
    return errorResponse(res, err.message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

export async function listWorkspaces(req, res) {
  try {
    const db = await connectDB(getWorkspacesDbName());
    const user = req.user;
    
    if (!user) {
      return successResponse(res, []);
    }
    
    // Obtener IDs de workspaces del perfil del usuario
    const ownerIds = user.workspacesOwner || [];
    const memberIds = (user.workspaces || []).map(w => w.id || w);
    const profileIds = [...new Set([...ownerIds, ...memberIds])];
    
    // También buscar workspaces donde es dueño por ownerId (por si no está en perfil)
    let workspaces = [];
    
    // Buscar por ownerId
    const byOwner = await db.find({
      selector: { ownerId: user._id },
      limit: 200,
    });
    workspaces = byOwner.docs || [];
    
    // Buscar por IDs del perfil (si hay IDs que no encontramos por ownerId)
    if (profileIds.length > 0) {
      const existingIds = new Set(workspaces.map(w => w._id));
      const missingIds = profileIds.filter(id => !existingIds.has(id));
      
      if (missingIds.length > 0) {
        const byIds = await db.find({
          selector: { _id: { $in: missingIds } },
          limit: 200,
        });
        workspaces = [...workspaces, ...(byIds.docs || [])];
      }
    }
    
    return successResponse(res, workspaces, { total: workspaces.length });
  } catch (err) {
    console.error('[listWorkspaces]', err);
    return errorResponse(res, err.message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

export async function getWorkspaceById(req, res) {
  try {
    const { workspaceId } = req.params;
    const db = await connectDB(getWorkspacesDbName());
    const doc = await db.get(workspaceId).catch(() => null);
    
    if (!doc) {
      return notFoundError(res, 'Proyecto');
    }
    
    return successResponse(res, doc);
  } catch (err) {
    console.error('[getWorkspaceById]', err);
    return errorResponse(res, err.message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

export async function updateWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    const updates = req.body;
    const db = await connectDB(getWorkspacesDbName());
    const doc = await db.get(workspaceId).catch(() => null);
    
    if (!doc) {
      return notFoundError(res, 'Proyecto');
    }
    
    const updated = {
      ...doc,
      ...updates,
      _id: doc._id,
      _rev: doc._rev,
      updatedAt: new Date().toISOString(),
    };
    await db.insert(updated);
    
    return successResponse(res, updated, { message: 'Proyecto actualizado' });
  } catch (err) {
    console.error('[updateWorkspace]', err);
    return errorResponse(res, err.message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}
