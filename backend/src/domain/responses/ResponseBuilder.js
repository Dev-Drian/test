/**
 * ResponseBuilder - Construcción dinámica de respuestas
 * 
 * Genera respuestas basadas en templates configurados
 * en el agente o la tabla, sin hardcodear textos.
 */

export class ResponseBuilder {
  constructor(dependencies = {}) {
    this.tableRepository = dependencies.tableRepository;
  }
  
  /**
   * Construye una respuesta de éxito para creación
   * @param {object} context - Contexto de la conversación
   * @param {string} tableName - Nombre de la tabla
   * @param {object} fields - Campos del registro creado
   * @returns {Promise<string>}
   */
  async buildCreateSuccess(context, tableName, fields) {
    const templates = context.agent?.responseTemplates || {};
    
    // Si hay template personalizado
    if (templates.createSuccess) {
      return this.processTemplate(templates.createSuccess, {
        tableName,
        ...fields,
        hora: this.formatTo12Hour(fields.hora),
        fechaLegible: this.formatDate(fields.fecha),
      });
    }
    
    // Construir respuesta dinámica
    const fieldsConfig = await this._getFieldsConfig(context);
    
    let response = `✅ **¡${tableName} creado con éxito!**\n\n`;
    
    for (const [key, value] of Object.entries(fields)) {
      if (this._shouldSkipField(key, value)) continue;
      
      const config = fieldsConfig[key] || {};
      const emoji = config.emoji || '';
      const label = config.confirmLabel || config.label || this._capitalize(key);
      const displayValue = this._formatValue(key, value, config);
      
      response += `${emoji} **${label}:** ${displayValue}\n`;
    }
    
    response += '\n¡Te esperamos! 🎉';
    
    return response;
  }
  
  /**
   * Construye una respuesta para preguntar un campo
   * @param {object} fieldConfig - Configuración del campo
   * @param {object} context - Contexto (campos ya recolectados)
   * @returns {string}
   */
  buildFieldQuestion(fieldConfig, context = {}) {
    // Si tiene mensaje personalizado
    if (fieldConfig.askMessage) {
      return this.processTemplate(fieldConfig.askMessage, context);
    }
    
    const label = fieldConfig.label || fieldConfig.key;
    
    // Preguntas por defecto según tipo
    switch (fieldConfig.type) {
      case 'date':
        return `📅 ¿Para qué fecha?`;
      case 'time':
        return `🕐 ¿A qué hora?`;
      case 'phone':
      case 'telefono':
        return `📱 ¿Cuál es tu número de teléfono?`;
      case 'email':
        return `📧 ¿Cuál es tu correo electrónico?`;
      case 'select':
        if (fieldConfig.options?.length > 0) {
          const opts = fieldConfig.options.slice(0, 5).join(', ');
          return `¿Cuál ${label.toLowerCase()} prefieres? (${opts})`;
        }
        return `¿Cuál es el ${label.toLowerCase()}?`;
      default:
        return `¿Cuál es el ${label.toLowerCase()}?`;
    }
  }
  
  /**
   * Construye el resumen de progreso
   * @param {object} fields - Campos recolectados
   * @param {object} fieldsConfig - Configuración de campos
   * @returns {string}
   */
  buildProgressSummary(fields, fieldsConfig = {}) {
    const entries = Object.entries(fields).filter(([k, v]) => 
      v !== undefined && v !== null && v !== '' && k !== 'estado'
    );
    
    if (entries.length === 0) return '';
    
    // Ordenar por prioridad
    const sortedEntries = entries.sort((a, b) => {
      const configA = fieldsConfig[a[0]] || {};
      const configB = fieldsConfig[b[0]] || {};
      return (configA.priority || 99) - (configB.priority || 99);
    });
    
    // Evitar duplicados de valor
    const uniqueEntries = [];
    const seenValues = new Set();
    
    for (const [key, value] of sortedEntries) {
      const normalizedValue = String(value).toLowerCase().trim();
      if (seenValues.has(normalizedValue)) continue;
      seenValues.add(normalizedValue);
      
      const config = fieldsConfig[key] || {};
      const emoji = config.emoji || '✓';
      const label = config.confirmLabel || config.label || this._capitalize(key);
      const displayValue = this._formatValue(key, value, config);
      
      uniqueEntries.push(`${emoji} ${label}: ${displayValue}`);
    }
    
    if (uniqueEntries.length === 0) return '';
    
    return `✅ Tengo registrado:\n${uniqueEntries.join('\n')}\n\n`;
  }
  
