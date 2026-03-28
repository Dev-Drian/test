/**
 * messageUtils.js
 * 
 * Utilidades para manejo de mensajes en diferentes plataformas
 */

// Límites de caracteres por plataforma
export const MESSAGE_LIMITS = {
  telegram: 4096,
  whatsapp: 4096,
  messenger: 2000,
  instagram: 1000,
  widget: 10000,
  default: 2000
};

/**
 * Divide un texto largo en partes más pequeñas respetando un límite
 * Intenta cortar en puntos lógicos (párrafos, líneas, oraciones, espacios)
 * 
 * @param {string} text - Texto a dividir
 * @param {number} maxLength - Longitud máxima por parte (default: 2000)
 * @returns {string[]} - Array de partes del mensaje
 */
export function splitMessage(text, maxLength = MESSAGE_LIMITS.default) {
  if (!text || typeof text !== 'string') return [''];
  if (text.length <= maxLength) return [text];
  
  const parts = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }
    
    // Buscar un buen punto de corte (prioridad: párrafo > línea > oración > espacio)
    let cutPoint = maxLength;
    
    // 1. Primero intentar cortar en doble salto de línea (párrafo)
    const doubleNewline = remaining.lastIndexOf('\n\n', maxLength);
    if (doubleNewline > maxLength * 0.5) {
      cutPoint = doubleNewline + 2;
    } else {
      // 2. Luego intentar en salto de línea simple
      const newline = remaining.lastIndexOf('\n', maxLength);
      if (newline > maxLength * 0.5) {
        cutPoint = newline + 1;
      } else {
        // 3. Luego en punto y espacio (fin de oración)
        const period = remaining.lastIndexOf('. ', maxLength);
        if (period > maxLength * 0.5) {
          cutPoint = period + 2;
        } else {
          // 4. Finalmente en espacio
          const space = remaining.lastIndexOf(' ', maxLength);
          if (space > maxLength * 0.5) {
            cutPoint = space + 1;
          }
          // Si no hay buen punto de corte, cortar en maxLength
        }
      }
    }
    
    parts.push(remaining.substring(0, cutPoint).trim());
    remaining = remaining.substring(cutPoint).trim();
  }
  
  return parts.filter(p => p.length > 0);
}

/**
 * Obtiene el límite de caracteres para una plataforma específica
 * 
 * @param {string} platform - Nombre de la plataforma
 * @returns {number} - Límite de caracteres
 */
export function getMessageLimit(platform) {
  return MESSAGE_LIMITS[platform?.toLowerCase()] || MESSAGE_LIMITS.default;
}

/**
 * Divide un mensaje para una plataforma específica
 * 
 * @param {string} text - Texto a dividir
 * @param {string} platform - Plataforma destino
 * @returns {string[]} - Array de partes del mensaje
 */
export function splitMessageForPlatform(text, platform) {
  const limit = getMessageLimit(platform);
  return splitMessage(text, limit);
}
