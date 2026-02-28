/**
 * FallbackHandler - Handler para respuestas con LLM
 * 
 * Se usa cuando ningún otro handler puede manejar el mensaje.
 * Responde usando el modelo de IA configurado en el agente.
 * 
 * IMPORTANTE: Este handler NO ejecuta acciones sobre datos.
 * Solo genera respuestas conversacionales.
 */

import { ActionHandler } from './ActionHandler.js';
import { AgentCapabilities } from '../../services/AgentCapabilities.js';

// Modelo por defecto configurable via environment
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'gpt-4o';

// Patrones para detectar si el usuario pregunta qué puede hacer el bot
const HELP_PATTERNS = [
  /qu[eé]\s+[op]uedes\s+hacer/i,  // "que puedes/ouedes hacer" (con typos)
  /qu[eé]\s+(puedes|sabes|podes)\s+hacer/i,
  /qu[eé]\s+servicios/i,
  /qu[eé]\s+haces/i,
  /para\s+qu[eé]\s+sirves/i,
  /c[oó]mo\s+(me\s+)?puedes\s+ayudar/i,
  /en\s+qu[eé]\s+me\s+ayudas/i,
  /cu[aá]les\s+son\s+tus\s+(funciones|capacidades|servicios)/i,
  /tus\s+(capacidades|funciones|habilidades)/i,
  /\bpuedes\s+hacer\b/i,
  /\bayuda\b/i,
  /\bhelp\b/i,
  /what\s+can\s+you\s+do/i,
  /men[uú]/i,
  /\bopciones\b/i,
];

