/**
 * AuthMiddleware - Sistema de autenticación
 * 
 * JWT-based authentication para proteger rutas.
 * Integrado con sistema de workspaces.
 */

import jwt from 'jsonwebtoken';
import { connectDB, getDbPrefix } from '../config/db.js';
import cache from '../config/cache.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion-super-secreto';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const USER_CACHE_TTL = 300; // 5 minutos

/**
 * Middleware: Requiere autenticación
 * Verifica JWT y carga usuario en req.user
 */
export async function requireAuth(req, res, next) {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token requerido',
        code: 'TOKEN_MISSING'
      });
    }
    
    const token = authHeader.substring(7); // Quitar "Bearer "
    
    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      });
    }
    
    // Cargar usuario (con cache)
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        error: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    // Adjuntar usuario a request
    req.user = user;
    req.userId = user._id;
    
    next();
    
  } catch (error) {
    console.error('[requireAuth] Error:', error);
    return res.status(500).json({ 
      error: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware opcional: Auth si hay token, pero no requerido
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continuar sin usuario
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.userId);
    
    if (user && user.status !== 'inactive') {
      req.user = user;
      req.userId = user._id;
    }
  } catch (err) {
    // Token inválido, pero continuar sin usuario
    console.log('[optionalAuth] Invalid token, continuing without user');
  }
  
  next();
}

/**
 * Middleware: Requiere que usuario sea miembro del workspace
 */
export async function requireWorkspaceMember(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticación requerida',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const workspaceId = req.params.workspaceId 
    || req.query.workspaceId 
    || req.body.workspaceId;
  
  if (!workspaceId) {
    return res.status(400).json({ 
      error: 'workspaceId requerido',
      code: 'WORKSPACE_ID_MISSING'
    });
  }
  
  // Verificar membresía
  const isMember = req.user.workspaces?.some(w => w.id === workspaceId);
  const isOwner = req.user.workspacesOwner?.includes(workspaceId);
  
  if (!isMember && !isOwner) {
    return res.status(403).json({ 
      error: 'No tienes acceso a este workspace',
      code: 'WORKSPACE_ACCESS_DENIED'
    });
  }
  
  req.workspaceId = workspaceId;
  req.isWorkspaceOwner = isOwner;
  
  next();
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(userId, extra = {}) {
  return jwt.sign(
    { userId, ...extra },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Obtiene usuario por ID (con cache)
 */
async function getUserById(userId) {
  const cacheKey = `user:${userId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  try {
    const db = await connectDB(`${getDbPrefix()}accounts`);
    const user = await db.get(userId);
    
    // No guardar password en cache
    const { password, ...userWithoutPassword } = user;
    cache.set(cacheKey, userWithoutPassword, USER_CACHE_TTL);
    
    return userWithoutPassword;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

/**
 * Invalida cache de usuario (llamar después de actualizar)
 */
export function invalidateUserCache(userId) {
  cache.del(`user:${userId}`);
}

export default requireAuth;
