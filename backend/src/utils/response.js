/**
 * Response Utilities - Respuestas estandarizadas para todos los endpoints
 * 
 * Formato estándar:
 * {
 *   success: boolean,
 *   data: object | array | null,    // Datos de la respuesta
 *   error: string | null,           // Mensaje de error (solo si success=false)
 *   code: string | null,            // Código de error (solo si success=false)
 *   meta: {                         // Metadatos opcionales
 *     total: number,
 *     page: number,
 *     limit: number,
 *     ...
 *   }
 * }
 */

// Códigos de error estándar
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Limits
  LIMIT_REACHED: 'LIMIT_REACHED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

/**
 * Respuesta exitosa
 */
export function successResponse(res, data, meta = null, statusCode = 200) {
  const response = {
    success: true,
    data,
    error: null,
    code: null,
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error
 */
export function errorResponse(res, message, code = ErrorCodes.INTERNAL_ERROR, statusCode = 500, extra = {}) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: message,
    code,
    ...extra
  });
}

/**
 * Error de validación
 */
export function validationError(res, message, fields = null) {
  return errorResponse(res, message, ErrorCodes.VALIDATION_ERROR, 400, { fields });
}

/**
 * Error de no encontrado
 */
export function notFoundError(res, resource = 'Recurso') {
  return errorResponse(res, `${resource} no encontrado`, ErrorCodes.NOT_FOUND, 404);
}

/**
 * Error de no autorizado
 */
export function unauthorizedError(res, message = 'Autenticación requerida') {
  return errorResponse(res, message, ErrorCodes.UNAUTHORIZED, 401);
}

/**
 * Error de prohibido/sin permisos
 */
export function forbiddenError(res, message = 'No tienes permisos para esta acción') {
  return errorResponse(res, message, ErrorCodes.FORBIDDEN, 403);
}

/**
 * Error de límite alcanzado
 */
export function limitError(res, limitType, current, limit, planId, upgradeInfo = {}) {
  return res.status(403).json({
    success: false,
    data: null,
    error: upgradeInfo.message || 'Has alcanzado el límite de tu plan',
    code: ErrorCodes.LIMIT_REACHED,
    limitType,
    current,
    limit,
    plan: planId,
    upgrade: {
      title: upgradeInfo.title || 'Límite alcanzado',
      message: upgradeInfo.message || 'Has alcanzado el límite de tu plan.',
      action: upgradeInfo.action || 'Mejora tu plan para continuar.',
      url: '/upgrade'
    }
  });
}

/**
 * Respuesta de lista paginada
 */
export function listResponse(res, items, total = null, page = 1, limit = 50) {
  return successResponse(res, items, {
    total: total ?? items.length,
    page,
    limit,
    hasMore: total ? (page * limit) < total : false
  });
}

/**
 * Respuesta de creación exitosa
 */
export function createdResponse(res, data, message = 'Creado exitosamente') {
  return res.status(201).json({
    success: true,
    data,
    error: null,
    code: null,
    message
  });
}

/**
 * Respuesta de actualización exitosa
 */
export function updatedResponse(res, data, message = 'Actualizado exitosamente') {
  return successResponse(res, data, { message });
}

/**
 * Respuesta de eliminación exitosa
 */
export function deletedResponse(res, message = 'Eliminado exitosamente') {
  return successResponse(res, null, { message });
}