export class FallbackHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
  }
  
  /**
   * V2: Calcula score de confianza para este handler
   * Fallback siempre tiene score bajo para ser último recurso
   * @param {Context} context 
   * @returns {Promise<number>} Score 0-1
   */
  async confidence(context) {
    const intent = context.intent || {};
    const message = (context.message || '').toLowerCase();
    
    // Si es pregunta de ayuda, score alto
    if (this._isHelpRequest(message)) {
      return 0.85;
    }
    
    // Si no hay acción sobre tablas, score medio-alto
    if (intent.hasTableAction === false) {
      return 0.6;
    }
    
    // Si es saludo, score medio
    const greetingPatterns = /^(hola|buenos?\s*(dias?|tardes?|noches?)|que\s*tal|hi|hello)/i;
    if (greetingPatterns.test(message.trim())) {
      return 0.55;
    }
    
    // Score base bajo (último recurso)
    return 0.25;
  }
  
  /**
   * Siempre puede manejar (es el fallback)
   */
  async canHandle(context) {
    return true;
  }
  
  /**
   * Genera respuesta con el LLM
   */
  async execute(context) {
    const { agent, tablesData, tables, message, history, token, intent } = context;
    
    try {
      // Detectar si pregunta qué puede hacer
      if (this._isHelpRequest(message)) {
        const helpText = AgentCapabilities.generateHelpText(agent, tables || []);
        return {
          handled: true,
          response: helpText,
          formatted: true,
        };
      }
      
      // Construir system prompt dinámico con capacidades
      const systemPrompt = this._buildSystemPrompt(agent, tablesData, tables, intent);
      
      // Construir mensajes
      const messages = [
        { role: 'system', content: systemPrompt },
      ];
      
      // Agregar historial
      if (history?.length > 0) {
        history.slice(-10).forEach(m => {
          messages.push({ role: m.role, content: m.content });
        });
      }
      
      // Agregar mensaje actual
      messages.push({ role: 'user', content: message });
      
      // Llamar al AI Provider
      const response = await this.aiProvider.complete({
        messages,
        model: this._getModel(agent),
        maxTokens: 1024,
        temperature: 0.7,
      });
      
      return {
        handled: true,
        response: response.content || 'No pude generar una respuesta.',
        formatted: true,
      };
      
    } catch (error) {
      console.error('[FallbackHandler] Error:', error);
      return {
        handled: true,
        response: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentarlo de nuevo?',
      };
    }
  }
  
  /**
   * Detecta si el usuario pregunta qué puede hacer el bot
   */
  _isHelpRequest(message) {
    const msg = (message || '').toLowerCase().trim();
    return HELP_PATTERNS.some(pattern => pattern.test(msg));
  }
  
  /**
   * Construye el system prompt dinámicamente
   */
  _buildSystemPrompt(agent, tablesData = [], tables = [], intent = null) {
    const agentName = agent?.name || 'Asistente';
    const agentDesc = agent?.description || '';
    const style = agent?.communicationStyle || {};
    const hasFlows = agent?.hasFlows === true;
    const planFeatures = agent?.planFeatures || {};
    
    // Obtener contexto de capacidades automáticamente
    const capabilitiesContext = AgentCapabilities.generateSystemContext(agent, tables);
    
    // Verificar si el usuario intentó una acción sobre tablas pero no se ejecutó
    const triedTableAction = intent?.hasTableAction && intent?.actionType;

    // Si el agente tiene systemPrompt personalizado
    if (agent?.systemPrompt) {
      let prompt = this._processTemplate(agent.systemPrompt, {
        agentName,
        agentDesc,
        tables: tablesData.map(t => t.tableName).join(', '),
        date: new Date().toLocaleDateString('es-CO'),
      });
      
      // Agregar contexto de capacidades
      prompt += '\n\n' + capabilitiesContext;
      
      // Agregar datos de tablas
      if (tablesData.length > 0) {
        prompt += '\n\nDATOS DISPONIBLES:\n';
        prompt += this._formatTablesData(tablesData);
      }
      
      // IMPORTANTE: Agregar restricción de honestidad
      prompt += `\n\n⚠️ REGLA CRÍTICA DE HONESTIDAD:
- NUNCA digas que registraste, creaste, agendaste o guardaste algo si no tienes confirmación explícita de que se hizo.
- Si el usuario quiere crear algo y NO tienes confirmación, di: "Anotado. Tu solicitud será procesada manualmente."
- Sé HONESTO sobre lo que puedes y no puedes hacer.`;

      if (!hasFlows) {
        prompt += `\n- Eres un agente BÁSICO sin automatizaciones.
- NO puedes crear registros automáticamente.
- Solo puedes consultar información y anotar solicitudes para procesamiento manual.`;
      }
      
      return prompt;
    }
    
    // Prompt por defecto
    let prompt = `Eres "${agentName}", un asistente profesional. ${agentDesc}

ESTILO DE COMUNICACIÓN:
- Respuestas breves y directas (máximo ${style.maxSentences || 3} oraciones)
- ${style.useEmojis !== false ? 'Usa emojis apropiados' : 'No uses emojis'}
- Ve al grano, sin rodeos

`;
    
    // Instrucciones del agente
    const instructions = agent?.instructions || [];
    if (instructions.length > 0) {
      prompt += 'INSTRUCCIONES:\n';
      instructions.forEach((inst, i) => {
        if (typeof inst === 'string') {
          prompt += `${i + 1}. ${inst}\n`;
        } else if (inst?.title) {
          prompt += `${i + 1}. ${inst.title}\n`;
        }
      });
      prompt += '\n';
    }
    
    // Agregar contexto de capacidades (servicios y limitaciones)
    prompt += capabilitiesContext + '\n';
    
    // Datos de tablas
    if (tablesData.length > 0) {
      prompt += 'DATOS DISPONIBLES:\n';
      prompt += this._formatTablesData(tablesData);
    }
    
    prompt += `
REGLAS CRÍTICAS:
- NUNCA menciones que eres IA, ChatGPT u OpenAI
- Actúa siempre como "${agentName}"
- Si no tienes información, dilo brevemente
- Si el usuario pregunta qué puedes hacer, lista tus servicios de forma clara

⚠️ HONESTIDAD OBLIGATORIA:
- NUNCA digas que registraste, creaste, agendaste, guardaste o actualizaste algo.
- Tú SOLO puedes responder preguntas y dar información.
- Si el usuario quiere crear algo, di: "He anotado tu solicitud. El equipo la procesará manualmente."
- Sé HONESTO: no tienes capacidad de modificar datos.`;
    
    return prompt;
  }
  
  /**
   * Formatea datos de tablas para el prompt
   */
  _formatTablesData(tablesData) {
    let result = '';
    
    tablesData.forEach(table => {
      result += `\n${table.tableName} (${table.headers?.join(', ') || ''}):\n`;
      if (!table.data || table.data.length === 0) {
        result += '   (sin registros)\n';
      } else {
        table.data.slice(0, 10).forEach((row, i) => {
          const rowStr = Object.entries(row)
            .filter(([k]) => !k.startsWith('_'))
            .slice(0, 5)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          result += `   ${i + 1}. ${rowStr}\n`;
        });
        if (table.data.length > 10) {
          result += `   ... y ${table.data.length - 10} más\n`;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Obtiene el modelo del agente
   */
  _getModel(agent) {
    const aiModel = agent?.aiModel;
    if (Array.isArray(aiModel) && aiModel.length > 0) {
      const first = aiModel[0];
      return typeof first === 'string' ? first : first?.id || DEFAULT_MODEL;
    }
    return typeof aiModel === 'string' ? aiModel : DEFAULT_MODEL;
  }
  
  _processTemplate(template, context) {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = context[key.trim()];
      return value !== undefined ? value : '';
    });
  }
}

export default FallbackHandler;
