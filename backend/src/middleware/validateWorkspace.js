/**
 * Middleware de validación de Workspace
 * 
 * Verifica que el workspaceId existe antes de procesar la petición.
 * Preparado para integrarse con sistema de auth.
 */

import { connectDB, getDbPrefix } from '../config/db.js';
import cache from '../config/cache.js';

const WORKSPACE_CACHE_TTL = 300; // 5 minutos

/**
 * Valida que el workspace existe
 * Extrae workspaceId de: params, query o body
 */
export async function validateWorkspace(req, res, next) {
  try {
    // Extraer workspaceId de diferentes fuentes
    const workspaceId = req.params.workspaceId 
      || req.query.workspaceId 
      || req.body.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ 
        error: 'workspaceId is required',
        code: 'WORKSPACE_ID_MISSING'
      });
    }
    
    // Verificar en cache primero
    const cacheKey = `workspace:exists:${workspaceId}`;
    const cached = cache.get(cacheKey);
    
    if (cached === true) {
      req.workspaceId = workspaceId;
      return next();
    }
    
    if (cached === false) {
      return res.status(404).json({ 
        error: 'Workspace not found',
        code: 'WORKSPACE_NOT_FOUND'
      });
    }
    
    // Verificar en DB
    const workspacesDb = await connectDB(`${getDbPrefix()}workspaces`);
    
    try {
      const workspace = await workspacesDb.get(workspaceId);
      
      if (workspace) {
        // Guardar en cache y continuar
        cache.set(cacheKey, true, WORKSPACE_CACHE_TTL);
        req.workspaceId = workspaceId;
        req.workspace = workspace; // Disponible si se necesita
        return next();
      }
    } catch (err) {
      if (err.statusCode === 404) {
        // Workspace no existe
        cache.set(cacheKey, false, 60); // Cache negativo más corto
        return res.status(404).json({ 
          error: 'Workspace not found',
          code: 'WORKSPACE_NOT_FOUND'
        });
      }
      throw err;
    }
    
  } catch (error) {
    console.error('[validateWorkspace] Error:', error);
    return res.status(500).json({ 
      error: 'Error validating workspace',
      code: 'WORKSPACE_VALIDATION_ERROR'
    });
  }
}

/**
 * Middleware opcional: Valida acceso del usuario al workspace
 * Se activa cuando hay sistema de auth
 * 
 * Por ahora solo verifica que existe, cuando haya auth verificará:
 * - Usuario autenticado (req.user)
 * - Usuario es miembro del workspace
 */
export async function validateWorkspaceAccess(req, res, next) {
  // Primero validar que existe
  await validateWorkspace(req, res, async () => {
    // TODO: Cuando haya auth, verificar membresía
    // const userId = req.user?.id;
    // if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // 
    // const isMember = req.workspace.members?.some(m => m._id === userId);
    // if (!isMember) return res.status(403).json({ error: 'Access denied' });
    
    next();
  });
}

/**
 * Middleware para rutas que NO requieren workspaceId
 * (crear workspace, listar workspaces del usuario, etc.)
 */
export function skipWorkspaceValidation(req, res, next) {
  next();
}

export default validateWorkspace;
