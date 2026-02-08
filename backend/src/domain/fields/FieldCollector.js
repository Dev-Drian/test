/**
 * FieldCollector - Recolección dinámica de campos
 * 
 * Usa el LLM para extraer campos del mensaje del usuario
 * de forma inteligente basándose en la configuración real
 * de las tablas (fieldsConfig) obtenida de la BD.
 * 
 * NO tiene campos hardcodeados — todo se genera dinámicamente.
 */

export class FieldCollector {
  constructor(dependencies = {}) {
    this.aiProvider = dependencies.aiProvider;
    this.tableRepository = dependencies.tableRepository;
  }
  
  /**
   * Extrae campos del mensaje del usuario
   * @param {string} message - Mensaje del usuario
   * @param {object} pendingCreate - Estado del borrador (incluye fieldsConfig)
   * @param {array} history - Historial de conversación
   * @param {object} agent - Configuración del agente
   * @param {object} dateContext - Contexto de fechas
   * @returns {Promise<object>}
   */
  async extractFields(message, pendingCreate, history, agent, dateContext = {}) {
    const today = dateContext.today || this._getTodayInColombia();
    const tomorrow = this._calculateTomorrow(today);
    
    // Obtener fieldsConfig: del pendingCreate o del tableRepository
    let fieldsConfig = pendingCreate.fieldsConfig || [];
    if (fieldsConfig.length === 0 && this.tableRepository && pendingCreate.tableId) {
      try {
        fieldsConfig = await this.tableRepository.getFieldsConfig(
          pendingCreate.workspaceId || '',
          pendingCreate.tableId
        );
      } catch (e) {
        console.warn('[FieldCollector] Could not fetch fieldsConfig:', e.message);
      }
    }
    
    // Campos ya recolectados (con label para contexto)
    const collectedFields = Object.entries(pendingCreate.fields || {})
      .filter(([k, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        const cfg = fieldsConfig.find(f => f.key === k);
        const label = cfg?.label || k;
        return `${k} (${label}): ${v}`;
      })
      .join('\n');
    
    // Campos que faltan
    const missingFields = (pendingCreate.requiredFields || []).filter(k => {
      const v = pendingCreate.fields?.[k];
      return v === undefined || v === null || v === '';
    });
    
    // Detectar qué campo se está preguntando — DINÁMICO basado en fieldsConfig
    const currentlyAsking = this._detectCurrentlyAskingField(history, fieldsConfig, missingFields);
    
    const prompt = this._buildExtractionPrompt({
      message,
      today,
      tomorrow,
      collectedFields,
      missingFields,
      currentlyAsking,
      fieldsConfig,
      history: history.slice(-8),
    });
    
    try {
      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: prompt }],
        model: this._getModel(agent),
        maxTokens: 300,
        temperature: 0.2,
      });
      
      const content = response.content || '{}';
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error('[FieldCollector] Error extracting fields:', error);
      return { extractedFields: {}, isDataResponse: false };
    }
  }
  
  /**
   * Detecta qué campo se está preguntando basándose en el último mensaje del asistente
   * DINÁMICO: usa askMessage/label de fieldsConfig para hacer matching
   */
  _detectCurrentlyAskingField(history, fieldsConfig, missingFields) {
    const lastAssistant = history.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    if (!lastAssistant) return null;
    
    const lower = lastAssistant.toLowerCase();
    
    // Solo buscar entre campos que realmente faltan
    const missingConfigs = fieldsConfig.filter(fc => missingFields.includes(fc.key));
    
    // 1. Match exacto por askMessage (la pregunta que el bot usa para pedir el campo)
    for (const fc of missingConfigs) {
      if (fc.askMessage) {
        const askLower = fc.askMessage.toLowerCase().replace(/[¿?¡!]/g, '').trim();
        // Si el mensaje del asistente contiene la pregunta configurada
        if (lower.includes(askLower) || askLower.includes(lower.replace(/[¿?¡!✅📋📅🕐📱📧💅👩✨\n]/g, '').trim())) {
          return fc.key;
        }
      }
    }
    
    // 2. Match por label del campo
    for (const fc of missingConfigs) {
      const label = (fc.label || fc.key).toLowerCase();
      if (lower.includes(label)) {
        return fc.key;
      }
    }
    
    // 3. Match por palabras clave según tipo de campo
    for (const fc of missingConfigs) {
      const key = fc.key.toLowerCase();
      const type = (fc.type || '').toLowerCase();
      
      if ((type === 'phone' || key.includes('telefono') || key.includes('phone')) &&
          (lower.includes('teléfono') || lower.includes('telefono') || lower.includes('número') || lower.includes('contacto') || lower.includes('celular'))) {
        return fc.key;
      }
      if ((type === 'date' || key.includes('fecha')) &&
          (lower.includes('fecha') || lower.includes('día') || lower.includes('cuándo') || lower.includes('cuando'))) {
        return fc.key;
      }
      if ((type === 'time' || key.includes('hora')) &&
          (lower.includes('hora') || lower.includes('horario'))) {
        return fc.key;
      }
      if ((type === 'email' || key.includes('email') || key.includes('correo')) &&
          (lower.includes('correo') || lower.includes('email'))) {
        return fc.key;
      }
      // Match genérico: si el askMessage o label tiene "nombre" y el campo es de tipo texto
      if (lower.includes('nombre') && (key.includes('cliente') || key.includes('nombre') || key.includes('propietario'))) {
        return fc.key;
      }
      if (lower.includes('servicio') && (key.includes('servicio') || key.includes('service'))) {
        return fc.key;
      }
    }
    
    // 4. Si solo falta un campo, asumir que se pregunta por ese
    if (missingConfigs.length === 1) {
      return missingConfigs[0].key;
    }
    
    return null;
  }
  
  /**
   * Construye el prompt para extracción — 100% DINÁMICO basado en fieldsConfig
   */
  _buildExtractionPrompt(params) {
    const { message, today, tomorrow, collectedFields, missingFields, currentlyAsking, fieldsConfig, history } = params;
    
    const recentHistory = history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // Construir contexto del campo que se pregunta
    let fieldContext = '';
    if (currentlyAsking) {
      const cfg = fieldsConfig.find(f => f.key === currentlyAsking);
      const label = cfg?.label || currentlyAsking;
      fieldContext = `CAMPO QUE SE ESTÁ PREGUNTANDO: "${currentlyAsking}" (${label})
IMPORTANTE: Si el usuario responde con un valor simple, asígnalo al campo "${currentlyAsking}".`;
    }
    
    // Construir descripción dinámica de TODOS los campos faltantes
    // SOLO mostrar hints de conversión para el campo que se está preguntando
    const fieldDescriptions = missingFields.map(key => {
      const cfg = fieldsConfig.find(f => f.key === key);
      if (!cfg) return `- "${key}": campo de texto`;
      
      const type = cfg.type || 'text';
      const label = cfg.label || key;
      const isBeingAsked = !currentlyAsking || key === currentlyAsking;
      let desc = `- "${key}" (${label}): tipo ${type}`;
      
      if (type === 'date') {
        if (isBeingAsked) {
          desc += '. Convertir a formato YYYY-MM-DD. "hoy"="' + today + '", "mañana"="' + tomorrow + '"';
        } else {
          desc += '. NO extraer a menos que el usuario MENCIONE explícitamente una fecha en este mensaje.';
        }
      }
      if (type === 'time') {
        if (isBeingAsked) {
          desc += '. Convertir a formato HH:MM 24h. "7 PM"="19:00", "9 AM"="09:00"';
        } else {
          desc += '. NO extraer a menos que el usuario MENCIONE explícitamente una hora en este mensaje.';
        }
      }
      if (type === 'phone' || type === 'telefono') desc += '. DEBE tener 10 dígitos exactos';
      if (type === 'email') desc += '. Debe ser email válido';
      if (type === 'select' && cfg.options?.length > 0) desc += `. Opciones: ${cfg.options.join(', ')}`;
      if (type === 'relation') desc += `. Es una referencia (acepta nombre o texto libre)`;
      
      return desc;
    }).join('\n');
    
    return `Eres un asistente que extrae datos de mensajes para crear registros.

FECHA ACTUAL: ${today}
FECHA MAÑANA: ${tomorrow}

CONTEXTO DE LA CONVERSACIÓN:
${recentHistory}

DATOS YA RECOLECTADOS:
${collectedFields || '(ninguno)'}

CAMPOS QUE FALTAN POR RECOLECTAR (usa EXACTAMENTE estas keys en extractedFields):
${fieldDescriptions}

${fieldContext}

MENSAJE DEL USUARIO:
"${message}"

Responde SOLO con JSON válido:
{
  "isDataResponse": true/false,
  "extractedFields": { "campo_key": "valor" },
  "wantsToChangeFlow": true/false,
  "newIntent": null o "query" o "cancel" o "thanks",
  "clarificationNeeded": null o "mensaje"
}

REGLAS CRÍTICAS:
1. Las keys en "extractedFields" DEBEN ser EXACTAMENTE las keys listadas en CAMPOS QUE FALTAN (${missingFields.join(', ')}). NO uses otras keys.
2. Si el campo que se pregunta es "${currentlyAsking || '(ninguno)'}" y el usuario da un valor simple, asígnalo a ESE campo.
3. NO inventes datos. Solo extrae lo que el usuario dice EXPLÍCITAMENTE en su mensaje.
4. Si un nombre tiene varias palabras (ej: "Adrian Castro"), es UN solo valor para UN solo campo.
5. "gracias", "ok", "perfecto" → isDataResponse: false, newIntent: "thanks"
6. Si el usuario dice algo como "el que te pasé antes", "el mismo", etc., revisa el CONTEXTO para encontrar el valor.
7. SOLO si el usuario MENCIONA una fecha ("hoy", "mañana", "lunes", "el 15", etc.), conviértela a YYYY-MM-DD. Si NO menciona fecha, NO incluyas fecha en extractedFields.
8. SOLO si el usuario MENCIONA una hora ("a las 3", "7pm", etc.), conviértela a HH:MM 24h. Si NO menciona hora, NO incluyas hora en extractedFields.
9. Si el usuario pregunta algo ("qué servicios tienen?", "cuánto cuesta?", "hay disponibilidad?") → isDataResponse: false, wantsToChangeFlow: true, newIntent: "query".
10. "cancelar", "no quiero" → isDataResponse: false, wantsToChangeFlow: true, newIntent: "cancel".

REGLA FINAL CRÍTICA:
- Estás preguntando por el campo "${currentlyAsking || '(ninguno)'}".
- Extrae SOLO ese campo del mensaje del usuario.
- NO auto-rellenes NINGÚN otro campo (especialmente fecha u hora) a menos que el usuario los diga EXPLÍCITAMENTE en ESTE mensaje.
- Un nombre propio (ej: "Adrian Castro") SOLO es un nombre. NO contiene fecha ni hora.
- Si el mensaje es una sola palabra o frase simple, es la respuesta al campo que se preguntó. NADA MÁS.`;
  }
  
  /**
   * Valida un campo según su configuración
   * @param {string} fieldKey - Nombre del campo
   * @param {*} value - Valor a validar
   * @param {object} fieldConfig - Configuración del campo
   * @returns {object} - { valid: boolean, error?: string }
   */
  validateField(fieldKey, value, fieldConfig) {
    if (!value) {
      return { valid: false, error: `${fieldKey} es requerido` };
    }
    
    const validation = fieldConfig?.validation;
    if (!validation) return { valid: true };
    
    // Validación por tipo
    switch (fieldConfig.type) {
      case 'phone':
      case 'telefono':
        const digits = String(value).replace(/\D/g, '');
        const requiredDigits = validation.digits || 10;
        if (digits.length !== requiredDigits) {
          return { valid: false, error: `El teléfono debe tener ${requiredDigits} dígitos` };
        }
        return { valid: true, normalizedValue: digits };
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Email inválido' };
        }
        return { valid: true };
        
      case 'date':
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return { valid: false, error: 'Formato de fecha inválido (use YYYY-MM-DD)' };
        }
        return { valid: true };
        
      case 'time':
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (!timeRegex.test(value)) {
          return { valid: false, error: 'Formato de hora inválido (use HH:MM)' };
        }
        return { valid: true };
        
      default:
        // Validaciones genéricas
        if (validation.minLength && String(value).length < validation.minLength) {
          return { valid: false, error: `Mínimo ${validation.minLength} caracteres` };
        }
        if (validation.maxLength && String(value).length > validation.maxLength) {
          return { valid: false, error: `Máximo ${validation.maxLength} caracteres` };
        }
        return { valid: true };
    }
  }
  
  /**
   * Normaliza el valor de un campo según su tipo
   */
  normalizeFieldValue(fieldKey, value, fieldConfig) {
    switch (fieldConfig?.type) {
      case 'phone':
      case 'telefono':
        return String(value).replace(/\D/g, '');
        
      case 'text':
        return String(value).trim();
        
      case 'date':
        return value; // Ya debería estar en YYYY-MM-DD
        
      case 'time':
        return value; // Ya debería estar en HH:MM
        
      default:
        return value;
    }
  }
  
  _getTodayInColombia() {
    const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' });
    return now.split(',')[0];
  }
  
  _calculateTomorrow(todayStr) {
    const [year, month, day] = todayStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  _getModel(agent) {
    const aiModel = agent?.aiModel;
    if (Array.isArray(aiModel) && aiModel.length > 0) {
      const first = aiModel[0];
      return typeof first === 'string' ? first : first?.id || 'gpt-4o-mini';
    }
    return typeof aiModel === 'string' ? aiModel : 'gpt-4o-mini';
  }
}

export default FieldCollector;
