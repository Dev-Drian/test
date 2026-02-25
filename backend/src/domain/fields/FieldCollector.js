/**
 * FieldCollector - Recolección dinámica de campos
 * 
 * Usa el LLM para extraer campos del mensaje del usuario
 * de forma inteligente basándose en la configuración real
 * de las tablas (fieldsConfig) obtenida de la BD.
 * 
 * NO tiene campos hardcodeados — todo se genera dinámicamente.
 */

import { validateRelationField } from '../../services/relationHandler.js';

export class FieldCollector {
  constructor(dependencies = {}) {
    this.aiProvider = dependencies.aiProvider;
    this.tableRepository = dependencies.tableRepository;
  }
  
  /**
   * Valida un campo extraído antes de aceptarlo
   * @param {string} fieldKey - Nombre del campo
   * @param {*} value - Valor extraído
   * @param {object} fieldConfig - Configuración del campo
   * @param {object} pendingCreate - Estado actual
   * @returns {object} { valid: boolean, normalizedValue?: any, error?: string }
   */
  async validateExtractedField(fieldKey, value, fieldConfig, pendingCreate) {
    // 1. Verificar que el campo realmente esté faltante
    const currentValue = pendingCreate.fields?.[fieldKey];
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      return {
        valid: false,
        error: 'Campo ya tiene valor',
      };
    }
    
    // 2. Validar campos de tipo relation contra la tabla relacionada
    if (fieldConfig.type === 'relation' && fieldConfig.relation) {
      const workspaceId = pendingCreate.workspaceId;
      const relationValidation = await validateRelationField(workspaceId, value, fieldConfig);
      
      if (!relationValidation.valid) {
        return {
          valid: false,
          error: relationValidation.error,
          availableOptions: relationValidation.availableOptions,
        };
      }
    }
    
    // 3. Validar según configuración
    const validation = this.validateField(fieldKey, value, fieldConfig);
    if (!validation.valid) {
      return validation;
    }
    
    // 4. Normalizar valor
    const normalizedValue = this.normalizeFieldValue(fieldKey, value, fieldConfig);
    
    return {
      valid: true,
      normalizedValue,
    };
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
      const extracted = JSON.parse(cleaned);
      
      // Validar y normalizar campos extraídos
      if (extracted.extractedFields && Object.keys(extracted.extractedFields).length > 0) {
        const validatedFields = {};
        const configMap = {};
        fieldsConfig.forEach(fc => {
          configMap[fc.key] = fc;
        });
        
        for (const [key, value] of Object.entries(extracted.extractedFields)) {
          const config = configMap[key];
          if (!config) {
            console.warn(`[FieldCollector] Unknown field: ${key}`);
            continue;
          }
          
          // Validar campo (ahora es async para validar relaciones)
          const validation = await this.validateExtractedField(key, value, config, pendingCreate);
          if (validation.valid) {
            validatedFields[key] = validation.normalizedValue;
          } else {
            console.warn(`[FieldCollector] Field validation failed: ${key} - ${validation.error}`);
            // Si hay opciones disponibles (campo de tipo relation), guardarlas para mostrar al usuario
            if (validation.availableOptions) {
              extracted.relationError = {
                field: key,
                value: value,
                error: validation.error,
                availableOptions: validation.availableOptions,
              };
            }
          }
        }
        
        extracted.extractedFields = validatedFields;
      }
      
      return extracted;
      
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
  "wantsToChangeField": null o { "field": "campo_key", "newValue": "nuevo_valor" },
  "clarificationNeeded": null o "mensaje"
}

REGLAS CRÍTICAS:
1. Las keys en "extractedFields" DEBEN ser EXACTAMENTE las keys listadas en CAMPOS QUE FALTAN (${missingFields.join(', ')}). NO uses otras keys.
2. EXTRAE TODOS LOS CAMPOS que el usuario mencione en su mensaje, no solo uno. Si dice "Juan Pérez, producto Software CRM, 5 unidades", extrae cliente, producto Y cantidad.
3. Si el campo que se pregunta es "${currentlyAsking || '(ninguno)'}" y el usuario da un valor simple (sin otros datos), asígnalo a ESE campo.
4. NO inventes datos. Solo extrae lo que el usuario dice EXPLÍCITAMENTE en su mensaje.
5. Si un nombre tiene varias palabras (ej: "Adrian Castro"), es UN solo valor para UN solo campo.
6. "gracias", "ok", "perfecto" → isDataResponse: false, newIntent: "thanks"
7. Si el usuario dice algo como "el que te pasé antes", "el mismo", etc., revisa el CONTEXTO para encontrar el valor.
8. Si el usuario MENCIONA una fecha ("hoy", "mañana", "lunes", "el 15", etc.), conviértela a YYYY-MM-DD e inclúyela.
9. Si el usuario MENCIONA una hora ("a las 3", "7pm", etc.), conviértela a HH:MM 24h e inclúyela.
10. Si el usuario pregunta algo ("qué servicios tienen?", "cuánto cuesta?", "hay disponibilidad?") → isDataResponse: false, wantsToChangeFlow: true, newIntent: "query".
11. "cancelar", "no quiero" → isDataResponse: false, wantsToChangeFlow: true, newIntent: "cancel".
12. MENSAJES DE INTENCIÓN ("quiero agendar", "necesito una cita") SIN detalles específicos → isDataResponse: false, extractedFields: {}
13. Si el mensaje NO responde a una pregunta específica ni da datos concretos → isDataResponse: false
14. Si el usuario dice "cambiar X", "el X es otro", "no, el X es...", "corregir X", "en lugar de X quiero Y" → wantsToChangeField: { "field": "campo_key", "newValue": "nuevo_valor" }. Aplica para CUALQUIER campo ya recolectado.

