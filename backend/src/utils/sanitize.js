/**
 * Utilidades de sanitización de inputs
 * Previene XSS e inyección de datos maliciosos
 */

/**
 * Escapa caracteres HTML peligrosos
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Elimina caracteres de control y trim
 */
export const cleanString = (str) => {
  if (typeof str !== 'string') return str;
  // Elimina caracteres de control excepto newline y tab
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
};

/**
 * Sanitiza un string: limpia y opcionalmente escapa HTML
 */
export const sanitizeString = (str, options = {}) => {
  if (typeof str !== 'string') return str;
  
  let result = cleanString(str);
  
  if (options.escapeHtml !== false) {
    result = escapeHtml(result);
  }
  
  if (options.maxLength && result.length > options.maxLength) {
    result = result.substring(0, options.maxLength);
  }
  
  return result;
};

/**
 * Sanitiza un email (solo limpia, no escapa)
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return cleanString(email).toLowerCase();
};

/**
 * Sanitiza un objeto: sanitiza todos los strings recursivamente
 */
export const sanitizeObject = (obj, options = {}) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitiza la key también si es necesario
      const sanitizedKey = sanitizeString(key, { escapeHtml: false, maxLength: 100 });
      result[sanitizedKey] = sanitizeObject(value, options);
    }
    return result;
  }
  
  return obj;
};

/**
 * Valida y sanitiza un UUID
 */
export const sanitizeUUID = (id) => {
  if (typeof id !== 'string') return null;
  const cleaned = cleanString(id);
  // Patrón UUID v4 o IDs de CouchDB
  if (/^[a-zA-Z0-9_:-]{1,128}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
};

/**
 * Middleware Express para sanitizar req.body
 */
export const sanitizeBody = (options = {}) => (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, options);
  }
  next();
};
