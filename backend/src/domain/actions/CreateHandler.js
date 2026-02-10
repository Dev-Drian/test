/**
 * CreateHandler - Handler para crear registros
 * 
 * Maneja el flujo completo de creación:
 * - Iniciar borrador (pendingCreate)
 * - Recolectar campos faltantes
 * - Crear el registro cuando está completo
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';
import { EntityRepository } from '../../repositories/EntityRepository.js';
import { processRelations } from '../../services/relationHandler.js';

export class CreateHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
    this.entityRepo = new EntityRepository();
  }
  
  /**
   * Verifica si puede manejar una acción de tipo CREATE
   */
  async canHandle(context) {
    // Si hay pendingCreate activo, este handler lo maneja
    if (context.pendingCreate) {
      return true;
    }
    
    // Si la intención detectada es create
    if (context.intent?.actionType === 'create') {
      // Verificar si el agente tiene permiso para crear
      const canCreate = context.agent?.planFeatures?.canCreate !== false;
      return canCreate;
    }
    
    return false;
  }
  
  /**
   * Ejecuta el flujo de creación
   */
  async execute(context) {
    const { workspaceId } = context;
    const hasFlows = context.agent?.hasFlows === true;
    
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
    
    // Si se acaba de inicializar el pendingCreate, NO correr FieldCollector.
    // El mensaje que inicia ("quiero agendar una cita") es un INTENT, no datos.
    // Ir directo a preguntar el primer campo.
    if (isNewPendingCreate) {
      return await this._askForNextField(context);
    }
    
    // 2b. Si hay pendingCreate y faltan campos, usar FieldCollector para extraer del mensaje
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
          
          if (extracted.newIntent === 'cancel') {
            context.clearPendingCreate();
            context.savePendingState();
            return {
              handled: true,
              response: 'Operación cancelada. ¿En qué más puedo ayudarte?',
            };
          }
          
          // Para query, availability, thanks → dejar que otro handler lo maneje
          // Devolver handled: false para que el Engine pase al siguiente handler
          return { handled: false };
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
        }
      } catch (error) {
        console.error('[CreateHandler] Error extracting fields:', error);
      }
    }
    
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
      return {
        handled: true,
        response: 'No pude determinar en qué tabla crear el registro. ¿Puedes ser más específico?',
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
    
    this.eventEmitter.emit(EVENTS.CREATE_STARTED, {
      workspaceId: context.workspaceId,
      tableId,
      tableName,
    });
  }
  
  /**
   * Genera pregunta para el siguiente campo faltante
   */
  async _askForNextField(context) {
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      context.pendingCreate.tableId
    );
    
    // Ordenar por prioridad
    const sortedConfig = fieldsConfig.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    // Encontrar el primer campo faltante
    const nextField = sortedConfig.find(fc => context.missingFields.includes(fc.key));
    
    if (!nextField) {
      // No debería pasar, pero por si acaso
      return {
        handled: true,
        response: '¿Hay algo más que necesites proporcionar?',
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
    const entries = Object.entries(fields).filter(([k, v]) => 
      v !== undefined && v !== null && v !== '' && k !== 'estado'
    );
    
    if (entries.length === 0) return '';
    
    // Crear mapa de configuración
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
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
   * Crea el registro en la base de datos usando EntityRepository
   */
  async _createRecord(context) {
    const { workspaceId, pendingCreate, collectedFields } = context;
    const { tableId, tableName } = pendingCreate;
    
    try {
      // Usar EntityRepository para crear con validación automática
      const result = await this.entityRepo.create(workspaceId, tableId, collectedFields, {
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
      
      // Emitir evento para notificaciones
      this.eventEmitter.emit(EVENTS.RECORD_CREATED, {
        workspaceId,
        tableId,
        tableName,
        record: created,
        fields: collectedFields,
      });
      
      // Limpiar pendingCreate
      context.clearPendingCreate();
      context.savePendingState();
      
      // Construir respuesta de éxito
      const response = await this._buildSuccessResponse(context, tableName, collectedFields);
      
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
      const dataWithMeta = {
        ...collectedFields,
        estado: 'Pendiente',
        procesadoPor: 'bot',
        requiereRevision: true,
      };
      
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
   */
  async _buildSuccessResponse(context, tableName, fields) {
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
    
    // Construir respuesta dinámica basada en la configuración de la tabla
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      context.pendingCreate?.tableId || context.analysis?.tableId
    );
    
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    let response = `✅ **¡${tableName} creado con éxito!**\n\n`;
    
    // Agregar cada campo con su emoji y label
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'estado' || !value) continue;
      
      const config = configMap[key] || {};
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
}

export default CreateHandler;