REGLAS PARA CAMPOS NUMÉRICOS (cantidad, precio, etc.):
15. Los campos de tipo number SOLO aceptan números positivos (a menos que se especifique lo contrario).
16. NUNCA extraigas valores negativos para cantidad, precio, stock u otros campos numéricos con validación min >= 0.
17. Si el usuario dice "-20 cantidad" o "cantidad negativa", → isDataResponse: false, clarificationNeeded: "La cantidad debe ser un número positivo"
18. Si el usuario dice "n + 1", "el doble", expresiones matemáticas → eso NO es un valor válido, clarificationNeeded: "Por favor indica un número específico"

REGLAS PARA NOMBRES DE PRODUCTOS CON NÚMEROS:
19. "Software CRM Pro 2" es el NOMBRE COMPLETO del producto, NO "Software CRM Pro" + cantidad 2.
20. Si el producto termina en número (ej: "CRM 2.0", "Windows 11", "PS5"), el número ES PARTE DEL NOMBRE.
21. Solo extrae cantidad cuando el usuario EXPLÍCITAMENTE la separa: "2 unidades de CRM", "CRM Pro, 5", "quiero 3".

REGLAS CONTRA TEXTO BASURA:
22. NUNCA uses el mensaje del usuario como valor de un campo a menos que sea una respuesta directa válida.
23. Si el usuario habla sobre el proceso ("de la cantidad de software") NO es un nombre de cliente válido.
24. Mensajes como "cambia X por Y", "el producto por el cliente" son INSTRUCCIONES, no datos → isDataResponse: false

REGLA FINAL - EXTRACCIÓN MÚLTIPLE:
- Si el usuario proporciona VARIOS datos en un mensaje, EXTRÁELOS TODOS.
- Ejemplo: "quiero registrar venta para Juan Pérez del producto CRM Pro, 3 unidades" → { "cliente": "Juan Pérez", "producto": "CRM Pro", "cantidad": 3 }
- Ejemplo: "Adrian Castro, Software CRM Pro, 5" → { "cliente": "Adrian Castro", "producto": "Software CRM Pro", "cantidad": 5 }
- NO limites la extracción a un solo campo cuando el usuario da más información.
- Si el mensaje es una sola palabra o frase simple, es la respuesta al campo que se preguntó (${currentlyAsking || 'ninguno'}).
- Analiza el mensaje completo y extrae TODOS los campos faltantes que puedas identificar.
- IMPORTANTE: Si no estás seguro de qué valor extraer, usa clarificationNeeded en lugar de adivinar.`;
  }
  
  /**
   * Valida un campo según su configuración
   * @param {string} fieldKey - Nombre del campo
   * @param {*} value - Valor a validar
   * @param {object} fieldConfig - Configuración del campo
   * @returns {object} - { valid: boolean, error?: string }
   */
  validateField(fieldKey, value, fieldConfig) {
    // Si no hay valor y el campo NO es requerido, es válido
    if (!value && !fieldConfig?.required) {
      return { valid: true };
    }
    
    // Si no hay valor y el campo ES requerido, error
    if (!value && fieldConfig?.required) {
      const label = fieldConfig?.label || fieldKey;
      return { valid: false, error: `${label} es requerido` };
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
      
      case 'number':
      case 'integer':
      case 'currency':
        // Convertir a número
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `${fieldConfig?.label || fieldKey} debe ser un número válido` };
        }
        // Validar min
        if (validation.min !== undefined && numValue < validation.min) {
          return { valid: false, error: `${fieldConfig?.label || fieldKey} debe ser al menos ${validation.min}` };
        }
        // Validar max
        if (validation.max !== undefined && numValue > validation.max) {
          return { valid: false, error: `${fieldConfig?.label || fieldKey} no puede ser mayor a ${validation.max}` };
        }
        return { valid: true, normalizedValue: numValue };
        
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
        
      case 'number':
      case 'integer':
      case 'currency':
        return Number(value);
        
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
