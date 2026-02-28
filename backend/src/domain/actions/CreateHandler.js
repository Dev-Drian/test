/**
 * CreateHandler - Handler para crear registros (LLM-First)
 * 
 * El LLM decide cuándo usar create_record y extrae los datos iniciales.
 * Este handler maneja el flujo completo:
 * - Iniciar borrador (pendingCreate)
 * - Recolectar campos faltantes
 * - Crear el registro cuando está completo
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';
import { EntityRepository } from '../../repositories/EntityRepository.js';
import { TableDataRepository } from '../../repositories/TableDataRepository.js';
import { processRelations, findTableByName } from '../../services/relationHandler.js';
import { TablePermissions } from '../../services/TablePermissions.js';
import { getOpenAIProvider } from '../../integrations/ai/OpenAIProvider.js';
import { getIntentClassifier, INTENTS } from '../../services/IntentClassifier.js';
import { executeBeforeCreateFlows, executeFlowsForTrigger, executePendingActions } from '../../services/FlowExecutor.js';

export class CreateHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
    this.entityRepo = new EntityRepository();
    this.tableDataRepo = new TableDataRepository();
    this.aiProvider = dependencies.aiProvider || getOpenAIProvider();
    this.intentClassifier = dependencies.intentClassifier || getIntentClassifier();
  }
  
  /**
   * Verifica si puede manejar una acción de tipo CREATE
   * Usa IntentClassifier para detectar cancelaciones de forma inteligente
   */
  async canHandle(context) {
    // Si hay pendingCreate activo
    if (context.pendingCreate) {
      // Usar IntentClassifier para detectar cancelación de forma inteligente
      const message = (context.message || '').trim();
      
      // Quick check para palabras exactas obvias (evitar llamada LLM innecesaria)
      if (/^(cancelar?|salir|exit|abandonar)$/i.test(message)) {
        console.log('[CreateHandler] User explicitly cancelled, clearing pendingCreate');
        context.clearPendingCreate();
        context.savePendingState();
        return false;
      }
      
      // Para casos ambiguos, usar el clasificador inteligente
      if (/^(no|ya\s*no|mejor\s*no|dejalo|olvidalo)$/i.test(message)) {
        const flowIntent = await this.intentClassifier.classifyFlowControl(message, context.pendingCreate);
        if (flowIntent === 'cancel') {
          console.log('[CreateHandler] IntentClassifier detected cancel intent');
          context.clearPendingCreate();
          context.savePendingState();
          return false;
        }
      }
      
      // Si el LLM eligió otra tool (query, availability, etc.), es consulta lateral
      if (context.selectedTool && context.selectedTool !== 'create_record') {
        console.log('[CreateHandler] Side query detected during pendingCreate:', context.selectedTool);
        context.sideQuery = true;
        return false; // Dejar que el handler correspondiente responda
      }
      
      // Cualquier otro caso durante pendingCreate -> continuar recolectando
      return true;
    }
    
    // Sin pendingCreate: verificar si es intención de crear
    if (context.intent?.actionType === 'create' || context.selectedTool === 'create_record') {
      const canCreate = context.agent?.planFeatures?.canCreate !== false;
      return canCreate;
    }
    
    return false;
  }
  
  /**
   * Ejecuta el flujo de creación
   */
  async execute(context) {
    const { workspaceId, tables, analysis } = context;
    const hasFlows = context.agent?.hasFlows === true;
    
    // Verificar permisos de la tabla ANTES de empezar (permiso directo + dependencias)
    if (!context.pendingCreate && analysis?.tableId) {
      // Soportar tanto 'id' (de ChatService) como '_id' (de DB directa)
      const targetTable = tables?.find(t => (t.id || t._id) === analysis.tableId);
      
      // Verificar permiso completo (directo + dependencias)
      const permission = TablePermissions.checkFullPermissions(targetTable, 'create', tables);
      if (!permission.allowed) {
        return {
          handled: true,
          response: permission.reason,
        };
      }
    }
    
    // 1. Si no hay pendingCreate, inicializar uno nuevo
    let isNewPendingCreate = false;
    if (!context.pendingCreate) {
      const initResult = await this._initPendingCreate(context);
      if (initResult?.handled) return initResult;
      isNewPendingCreate = true;
    }
    
    // 2. Fusionar campos extraídos del mensaje actual (SOLO de analysis, no de FieldCollector)
    // Primero intentar con analysis (de la detección de intención)
    if (context.analysis?.create?.fields) {
      context.mergeFields(context.analysis.create.fields);
    }
    
    // 2a. Verificar si hay una confirmación de coincidencia pendiente (confirmOnMatch)
    if (context.pendingCreate?.pendingConfirmation) {
      const confirmation = context.pendingCreate.pendingConfirmation;
      const message = (context.message || '').toLowerCase().trim();
      
      // Detectar respuesta sí/no
      const isYes = /^(s[ií]|yes|si|sip|ok|correcto|exacto|ese|esa|soy yo|es[eo])$/i.test(message);
      const isNo = /^(no|nop|otro|nueva?|diferente|no soy|no es)$/i.test(message);
      
      if (isYes) {
        // Usuario confirmó que es él - usar el cliente existente
        console.log('[CreateHandler] User confirmed match, using existing:', confirmation.matchFound);
        const matchName = confirmation.matchFound.nombre || confirmation.matchFound[confirmation.field];
        context.addFields({ [confirmation.field]: matchName });
        delete context.pendingCreate.pendingConfirmation;
        context.savePendingState();
        
        // Continuar con el siguiente campo (el flujo normal lo manejará)
      }
      
      if (isNo) {
        // Usuario dijo que no es él - pedir datos para crear nuevo cliente
        console.log('[CreateHandler] User rejected match, will create new');
        delete context.pendingCreate.pendingConfirmation;
        
        // Guardar el nombre que ingresó para el nuevo cliente
        context.pendingCreate.newRelatedRecord = {
          tableName: confirmation.tableName,
          field: confirmation.field,
          partialData: { nombre: confirmation.inputValue },
        };
        context.savePendingState();
        
        return {
          handled: true,
          response: `👍 Entendido, crearemos tu registro.\n\n📧 ¿Cuál es tu correo electrónico?`,
        };
      }
      
      // Si no es sí ni no, recordarle la pregunta
      if (!isYes && !isNo && message.length > 0 && message.length < 20) {
        const matchName = confirmation.matchFound.nombre || confirmation.inputValue;
        return {
          handled: true,
          response: `Por favor, responde **sí** o **no**.\n\n¿Eres **${matchName}**?`,
        };
      }
    }
    
    // 2b. Verificar si estamos creando un nuevo registro relacionado
    if (context.pendingCreate?.newRelatedRecord) {
      const newRecord = context.pendingCreate.newRelatedRecord;
      const message = (context.message || '').trim();
      
      // Detectar si es email
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !newRecord.partialData.email) {
        newRecord.partialData.email = emailMatch[0];
        context.savePendingState();
        
        return {
          handled: true,
          response: `✅ Email: ${emailMatch[0]}\n\n📱 ¿Cuál es tu número de teléfono?`,
        };
      }
      
      // Detectar si es teléfono (10 dígitos)
      const phoneMatch = message.replace(/\D/g, '');
      if (phoneMatch.length >= 10 && !newRecord.partialData.telefono) {
        newRecord.partialData.telefono = phoneMatch.slice(0, 10);
        
        // Ya tenemos todos los datos - crear el cliente
        try {
          const { createRelatedRecord, findTableByName } = await import('../../services/relationHandler.js');
          const relatedTable = await findTableByName(context.workspaceId, newRecord.tableName);
          
          if (relatedTable) {
            const created = await createRelatedRecord(context.workspaceId, relatedTable._id, newRecord.partialData);
            console.log('[CreateHandler] Created new related record:', created);
            
            // Asignar el cliente a la venta
            context.addFields({ [newRecord.field]: newRecord.partialData.nombre });
            delete context.pendingCreate.newRelatedRecord;
            context.savePendingState();
            
            const successMsg = `✅ ¡Bienvenido/a **${newRecord.partialData.nombre}**!\n\nTe he registrado como nuevo cliente.`;
            
            // Continuar con el siguiente campo
            const nextField = await this._askForNextField(context);
            return {
              handled: true,
              response: `${successMsg}\n\n${nextField.response}`,
            };
          }
        } catch (err) {
          console.error('[CreateHandler] Error creating related record:', err);
        }
      }
    }

    // Si es un nuevo pendingCreate Y el mensaje no contiene datos (solo intención),
    // ir directo a preguntar el primer campo sin correr FieldCollector
    const analysisHasFields = context.analysis?.create?.fields && 
      Object.keys(context.analysis.create.fields).length > 0;
    
    // Verificar si el fallback en _initPendingCreate ya extrajo campos suficientes
    const fallbackExtractedAll = isNewPendingCreate && context.isComplete();
    
    if (isNewPendingCreate && !analysisHasFields && !fallbackExtractedAll) {
      // Mensaje de intención pura ("quiero registrar una venta") sin datos
      // No correr FieldCollector, ir directo a preguntar el primer campo
      return await this._askForNextField(context);
    }
    
    // 2b. Usar FieldCollector si hay campos faltantes
    // Esto permite que "quiero registrar venta para Juan, producto CRM, 5 unidades" extraiga todos los campos
    if (context.pendingCreate && this.fieldCollector && !context.isComplete()) {
      try {
        console.log('[CreateHandler] Extracting fields with FieldCollector...');
        const extracted = await this.fieldCollector.extractFields(
          context.message,
          context.pendingCreate,
          context.history || [],
          context.agent,
          context.dateContext
        );
        console.log('[CreateHandler] FieldCollector result:', JSON.stringify(extracted));
        
        // Si el usuario quiere cambiar de flujo (ej: preguntar servicios, cancelar)
        if (extracted?.wantsToChangeFlow && extracted?.newIntent) {
          console.log('[CreateHandler] User wants to change flow:', extracted.newIntent);
          
          // PRIMERO: Guardar cualquier campo extraído ANTES de cambiar de flujo
          // Esto permite que "Mauro, qué productos hay?" capture "Mauro" como cliente
          if (extracted?.extractedFields && Object.keys(extracted.extractedFields).length > 0) {
            console.log('[CreateHandler] Saving extracted fields before flow change:', extracted.extractedFields);
            context.addFields(extracted.extractedFields);
            context.savePendingState();
          }
          
          if (extracted.newIntent === 'cancel') {
            context.clearPendingCreate();
            context.savePendingState();
            return {
              handled: true,
              response: 'Operación cancelada. ¿En qué más puedo ayudarte?',
            };
          }
          
          // Para query, availability, thanks → indicar al Engine que re-procese
          // Los campos ya fueron guardados arriba, así que el contexto se preserva
          // Devolver handled: false CON newIntent para que el Engine re-procese
          return { 
            handled: false, 
            flowChange: true,
            newIntent: extracted.newIntent,
            message: `El usuario quiere ${extracted.newIntent} mientras tiene un registro pendiente`,
          };
        }
        
        // Si hubo error de validación de relación, mostrar mensaje con opciones
        if (extracted?.relationError) {
          const { field, value, error, availableOptions } = extracted.relationError;
          console.log('[CreateHandler] Relation validation error:', error);
          
          // Obtener la configuración del campo para re-preguntar
          const fieldsConfig = await this.tableRepository.getFieldsConfig(
            context.workspaceId,
            context.pendingCreate.tableId
          );
          const fieldConfig = fieldsConfig.find(fc => fc.key === field);
          const label = fieldConfig?.label || field;
          
          // Construir mensaje con opciones disponibles
          const optionsStr = availableOptions?.slice(0, 8).join(', ') || '';
          
          return {
            handled: true,
            response: `⚠️ "${value}" no está registrado como ${label}.\n\n📋 Opciones disponibles: ${optionsStr}\n\n¿Cuál ${label} deseas seleccionar?`,
          };
        }
        
        // Si se encontró coincidencia que necesita confirmación (confirmOnMatch)
        if (extracted?.confirmationNeeded) {
          const { field, value, matchFound, tableName, message } = extracted.confirmationNeeded;
          console.log('[CreateHandler] Confirmation needed for relation match:', matchFound);
          
          // Guardar en contexto el estado de confirmación pendiente
          context.pendingCreate.pendingConfirmation = {
            field: field,
            inputValue: value,
            matchFound: matchFound,
            tableName: tableName,
          };
          context.savePendingState();
          
          // Construir mensaje de confirmación amigable
          const matchName = matchFound.nombre || matchFound[extracted.confirmationNeeded.matchField] || value;
          const matchEmail = matchFound.email ? ` (${matchFound.email})` : '';
          const matchPhone = matchFound.telefono ? ` - Tel: ${matchFound.telefono}` : '';
          
          return {
            handled: true,
            response: `🔍 Encontré a **${matchName}**${matchEmail}${matchPhone} registrado.\n\n¿Eres tú? (sí/no)`,
          };
        }
        
        // Si el usuario quiere cambiar un campo ya recolectado
        if (extracted?.wantsToChangeField) {
          const { field, newValue } = extracted.wantsToChangeField;
          console.log('[CreateHandler] User wants to change field:', field, 'to:', newValue);
          
          // Obtener la configuración del campo
          const fieldsConfig = await this.tableRepository.getFieldsConfig(
            context.workspaceId,
            context.pendingCreate.tableId
          );
          const fieldConfig = fieldsConfig.find(fc => fc.key === field);
          
          if (!fieldConfig) {
            // Campo no encontrado, buscar por label
            const fieldByLabel = fieldsConfig.find(fc => 
              fc.label?.toLowerCase().includes(field.toLowerCase()) ||
              fc.key.toLowerCase().includes(field.toLowerCase())
            );
            
            if (fieldByLabel) {
              const changeResult = context.changeField(fieldByLabel.key, newValue);
              if (changeResult.success) {
                const label = fieldByLabel.label || fieldByLabel.key;
                context.savePendingState();
                
                // Continuar con el flujo preguntando el siguiente campo faltante
                return await this._askForNextFieldWithChange(context, label, changeResult.oldValue, newValue);
              } else {
                return {
                  handled: true,
                  response: `⚠️ No pude cambiar el ${fieldByLabel.label}: ${changeResult.error}`,
                };
              }
            }
            
            return {
              handled: true,
              response: `No encontré el campo "${field}" para cambiar. ¿Cuál campo deseas modificar?`,
            };
          }
          
          // Validar el nuevo valor para campos de tipo relation
          if (fieldConfig.type === 'relation' && fieldConfig.relation) {
            const { validateRelationField } = await import('../../services/relationHandler.js');
            const relationValidation = await validateRelationField(context.workspaceId, newValue, fieldConfig);
            
            if (!relationValidation.valid) {
              const optionsStr = relationValidation.availableOptions?.slice(0, 8).join(', ') || '';
              return {
                handled: true,
                response: `⚠️ "${newValue}" no está registrado como ${fieldConfig.label}.\n\n📋 Opciones disponibles: ${optionsStr}\n\n¿Cuál ${fieldConfig.label} deseas?`,
              };
            }
          }
          
          const changeResult = context.changeField(field, newValue);
          if (changeResult.success) {
            const label = fieldConfig.label || field;
            context.savePendingState();
            
            // Continuar con el flujo preguntando el siguiente campo faltante
            return await this._askForNextFieldWithChange(context, label, changeResult.oldValue, newValue);
          } else {
            return {
              handled: true,
              response: `⚠️ No pude cambiar el ${fieldConfig.label}: ${changeResult.error}`,
            };
          }
        }
        
        if (extracted?.extractedFields && Object.keys(extracted.extractedFields).length > 0) {
          // Fusionar con validación y normalización
          const mergeResult = context.mergeFields(extracted.extractedFields, {
            validate: true,
            normalize: true,
          });
          
          console.log('[CreateHandler] Merge result:', mergeResult);
          
          // Si hubo campos rechazados, generar mensaje de error
          if (mergeResult.rejected.length > 0) {
            const errors = mergeResult.rejected.map(r => `${r.key}: ${r.reason}`).join('\n');
            console.warn('[CreateHandler] Some fields were rejected:', errors);
            
            // Preguntar de nuevo el primer campo rechazado
            const firstRejected = mergeResult.rejected[0];
            const fieldsConfig = await this.tableRepository.getFieldsConfig(
              context.workspaceId,
              context.pendingCreate.tableId
            );
            const fieldConfig = fieldsConfig.find(fc => fc.key === firstRejected.key);
            
            if (fieldConfig) {
              return {
                handled: true,
                response: `⚠️ ${firstRejected.reason}\n\n${this._generateQuestion(fieldConfig, context)}`,
              };
            }
          }
          
          // IMPORTANTE: Guardar estado después de fusionar campos exitosamente
          context.savePendingState();
        }
      } catch (error) {
        console.error('[CreateHandler] Error extracting fields:', error);
      }
    }
    
    // Siempre guardar estado antes de verificar completitud
    context.savePendingState();
    
    // 3. Verificar si tenemos todos los campos
    if (!context.isComplete()) {
      // Faltan campos - generar pregunta
      return await this._askForNextField(context);
    }
    
    // 4. Todos los campos completos
    if (hasFlows) {
      // Plan premium: crear automáticamente
      return await this._createRecord(context);
    } else {
      // Plan básico: crear pero avisar que es manual
      return await this._createRecordBasicPlan(context);
    }
  }
  
  /**
   * Inicializa un nuevo pendingCreate
   */
  async _initPendingCreate(context) {
    const tableId = context.analysis?.tableId;
    const tableName = context.analysis?.tableName;
    
    if (!tableId) {
      // Pedir al LLM que genere una clarificación natural
      const clarification = await this._askLLMForClarification(context);
      return {
        handled: true,
        response: clarification,
      };
    }
    
    // Obtener campos requeridos y configuración completa de la tabla
    const requiredFields = await this.tableRepository.getRequiredFields(
      context.workspaceId,
      tableId
    );
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      tableId
    );
    
    context.initPendingCreate(tableId, tableName, requiredFields, fieldsConfig);
    
    // Fusionar campos iniciales si los hay
    if (context.analysis?.create?.fields) {
      context.mergeFields(context.analysis.create.fields);
    }
    
    // ═══ FALLBACK: Extracción inteligente del mensaje ═══
    // Si el LLM no extrajo campos pero el mensaje tiene datos, extraerlos aquí
    const extractedFields = context.analysis?.create?.fields || {};
    if (Object.keys(extractedFields).length === 0 && context.message?.length > 15) {
      const fallbackFields = this._extractFieldsFromMessage(context.message, fieldsConfig);
      if (Object.keys(fallbackFields).length > 0) {
        console.log('[CreateHandler] FALLBACK extraction:', fallbackFields);
        context.mergeFields(fallbackFields);
      }
    }
    
    // IMPORTANTE: Guardar estado después de inicializar
    context.savePendingState();
    
    this.eventEmitter.emit(EVENTS.CREATE_STARTED, {
      workspaceId: context.workspaceId,
      tableId,
      tableName,
    });
  }
  
  /**
   * Extrae campos del mensaje del usuario cuando el LLM no lo hizo.
   * Usa patrones de NLP para detectar nombres, cantidades, fechas, etc.
   * 
   * @param {string} message - Mensaje del usuario
   * @param {Array} fieldsConfig - Configuración de campos de la tabla
   * @returns {object} Campos extraídos
   * @private
   */
  _extractFieldsFromMessage(message, fieldsConfig) {
    const extracted = {};
    const msgLower = message.toLowerCase();
    
    // Patrones de extracción
    const patterns = {
      // Nombre de persona: "soy [nombre]", "me llamo [nombre]", "mi nombre es [nombre]"
      nome: /(?:soy|me llamo|mi nombre es|i(?:'| a)?m|my name is)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i,
      
      // Cantidad: "10 licencias", "5 unidades", "cantidad 3", "3 productos"
      cantidad: /(\d+)\s*(?:licencias?|unidades?|productos?|piezas?|items?|units?)?/i,
      
      // Producto: después de "de" o "registrar": "venta de software", "10 licencias de CRM"
      producto: /(?:de|registrar|venta de|pedido de|compra de)\s+(\d+\s+)?([a-záéíóúñ\s]+?)(?:\s+(?:para|a|por)|\s*$)/i,
      
      // Fecha: "mañana", "hoy", "para el lunes", fechas formato
      fecha: /(?:para|el|fecha)\s*(hoy|mañana|pasado mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?)/i,
      
      // Hora: "a las 3", "15:00", "3pm"
      hora: /(?:a las?\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
      
      // Email
      email: /[\w.-]+@[\w.-]+\.\w+/i,
      
      // Teléfono: 10 dígitos
      telefono: /\b(\d{10})\b/,
    };
    
    // Buscar campos en fieldsConfig que coincidan con patrones
    for (const field of fieldsConfig) {
      const key = field.key?.toLowerCase() || '';
      const label = field.label?.toLowerCase() || '';
      
      // Cliente/Nombre
      if ((key.includes('cliente') || key.includes('nombre') || label.includes('cliente') || label.includes('nombre')) && !extracted[field.key]) {
        const match = message.match(patterns.nome);
        if (match) {
          extracted[field.key] = match[1].trim();
        }
      }
      
      // Cantidad
      if ((key.includes('cantidad') || label.includes('cantidad')) && !extracted[field.key]) {
        const match = message.match(patterns.cantidad);
        if (match && parseInt(match[1]) > 0 && parseInt(match[1]) < 10000) {
          extracted[field.key] = parseInt(match[1]);
        }
      }
      
      // Producto - buscar en el mensaje después de palabras clave
      if ((key.includes('producto') || key.includes('articulo') || label.includes('producto')) && !extracted[field.key]) {
        // Buscar productos conocidos en el mensaje
        const productWords = ['software', 'crm', 'licencia', 'servidor', 'cloud', 'producto', 'servicio', 'consultor', 'plan', 'suscripcion', 'hosting', 'app', 'sistema'];
        for (const word of productWords) {
          if (msgLower.includes(word)) {
            // Extraer el contexto alrededor de la palabra (hasta 3 palabras)
            const productMatch = message.match(new RegExp(`((?:[A-Za-záéíóúñÁÉÍÓÚÑ]+\\s+)?${word}(?:\\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+){0,2})`, 'i'));
            if (productMatch) {
              extracted[field.key] = productMatch[1].trim();
              break;
            }
          }
        }
        
        // Fallback: extraer lo que viene después de la cantidad
        // e.g. "venta de 2 Servidor Cloud" → "Servidor Cloud"
        if (!extracted[field.key]) {
          const afterQuantity = message.match(/\b\d+\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+){0,3})/);
          if (afterQuantity) {
            // Filtrar palabras que son otros campos (como nombres de personas ya extraídos)
            const candidate = afterQuantity[1].trim();
            const alreadyExtracted = Object.values(extracted);
            if (!alreadyExtracted.some(v => typeof v === 'string' && v.toLowerCase() === candidate.toLowerCase())) {
              extracted[field.key] = candidate;
            }
          }
        }
      }
      
      // Email
      if ((key.includes('email') || key.includes('correo') || field.type === 'email') && !extracted[field.key]) {
        const match = message.match(patterns.email);
        if (match) {
          extracted[field.key] = match[0];
        }
      }
      
      // Teléfono
      if ((key.includes('telefono') || key.includes('phone') || key.includes('celular') || field.type === 'phone') && !extracted[field.key]) {
        const digits = message.replace(/\D/g, '');
        if (digits.length >= 10) {
          extracted[field.key] = digits.slice(0, 10);
        }
      }
      
      // Titulo/Tarea (para tablas de tareas)
      if ((key.includes('titulo') || key.includes('tarea') || label.includes('tarea')) && !extracted[field.key]) {
        const taskMatch = message.match(/(?:agregar|crear|añadir)\s+(?:una?\s+)?(?:tarea)[:\s]+(.+?)(?:,|$)/i)
          || message.match(/(?:tarea)[:\s]+(.+?)(?:,|$)/i)
          || message.match(/(?:agregar|crear|añadir)[:\s]+(.+?)(?:,|$)/i);
        if (taskMatch) {
          // Limpiar prefijos como "tarea:", "una tarea:"
          let title = taskMatch[1].trim().replace(/^(?:una?\s+)?(?:tarea)[:\s]+/i, '').trim();
          extracted[field.key] = title;
        }
      }
    }
    
    return extracted;
  }

  /**
   * Genera pregunta para el siguiente campo faltante
   * Si es la primera pregunta (ningún campo recolectado), pide TODOS los campos a la vez
   */
  async _askForNextField(context) {
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      context.pendingCreate.tableId
    );
    
    // Ordenar por prioridad
    const sortedConfig = fieldsConfig.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    // Campos recolectados
    const collectedCount = Object.keys(context.collectedFields || {}).filter(k => {
      const v = context.collectedFields[k];
      return v !== undefined && v !== null && v !== '';
    }).length;
    
    // Si es la primera pregunta (ningún campo recolectado), pedir TODOS los campos requeridos
    if (collectedCount === 0 && context.missingFields.length > 1) {
      const tableName = context.pendingCreate.tableName || 'registro';
      const fieldsList = sortedConfig
        .filter(fc => context.missingFields.includes(fc.key))
        .map(fc => `• ${fc.emoji || '📝'} ${fc.label || fc.key}`)
        .join('\n');
      
      const question = `Para registrar ${tableName}, necesito los siguientes datos:\n\n${fieldsList}\n\n💡 Puedes escribirlos todos juntos o uno por uno.`;
      
      context.savePendingState();
      
      return {
        handled: true,
        response: question,
        formatted: true,
      };
    }
    
    // Encontrar el primer campo faltante
    const nextField = sortedConfig.find(fc => context.missingFields.includes(fc.key));
    
    if (!nextField) {
      // Todos los campos están completos, mostrar resumen y confirmar
      const fieldsConfig = sortedConfig;
      const progress = this._buildProgressSummary(context.collectedFields, fieldsConfig);
      context.savePendingState();
      return {
        handled: true,
        response: progress + '\n¿Deseas confirmar el registro?',
      };
    }
    
    // Generar pregunta
    const question = this._generateQuestion(nextField, context);
    
    // Construir resumen de progreso
    const progress = this._buildProgressSummary(context.collectedFields, fieldsConfig);
    
    // Guardar estado
    context.savePendingState();
    
    return {
      handled: true,
      response: progress + question,
      formatted: true,
    };
  }
  
  /**
   * Genera pregunta para el siguiente campo después de un cambio
   * Incluye confirmación del cambio realizado
   */
  async _askForNextFieldWithChange(context, changedLabel, oldValue, newValue) {
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      context.pendingCreate.tableId
    );
    
    // Mensaje de confirmación del cambio
    const changeConfirmation = `✅ Cambié ${changedLabel}: "${oldValue}" → "${newValue}"\n\n`;
    
    // Verificar si ya tenemos todos los campos
    if (context.isComplete()) {
      // Ya está completo, proceder a crear
      return await this._createRecord(context);
    }
    
    // Ordenar por prioridad
    const sortedConfig = fieldsConfig.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    // Encontrar el primer campo faltante
    const nextField = sortedConfig.find(fc => context.missingFields.includes(fc.key));
    
    if (!nextField) {
      // No hay más campos, mostrar resumen y crear
      return await this._createRecord(context);
    }
    
    // Generar pregunta
    const question = this._generateQuestion(nextField, context);
    
    // Construir resumen de progreso
    const progress = this._buildProgressSummary(context.collectedFields, fieldsConfig);
    
    return {
      handled: true,
      response: changeConfirmation + progress + question,
      formatted: true,
    };
  }
  
  /**
   * Genera la pregunta para un campo
   */
  _generateQuestion(fieldConfig, context) {
    // Si tiene mensaje personalizado, usarlo
    if (fieldConfig.askMessage) {
      return this._processTemplate(fieldConfig.askMessage, context);
    }
    
    // Generar pregunta por defecto según el tipo
    const label = fieldConfig.label || fieldConfig.key;
    
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
          return `¿Cuál ${label} prefieres? (${opts})`;
        }
        return `¿Cuál es el ${label}?`;
      default:
        return `¿Cuál es el ${label}?`;
    }
  }
  
  /**
   * Construye resumen del progreso
   */
  _buildProgressSummary(fields, fieldsConfig) {
    // Crear mapa de configuración
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    // Filtrar campos válidos, excluyendo internos y ocultos
    const entries = Object.entries(fields).filter(([key, value]) => {
      // Excluir valores vacíos
      if (value === undefined || value === null || value === '') return false;
      // Excluir campos internos
      if (key.startsWith('_') || key === 'id' || key === 'tableId' || key === 'estado') return false;
      // Excluir campos con hiddenFromChat
      const config = configMap[key] || {};
      if (config.hiddenFromChat) return false;
      return true;
    });
    
    if (entries.length === 0) return '';
    
    // Formatear cada campo
    const lines = entries.map(([key, value]) => {
      const config = configMap[key] || {};
      const emoji = config.emoji || '✓';
      const label = config.confirmLabel || config.label || key;
      
      // Formatear valor según tipo
      let displayValue = value;
      if (config.type === 'time' || key === 'hora') {
        displayValue = this._formatTo12Hour(value);
      }
      
      return `${emoji} ${label}: ${displayValue}`;
    });
    
    return `✅ Tengo registrado:\n${lines.join('\n')}\n\n`;
  }
  
  /**
   * Pide al LLM que genere una respuesta de clarificación
   * cuando no se pudo determinar qué acción realizar
   * @private
   */
  async _askLLMForClarification(context) {
    const tableNames = context.tables?.map(t => t.name).join(', ') || '';
    
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente amigable. El usuario quiere crear o reservar algo, pero no quedó claro exactamente qué.
Contexto del negocio: ${context.agent?.description || 'Asistente de servicios'}
Servicios disponibles: ${tableNames}

Genera una respuesta CORTA y amigable (máximo 2 oraciones) preguntando de forma natural qué desea hacer el usuario.
NO menciones "tabla" ni términos técnicos.
NO uses emojis excesivos.`,
      },
      {
        role: 'user',
        content: context.message,
      },
    ];

    try {
      const response = await this.aiProvider.complete({
        messages,
        maxTokens: 100,
        temperature: 0.7,
      });
      return response.content?.trim() || '¿Podrías indicarme exactamente qué te gustaría hacer?';
    } catch (error) {
      // Fallback si falla el LLM
      return '¿Podrías indicarme exactamente qué te gustaría hacer?';
    }
  }
  
  /**
   * Calcula campos derivados automáticamente (ej: total = precio × cantidad)
   * Busca el precio del producto en la tabla relacionada
   */
  async _calculateDerivedFields(workspaceId, tableId, fields) {
    try {
      const fieldsConfig = await this.tableRepository.getFieldsConfig(workspaceId, tableId);
      const configMap = {};
      fieldsConfig.forEach(fc => { configMap[fc.key] = fc; });
      
      // Si tiene campo cantidad y un campo de relación a productos
      if (fields.cantidad && (fields.producto || fields.product)) {
        const productoValue = fields.producto || fields.product;
        
        // Buscar configuración del campo producto
        const productoConfig = configMap.producto || configMap.product;
        if (productoConfig?.relation) {
          // Buscar la tabla de productos
          const relatedTable = await findTableByName(workspaceId, productoConfig.relation.tableName);
          
          if (relatedTable) {
            // Buscar el producto para obtener su precio
            const searchField = productoConfig.relation.searchField || 'nombre';
            const products = await this.tableDataRepo.query(workspaceId, relatedTable._id, {
              [searchField]: productoValue
            }, { limit: 1 });
            
            if (products.length > 0) {
              const producto = products[0];
              const precio = producto.precio || producto.price || 0;
              const cantidad = Number(fields.cantidad) || 1;
              
              // Calcular total
              fields.total = precio * cantidad;
              console.log(`[CreateHandler] Auto-calculated total: ${precio} × ${cantidad} = ${fields.total}`);
            }
          }
        }
      }
      
      return fields;
    } catch (error) {
      console.error('[CreateHandler] Error calculating derived fields:', error);
      return fields;
    }
  }
  
  /**
   * Crea el registro en la base de datos usando EntityRepository
   */
  async _createRecord(context) {
    const { workspaceId, pendingCreate, collectedFields } = context;
    const { tableId, tableName } = pendingCreate;
    
    try {
      // Ejecutar flows beforeCreate para calcular campos derivados
      const beforeCreateResult = await executeBeforeCreateFlows(workspaceId, tableId, { ...collectedFields });
      
      // Si el flow bloqueó la creación (error de validación en flow)
      if (beforeCreateResult.blocked) {
        const validationInfo = beforeCreateResult.validationInfo || {};
        
        // Si hay un campo específico que causó el error y podemos sugerir un fix
        if (validationInfo.fieldToFix && validationInfo.maxAvailable) {
          // Solo limpiar el campo problemático, no todos
          const fieldToFix = validationInfo.fieldToFix;
          const maxAvailable = validationInfo.maxAvailable;
          
          // Marcar que necesitamos corregir este campo
          context.pendingCreate.needsCorrection = {
            field: fieldToFix,
            maxValue: maxAvailable,
            originalValue: collectedFields[fieldToFix],
          };
          
          // Eliminar solo el campo problemático
          delete context.collectedFields[fieldToFix];
          if (context.pendingCreate.fields) {
            delete context.pendingCreate.fields[fieldToFix];
          }
          context.missingFields = [fieldToFix];
          context.savePendingState();
          
          return {
            handled: true,
            response: `❌ ${beforeCreateResult.error}\n\n📦 Stock disponible: **${maxAvailable}** unidades\n\n¿Cuántas unidades deseas? (máximo ${maxAvailable})`,
          };
        }
        
        // Si el error menciona que algo "no existe", ofrecer opciones disponibles
        const errorMsg = beforeCreateResult.error || 'No se puede crear el registro';
        let enhancedError = `❌ ${errorMsg}`;
        
        // Intentar sugerir opciones del campo que falló
        if (errorMsg.includes('no existe') && context.pendingCreate) {
          const fieldMatch = errorMsg.match(/(?:el|la)\s+(\w+)\s+"([^"]+)"/i);
          if (fieldMatch) {
            const fieldName = fieldMatch[1].toLowerCase(); // e.g. "producto"
            // Buscar el campo de relación correspondiente en los headers de la tabla
            const tableSchema = context.tables?.find(t => (t.id || t._id) === context.pendingCreate.tableId);
            const relationHeader = (tableSchema?.headers || tableSchema?.fields || []).find(h => {
              const hKey = (h.key || h.name || h)?.toString().toLowerCase();
              return hKey === fieldName || hKey?.includes(fieldName);
            });
            // If relationHeader has a targetTable, offer to let user pick
            if (relationHeader && typeof relationHeader === 'object') {
              enhancedError += `\n\n💡 Puedes intentar con otro nombre o preguntarme qué opciones hay disponibles.`;
            }
          }
        }
        
        // Limpiar solo el campo problemático, no todos
        if (context.pendingCreate?.fields) {
          const errorLower = errorMsg.toLowerCase();
          const problemField = Object.keys(context.pendingCreate.fields).find(k => 
            errorLower.includes(k.toLowerCase())
          );
          if (problemField) {
            delete context.collectedFields?.[problemField];
            delete context.pendingCreate.fields[problemField];
            context.missingFields = [problemField];
            context.savePendingState();
            return { handled: true, response: `${enhancedError}\n\n¿Con qué ${problemField} deseas intentar?` };
          }
        }
        
        context.clearCollectedFields();
        context.savePendingState();
        
        return {
          handled: true,
          response: `${enhancedError}\n\n¿Deseas intentar con otros datos?`,
        };
      }
      
      // Fusionar campos originales con campos modificados por el flow (incluye cálculos como total)
      // Los campos del flow tienen prioridad (pueden normalizar nombres, calcular totales, etc.)
      // IMPORTANTE: Filtrar campos que empiezan con _ (pueden venir de datos corruptos guardados antes de un fix)
      const cleanCollectedFields = Object.fromEntries(
        Object.entries(collectedFields).filter(([key]) => !key.startsWith('_'))
      );
      const cleanFlowFields = Object.fromEntries(
        Object.entries(beforeCreateResult.fields || {}).filter(([key]) => !key.startsWith('_'))
      );
      const fieldsWithCalculations = { ...cleanCollectedFields, ...cleanFlowFields };
      
      // Inyectar campos automáticos de origen del chat (metadata invisible al bot)
      // Esto permite saber quién creó cada registro y desde dónde
      // NOTA: Usamos prefijo sin _ porque CouchDB reserva campos con _
      if (context.chatId) {
        fieldsWithCalculations.chatOriginId = context.chatId;
        fieldsWithCalculations.createdVia = 'chat';
        fieldsWithCalculations.createdByBot = true;
      }
      
      // Guardar acciones pendientes para ejecutar después de crear (updates a otras tablas, etc.)
      const pendingActions = beforeCreateResult.pendingActions || [];
      
      console.log('[CreateHandler] Fields after beforeCreate:', {
        original: collectedFields,
        flowModified: beforeCreateResult.fields,
        final: fieldsWithCalculations,
        pendingActionsCount: pendingActions.length,
      });
      
      // Obtener la tabla para verificar su configuración de validación
      const targetTable = context.tables?.find(t => (t.id || t._id) === tableId);
      
      // Validar disponibilidad si la tabla tiene configuración de availability
      const conflictCheck = await this._checkAppointmentConflict(
        workspaceId, 
        tableId, 
        fieldsWithCalculations,
        targetTable
      );
      
      if (conflictCheck.hasConflict) {
        // Limpiar solo el campo de hora para que puedan elegir otro
        const timeFieldKey = conflictCheck.timeFieldKey || 'hora';
        delete context.collectedFields[timeFieldKey];
        if (context.pendingCreate.fields) {
          delete context.pendingCreate.fields[timeFieldKey];
        }
        context.missingFields = [timeFieldKey];
        context.savePendingState();
        
        return {
          handled: true,
          response: conflictCheck.message,
        };
      }
      
      // Usar EntityRepository para crear con validación automática
      const result = await this.entityRepo.create(workspaceId, tableId, fieldsWithCalculations, {
        validate: true,
        normalize: true,
        applyDefaults: true,
      });
      
      if (!result.success) {
        // Hubo errores de validación
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        return {
          handled: true,
          response: `❌ No se pudo crear el registro:\n${errorMessages}`,
        };
      }
      
      const created = result.record;
      
      // Ejecutar acciones pendientes del beforeCreate (updates a otras tablas como descontar stock)
      if (pendingActions.length > 0) {
        try {
          console.log(`[CreateHandler] Executing ${pendingActions.length} pending actions from beforeCreate...`);
          const pendingResult = await executePendingActions(workspaceId, pendingActions, created);
          console.log('[CreateHandler] Pending actions result:', pendingResult);
        } catch (pendingError) {
          console.error('[CreateHandler] Error in pending actions:', pendingError.message);
          // No fallar la creación por errores en acciones secundarias
        }
      }
      
      // Ejecutar flujos afterCreate (triggerType: 'create') para acciones post-creación
      // como descontar stock, crear seguimientos, etc.
      try {
        console.log('[CreateHandler] Executing afterCreate flows...');
        await executeFlowsForTrigger(workspaceId, 'create', tableId, created);
      } catch (flowError) {
        console.error('[CreateHandler] Error in afterCreate flows:', flowError.message);
        // No fallar la creación por errores en flows secundarios
      }
      
      // Emitir evento para notificaciones
      this.eventEmitter.emit(EVENTS.RECORD_CREATED, {
        workspaceId,
        tableId,
        tableName,
        record: created,
        fields: collectedFields,
      });
      
      // Construir respuesta de éxito ANTES de limpiar pendingCreate
      const response = await this._buildSuccessResponse(context, tableName, collectedFields, tableId);
      
      // Limpiar pendingCreate
      context.clearPendingCreate();
      context.savePendingState();
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { created },
      };
      
    } catch (error) {
      console.error('[CreateHandler] Error creating record:', error);
      return {
        handled: true,
        response: `❌ Error al crear el registro: ${error.message}`,
      };
    }
  }
  
  /**
   * Crea el registro para plan básico usando EntityRepository
   */
  async _createRecordBasicPlan(context) {
    const { workspaceId, pendingCreate, collectedFields } = context;
    const { tableId, tableName } = pendingCreate;
    
    try {
      // Validar relaciones ANTES de crear el registro
      const relationResult = await processRelations(workspaceId, tableId, collectedFields);
      
      // Si hay error de opciones (showOptionsOnNotFound)
      if (!relationResult.success && relationResult.optionRequired) {
        return {
          handled: true,
          response: relationResult.message,
        };
      }
      
      // Si hay otros errores de relación
      if (!relationResult.success && relationResult.errors.length > 0) {
        return {
          handled: true,
          response: `❌ ${relationResult.errors.join('\n')}`,
        };
      }
      
      // Preparar datos con campos de plan básico
      // IMPORTANTE: Filtrar campos que empiezan con _ (pueden venir de datos corruptos)
      const cleanFields = Object.fromEntries(
        Object.entries(collectedFields).filter(([key]) => !key.startsWith('_'))
      );
      const dataWithMeta = {
        ...cleanFields,
        estado: 'Pendiente',
        procesadoPor: 'bot',
        requiereRevision: true,
      };
      
      // Inyectar campos automáticos de origen del chat (metadata invisible al bot)
      // NOTA: Usamos prefijo sin _ porque CouchDB reserva campos con _
      if (context.chatId) {
        dataWithMeta.chatOriginId = context.chatId;
        dataWithMeta.createdVia = 'chat';
        dataWithMeta.createdByBot = true;
      }
      
      // Usar EntityRepository
      const result = await this.entityRepo.create(workspaceId, tableId, dataWithMeta, {
        validate: true,
        normalize: true,
        applyDefaults: true,
      });
      
      if (!result.success) {
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        return {
          handled: true,
          response: `❌ No se pudo registrar:\n${errorMessages}`,
        };
      }
      
      const created = result.record;
      
      // Emitir evento para notificaciones (importante para el admin)
      this.eventEmitter.emit(EVENTS.RECORD_CREATED, {
        workspaceId,
        tableId,
        tableName,
        record: created,
        fields: dataWithMeta,
        isBasicPlan: true,
        requiresManualProcessing: true,
      });
      
      // Respuesta para plan básico (ANTES de limpiar pendingCreate)
      const response = await this._buildBasicPlanResponse(context, tableName, collectedFields);
      
      // Limpiar pendingCreate (DESPUÉS de construir la respuesta)
      context.clearPendingCreate();
      context.savePendingState();
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { created, requiresManualProcessing: true },
      };
      
    } catch (error) {
      console.error('[CreateHandler] Error creating record (basic plan):', error);
      return {
        handled: true,
        response: `❌ Error al registrar: ${error.message}`,
      };
    }
  }
  
  /**
   * Construye respuesta específica para plan básico
   */
  async _buildBasicPlanResponse(context, tableName, fields) {
    const agentName = context.agent?.name || 'Asistente';
    
    // Construir resumen de lo registrado
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      context.pendingCreate?.tableId || context.analysis?.tableId
    ) || [];
    
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    let summary = '';
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('_') || ['estado', 'procesadoPor', 'requiereRevision', 'createdAt', 'updatedAt'].includes(key)) {
        continue;
      }
      const config = configMap[key] || {};
      const label = config.label || key;
      let displayValue = value;
      if (config.type === 'time' || key === 'hora') {
        displayValue = this._formatTo12Hour(value);
      }
      summary += `• ${label}: ${displayValue}\n`;
    }
    
    return `📋 **¡Anotado!**

${summary}
📌 Tu solicitud ha sido registrada y será procesada por nuestro equipo.

_Estado: Pendiente de confirmación_`;
  }

  /**
   * Construye la respuesta de éxito dinámicamente
   * @param {object} context - Contexto de la conversación
   * @param {string} tableName - Nombre de la tabla
   * @param {object} fields - Campos del registro creado
   * @param {string} tableId - ID de la tabla (opcional, para cuando pendingCreate ya fue limpiado)
   */
  async _buildSuccessResponse(context, tableName, fields, tableId = null) {
    // Obtener templates del agente
    const templates = context.agent?.responseTemplates || {};
    
    // Si hay template personalizado
    if (templates.createSuccess) {
      return this._processTemplate(templates.createSuccess, {
        tableName,
        ...fields,
        hora: this._formatTo12Hour(fields.hora),
        fechaLegible: this._formatDate(fields.fecha),
      });
    }
    
    // Obtener tableId de donde sea disponible
    const resolvedTableId = tableId || context.pendingCreate?.tableId || context.analysis?.tableId;
    
    if (!resolvedTableId) {
      // Fallback simple si no hay tableId
      return `✅ **¡${tableName} registrado con éxito!**\n\n¡Gracias! 🎉`;
    }
    
    // Construir respuesta dinámica basada en la configuración de la tabla
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      resolvedTableId
    );
    
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    let response = `✅ **¡${tableName} creado con éxito!**\n\n`;
    
    // Campos de metadata que nunca se muestran al usuario
    const HIDDEN_METADATA_FIELDS = ['chatOriginId', 'createdVia', 'createdByBot', 'procesadoPor', 'requiereRevision'];
    
    // Agregar cada campo con su emoji y label
    for (const [key, value] of Object.entries(fields)) {
      // Excluir campos internos, IDs, metadatos y campos de seguimiento
      if (key.startsWith('_') || key === 'id' || key === 'tableId' || key === 'estado' || !value) continue;
      if (HIDDEN_METADATA_FIELDS.includes(key)) continue;
      
      const config = configMap[key] || {};
      
      // Respetar hiddenFromChat - campos sensibles que no se muestran
      if (config.hiddenFromChat) continue;
      
      const emoji = config.emoji || '';
      const label = config.confirmLabel || config.label || key;
      
      let displayValue = value;
      if (config.type === 'time' || key === 'hora') {
        displayValue = this._formatTo12Hour(value);
      } else if (config.type === 'date' || key === 'fecha') {
        displayValue = this._formatDate(value);
      }
      
      response += `${emoji} **${label}:** ${displayValue}\n`;
    }
    
    response += '\n¡Te esperamos! 🎉';
    
    return response;
  }
  
  /**
   * Procesa un template reemplazando variables
   */
  _processTemplate(template, context) {
    if (!template) return '';
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = context[key.trim()];
      return value !== undefined ? value : '';
    });
  }
  
  /**
   * Formatea hora a 12h
   */
  _formatTo12Hour(time24) {
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
  _formatDate(dateStr) {
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
   * Verifica si hay conflicto de citas según la configuración de validación de la tabla
   * @param {string} workspaceId - ID del workspace
   * @param {string} tableId - ID de la tabla
   * @param {object} fields - Campos del registro a crear
   * @param {object} table - Definición de la tabla con su configuración
   */
  async _checkAppointmentConflict(workspaceId, tableId, fields, table) {
    // Verificar si la tabla tiene validación de disponibilidad configurada
    const validation = table?.validation?.availability;
    
    // Si no hay validación configurada, no hacer nada
    if (!validation?.enabled) {
      return { hasConflict: false };
    }
    
    // Obtener campos de fecha y hora según la configuración
    const dateFieldKey = validation.dateField;
    const timeFieldKey = validation.timeField;
    
    if (!dateFieldKey || !timeFieldKey) {
      console.log('[CreateHandler] Availability validation enabled but missing dateField or timeField config');
      return { hasConflict: false };
    }
    
    const fecha = fields[dateFieldKey];
    const hora = fields[timeFieldKey];
    
    // Si no tiene ambos campos recolectados aún, no verificar
    if (!fecha || !hora) {
      return { hasConflict: false };
    }
    
    try {
      // Obtener estados a excluir de la configuración (o usar defaults)
      const excludeStatus = validation.excludeStatuses || ['Cancelada', 'cancelada', 'Cancelado', 'cancelado'];
      
      // Verificar disponibilidad
      const availability = await this.tableDataRepo.checkAvailability(workspaceId, tableId, {
        fecha,
        hora,
        dateField: dateFieldKey,
        timeField: timeFieldKey,
        excludeStatus,
        workingHours: validation.workingHours,
      });
      
      // Si el horario NO está disponible
      if (availability.horaDisponible === false) {
        // Mostrar horarios alternativos cercanos
        const horaNum = parseInt(hora.split(':')[0], 10);
        const cercanos = availability.libres.filter(h => {
          const hNum = parseInt(h.split(':')[0], 10);
          return Math.abs(hNum - horaNum) <= 2; // Dentro de 2 horas
        }).slice(0, 5);
        
        let message = `⚠️ **El horario ${this._formatTo12Hour(hora)} ya está ocupado** para el ${this._formatDate(fecha)}.\n\n`;
        
        if (cercanos.length > 0) {
          message += `🕐 **Horarios disponibles cercanos:**\n`;
          cercanos.forEach(h => {
            message += `• ${this._formatTo12Hour(h)}\n`;
          });
          message += '\n¿A qué hora prefieres?';
        } else if (availability.libres.length > 0) {
          message += `🕐 **Horarios disponibles ese día:**\n`;
          availability.libres.slice(0, 6).forEach(h => {
            message += `• ${this._formatTo12Hour(h)}\n`;
          });
          if (availability.libres.length > 6) {
            message += `... y ${availability.libres.length - 6} más`;
          }
          message += '\n¿A qué hora prefieres?';
        } else {
          message += '😔 No hay horarios disponibles para ese día. ¿Te gustaría elegir otra fecha?';
        }
        
        return {
          hasConflict: true,
          message,
          availableSlots: availability.libres,
          timeFieldKey, // Devolver key para limpiar el campo correcto
        };
      }
      
      return { hasConflict: false };
    } catch (error) {
      console.error('[CreateHandler] Error checking availability:', error.message);
      // Si hay error, permitir la creación (fail-open)
      return { hasConflict: false };
    }
  }
}

export default CreateHandler;
