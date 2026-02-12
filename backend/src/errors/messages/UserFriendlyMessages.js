/**
 * @fileoverview Generador de mensajes amigables para el usuario
 * Convierte errores técnicos en mensajes comprensibles y útiles
 */

export class UserFriendlyMessages {
  constructor() {
    // Mensajes base por tipo de error
    this.messages = {
      // Errores de validación
      VALIDATION_ERROR: {
        default: '❌ Los datos ingresados no son válidos. Por favor, verifica e intenta de nuevo.',
        withField: '❌ El campo "{field}" no es válido. {expected}',
      },
      REQUIRED_FIELD: {
        default: '📝 Falta información requerida: {field}',
        suggestions: ['Por favor, proporciona este dato para continuar.'],
      },
      INVALID_FORMAT: {
        default: '❌ El formato no es correcto.',
        withExample: '❌ Formato incorrecto. Ejemplo válido: {example}',
      },

      // Errores de base de datos
      NOT_FOUND: {
        default: '🔍 No encontré lo que buscas.',
        withEntity: '🔍 No encontré ningún {entity} con esos datos.',
        suggestions: ['¿Quieres ver la lista disponible?', '¿Intentamos con otros datos?'],
      },
      DUPLICATE_ENTRY: {
        default: '⚠️ Ese registro ya existe.',
        withEntity: '⚠️ Ya existe un {entity} con ese {field}.',
      },
      SCHEDULE_CONFLICT: {
        default: '📅 Ya hay algo agendado para ese horario.',
        suggestions: ['¿Te muestro los horarios disponibles?'],
      },

      // Errores de IA
      AI_TIMEOUT: {
        default: '⏳ Estoy tardando más de lo normal en responder.',
        suggestions: ['¿Puedes repetir tu mensaje?'],
      },
      AI_RATE_LIMIT: {
        default: '🔄 Tengo muchas solicitudes en este momento.',
        suggestions: ['Por favor, espera unos segundos e intenta de nuevo.'],
      },
      AI_PROVIDER_ERROR: {
        default: '⚠️ Tuve un problema procesando tu solicitud.',
        suggestions: ['Por favor, intenta de nuevo.'],
      },

      // Errores de negocio
      UNAVAILABLE: {
        default: '📅 No hay disponibilidad para ese momento.',
        suggestions: ['¿Te muestro otras opciones?'],
      },
      OUT_OF_HOURS: {
        default: '⏰ Esa hora está fuera del horario de atención.',
      },
      LIMIT_EXCEEDED: {
        default: '⚠️ Se ha alcanzado el límite máximo.',
      },
      ACTION_NOT_ALLOWED: {
        default: '🚫 No es posible realizar esa acción.',
      },
      LATE_CANCELLATION: {
        default: '⚠️ Ya no es posible cancelar esta cita.',
        suggestions: ['¿Te gustaría reprogramarla en su lugar?'],
      },

      // Errores genéricos
      UNKNOWN_ERROR: {
        default: '😓 Algo salió mal. Por favor, intenta de nuevo.',
        suggestions: ['Si el problema persiste, contacta al soporte.'],
      },
      NETWORK_ERROR: {
        default: '📡 Hay problemas de conexión.',
        suggestions: ['Verifica tu conexión a internet e intenta de nuevo.'],
      },
      CIRCUIT_OPEN: {
        default: '⚠️ El servicio está temporalmente no disponible.',
        suggestions: ['Por favor, intenta en unos minutos.'],
      },
    };

    // Variaciones para hacer los mensajes más naturales
    this.variations = {
      apology: [
        '¡Ups! ',
        'Lo siento, ',
        'Disculpa, ',
        '',
      ],
      retry: [
        '¿Puedes intentar de nuevo?',
        'Por favor, intenta otra vez.',
        '¿Lo intentamos de nuevo?',
      ],
    };
  }

  /**
   * Construye un mensaje amigable para el usuario
   * @param {string} errorCode - Código del error
   * @param {Object} context - Contexto adicional
   * @returns {string}
   */
  build(errorCode, context = {}) {
    const messageConfig = this.messages[errorCode] || this.messages.UNKNOWN_ERROR;
    
    let message = this._selectMessage(messageConfig, context);
    message = this._interpolate(message, context);
    
    // Añadir sugerencias si existen
    const suggestions = context.suggestions || messageConfig.suggestions || [];
    if (suggestions.length > 0) {
      message += '\n\n' + this._formatSuggestions(suggestions, context);
    }

    return message;
  }

  /**
   * Selecciona el mensaje más apropiado basado en el contexto
   * @param {Object} config
   * @param {Object} context
   * @returns {string}
   */
  _selectMessage(config, context) {
    // Intentar mensaje más específico primero
    if (context.field && config.withField) {
      return config.withField;
    }
    if (context.entity && config.withEntity) {
      return config.withEntity;
    }
    if (context.example && config.withExample) {
      return config.withExample;
    }

    return config.default;
  }

  /**
   * Interpola variables en el mensaje
   * @param {string} message
   * @param {Object} context
   * @returns {string}
   */
  _interpolate(message, context) {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  }

  /**
   * Formatea las sugerencias
   * @param {string[]} suggestions
   * @param {Object} context
   * @returns {string}
   */
  _formatSuggestions(suggestions, context) {
    const interpolated = suggestions.map(s => this._interpolate(s, context));
    
    if (interpolated.length === 1) {
      return `💡 ${interpolated[0]}`;
    }
    
    return `💡 Sugerencias:\n${interpolated.map(s => `  • ${s}`).join('\n')}`;
  }

  /**
   * Obtiene una variación aleatoria
   * @param {string} type - Tipo de variación
   * @returns {string}
   */
  _getVariation(type) {
    const options = this.variations[type] || [''];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Construye un mensaje de confirmación exitosa
   * @param {string} action - Acción realizada
   * @param {Object} data - Datos de la acción
   * @returns {string}
   */
  buildSuccess(action, data = {}) {
    const successMessages = {
      create: [
        '✅ ¡Listo! {item} creado correctamente.',
        '✅ ¡Perfecto! Ya registré {item}.',
        '✅ ¡Hecho! {item} ha sido creado.',
      ],
      update: [
        '✅ ¡Actualizado! {item} modificado correctamente.',
        '✅ ¡Listo! Los cambios en {item} fueron guardados.',
      ],
      delete: [
        '✅ {item} eliminado correctamente.',
        '✅ ¡Listo! {item} ha sido eliminado.',
      ],
      schedule: [
        '✅ ¡Agendado! Tu cita para {date} a las {time} está confirmada.',
        '✅ ¡Perfecto! Quedaste agendado para {date} a las {time}.',
      ],
      cancel: [
        '✅ Cita cancelada correctamente.',
        '✅ Tu cita ha sido cancelada.',
      ],
    };

    const messages = successMessages[action] || successMessages.create;
    const template = messages[Math.floor(Math.random() * messages.length)];
    
    return this._interpolate(template, data);
  }
}

export default UserFriendlyMessages;