  /**
   * Construye respuesta de cancelación confirmada
   */
  buildCancelSuccess(record, templates = {}) {
    if (templates.cancelSuccess) {
      return this.processTemplate(templates.cancelSuccess, {
        ...record,
        hora: this.formatTo12Hour(record.hora),
      });
    }
    
    let response = `✅ **Cita cancelada**\n\n`;
    if (record.mascota) response += `🐾 ${record.mascota}\n`;
    if (record.fecha) {
      response += `📅 ${record.fecha}`;
      if (record.hora) response += ` a las ${this.formatTo12Hour(record.hora)}`;
      response += `\n`;
    }
    response += `\nSi necesitas reagendar, avísame.`;
    
    return response;
  }
  
  /**
   * Construye respuesta de disponibilidad
   */
  buildAvailabilityResponse(availability, params = {}) {
    const { fecha, totalCitas, libres, ocupados } = availability;
    const fechaLegible = this.formatDate(fecha);
    
    let response = `**📅 Disponibilidad para ${fechaLegible}**\n\n`;
    
    if (libres.length === 0) {
      response += 'No hay horarios disponibles para esa fecha.\n\n';
      response += '¿Quieres que busque disponibilidad para otro día?';
      return response;
    }
    
    const horariosDisplay = libres.slice(0, 8).map(h => this.formatTo12Hour(h)).join(', ');
    response += `**Horarios disponibles:** ${horariosDisplay}`;
    
    if (libres.length > 8) {
      response += ` (+${libres.length - 8} más)`;
    }
    
    response += '\n';
    
    if (totalCitas > 0) {
      response += `\nCitas agendadas ese día: ${totalCitas}`;
    }
    
    response += `\n\n💡 Para agendar, dime la hora y el servicio que necesitas.`;
    
    return response;
  }
  
  /**
   * Construye respuesta de resultados de consulta
   */
  async buildQueryResults(rows, tableId, context) {
    const fieldsConfig = await this._getFieldsConfig(context, tableId);
    
    let response = `📋 Encontré ${rows.length} resultado(s):\n\n`;
    
    rows.slice(0, 10).forEach((row, i) => {
      const mainField = row.nombre || Object.values(row).find(v => typeof v === 'string' && v.length > 0);
      response += `${i + 1}. **${mainField || 'Sin nombre'}**\n`;
      
      const details = [];
      for (const [key, value] of Object.entries(row)) {
        if (this._shouldSkipField(key, value)) continue;
        if (value === mainField) continue;
        
        const config = fieldsConfig[key] || {};
        const emoji = config.emoji || '•';
        const label = config.label || this._capitalize(key);
        const displayValue = this._formatValue(key, value, config);
        
        details.push(`   ${emoji} ${label}: ${displayValue}`);
      }
      
      if (details.length > 0) {
        response += details.join('\n') + '\n';
      }
      response += '\n';
    });
    
    if (rows.length > 10) {
      response += `... y ${rows.length - 10} más`;
    }
    
    return response;
  }
  
  /**
   * Procesa un template reemplazando variables
   */
  processTemplate(template, context) {
    if (!template) return '';
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = context[key.trim()];
      return value !== undefined ? value : '';
    });
  }
  
  /**
   * Formatea hora a 12h
   */
  formatTo12Hour(time24) {
    if (!time24 || typeof time24 !== 'string') return time24;
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return `${hours}:${minutes} ${ampm}`;
  }
  
  /**
   * Formatea fecha legible
   */
  formatDate(dateStr) {
    if (!dateStr) return dateStr;
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  }
  
  /**
   * Obtiene la configuración de campos como mapa
   */
  async _getFieldsConfig(context, tableId) {
    const tId = tableId || context.pendingCreate?.tableId || context.analysis?.tableId;
    if (!tId || !this.tableRepository) return {};
    
    try {
      const configs = await this.tableRepository.getFieldsConfig(context.workspaceId, tId);
      const map = {};
      configs.forEach(c => { map[c.key] = c; });
      return map;
    } catch {
      return {};
    }
  }
  
  _shouldSkipField(key, value) {
    const skipKeys = ['_id', '_rev', 'main', 'createdAt', 'updatedAt', 'estado'];
    return skipKeys.includes(key) || key.startsWith('_') || !value;
  }
  
  _formatValue(key, value, config) {
    if (config?.type === 'time' || key === 'hora') {
      return this.formatTo12Hour(value);
    }
    if (config?.type === 'date' || key === 'fecha') {
      return this.formatDate(value);
    }
    if (key === 'precio' || config?.type === 'currency') {
      return `$${value}`;
    }
    if (key === 'duracion') {
      return `${value} min`;
    }
    return value;
  }
  
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default ResponseBuilder;
