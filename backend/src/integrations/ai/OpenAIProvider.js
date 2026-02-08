/**
 * OpenAIProvider - Implementación de AIProvider para OpenAI
 * 
 * Maneja todas las interacciones con la API de OpenAI:
 * - Completions de chat
 * - Detección de intenciones
 * - Análisis de mensajes
 */

import axios from 'axios';
import { AIProvider } from './AIProvider.js';

const MODEL_MAP = {
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4o': 'gpt-4o',
  'gpt-4': 'gpt-4',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
  'GPT4O-Mini': 'gpt-4o-mini',
  'GPT-4': 'gpt-4',
};

export class OpenAIProvider extends AIProvider {
  constructor(apiKey = null) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
  }
  
  /**
   * Configura el API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
  
  /**
   * Resuelve el nombre del modelo
   */
  resolveModel(userModel) {
    if (!userModel) return 'gpt-4o-mini';
    return MODEL_MAP[String(userModel).trim()] || 'gpt-4o-mini';
  }
  
  /**
   * Genera una respuesta de chat
   */
  async complete(options) {
    const { messages, model = 'gpt-4o-mini', maxTokens = 1024, temperature = 0.7 } = options;
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.resolveModel(model),
          messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return {
        content: response.data.choices?.[0]?.message?.content || '',
        usage: response.data.usage,
        model: response.data.model,
      };
      
    } catch (error) {
      console.error('[OpenAIProvider] Error:', error.response?.data || error.message);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
  
  /**
   * Detecta la intención de un mensaje
   */
  async detectIntent(message, agent) {
    const model = this.resolveModel(this._getAgentModel(agent));
    
    const prompt = `Eres un clasificador de intenciones sobre datos en tablas. Analiza el mensaje del usuario y devuelve SOLO un JSON válido, sin markdown ni texto extra:

{
  "hasTableAction": true o false,
  "actionType": "query" | "create" | "update" | "delete" | "search" | "analyze" | "availability" | null,
  "confidence": 0-100
}

Reglas:
- query: consultar datos, ver citas, listar registros
- create: crear registro, agregar, nuevo, añadir, registrar, AGENDAR CITA
- update: actualizar, cambiar, modificar
- delete: eliminar, borrar
- search: buscar algo específico
- analyze: análisis, total, promedio, estadísticas
- availability: preguntar por disponibilidad, horarios libres

REGLAS ESPECIALES:
1. DISPONIBILIDAD: "¿hay disponibilidad?", "¿hay citas disponibles?", "¿está libre?" → actionType = "availability"
2. AGENDAR CITA: "quiero agendar", "reservar cita", "hacer una cita" → actionType = "create"
3. CANCELAR: "cancelar mi cita", "anular reserva" → actionType = "update"

Si NO es acción sobre tablas (saludo, pregunta general), hasTableAction = false.

Mensaje: "${String(message).slice(0, 500)}"`;

    try {
      const response = await this.complete({
        messages: [{ role: 'user', content: prompt }],
        model,
        maxTokens: 150,
        temperature: 0.2,
      });
      
      const cleaned = response.content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error('[OpenAIProvider] detectIntent error:', error);
      return { hasTableAction: false, actionType: null, confidence: 0 };
    }
  }
  
  /**
   * Analiza un mensaje para extraer datos estructurados
   */
  async analyzeMessage(message, tablesInfo, actionType, dateContext = {}, agent = null) {
    const model = this.resolveModel(this._getAgentModel(agent));
    const today = dateContext.today || this._getTodayInColombia();
    const tomorrow = this._calculateTomorrow(today);
    
    const prompt = `Eres un analizador que extrae datos de mensajes de usuario para operaciones en tablas.

CONTEXTO TEMPORAL:
- Fecha de HOY: ${today}
- Fecha de MAÑANA: ${tomorrow}

TABLAS DISPONIBLES:
${JSON.stringify(tablesInfo, null, 2)}

MENSAJE DEL USUARIO:
"${String(message).slice(0, 500)}"

TIPO DE ACCIÓN: "${actionType}"

REGLAS:
1. Elige la tabla cuyo "name" encaje mejor con la intención.
2. EXTRAE SOLO los datos que el usuario haya mencionado EXPLÍCITAMENTE en su mensaje.
3. CONVIERTE fechas relativas SOLO si el usuario las menciona: "hoy"="${today}", "mañana"="${tomorrow}"
4. CONVIERTE horas a formato HH:MM (24h) SOLO si el usuario las menciona: "las 2"="14:00", "las 9 de la mañana"="09:00"
5. En "create.missingFields" pon SOLO los campos de "fields" que NO hayan sido proporcionados.
6. NUNCA inventes datos que el usuario NO dijo. Si dice "quiero agendar" sin más detalles, "fields" debe estar vacío.
7. Si el usuario NO menciona fecha, NO pongas fecha en fields.
8. Si el usuario NO menciona hora, NO pongas hora en fields.

Formato de salida (SOLO JSON válido):
{
  "actionType": "${actionType}",
  "tableId": "id de la tabla",
  "tableName": "nombre de la tabla",
  "query": { "filters": {}, "limit": 10 },
  "create": { "isComplete": false, "missingFields": [], "fields": {} },
  "update": { "searchCriteria": {}, "fieldsToUpdate": {} }
}`;

    try {
      const response = await this.complete({
        messages: [{ role: 'user', content: prompt }],
        model,
        maxTokens: 600,
        temperature: 0.3,
      });
      
      const cleaned = response.content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error('[OpenAIProvider] analyzeMessage error:', error);
      return null;
    }
  }
  
  /**
   * Analiza disponibilidad específicamente
   */
  async analyzeAvailability(message, tablesInfo, dateContext = {}, agent = null) {
    const model = this.resolveModel(this._getAgentModel(agent));
    const today = dateContext.today || this._getTodayInColombia();
    const tomorrow = this._calculateTomorrow(today);
    
    const citasTable = tablesInfo.find(t => 
      t.name?.toLowerCase().includes('cita') || t.type === 'appointments'
    );
    
    const prompt = `Extrae parámetros de búsqueda de disponibilidad.

FECHA DE HOY: ${today}
FECHA DE MAÑANA: ${tomorrow}

MENSAJE: "${String(message).slice(0, 400)}"

CONVIERTE fechas relativas. Si no dice fecha, usa mañana.

Devuelve SOLO JSON:
{
  "fecha": "YYYY-MM-DD",
  "servicio": "nombre o null",
  "horaPreferida": "HH:MM o null"
}`;

    try {
      const response = await this.complete({
        messages: [{ role: 'user', content: prompt }],
        model,
        maxTokens: 200,
        temperature: 0.2,
      });
      
      const cleaned = response.content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      const params = JSON.parse(cleaned);
      
      return {
        ...params,
        citasTableId: citasTable?._id,
      };
      
    } catch (error) {
      console.error('[OpenAIProvider] analyzeAvailability error:', error);
      return null;
    }
  }
  
  /**
   * Genera un título para un chat
   */
  async generateChatTitle(userMessage, assistantResponse) {
    const prompt = `Genera un título CORTO (máximo 5 palabras) para esta conversación.

Usuario: "${userMessage}"
Asistente: "${String(assistantResponse).substring(0, 200)}"

REGLAS:
- Máximo 5 palabras
- Sin comillas ni puntuación final
- Conciso y descriptivo
- En español

Responde SOLO con el título.`;

    try {
      const response = await this.complete({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        maxTokens: 20,
        temperature: 0.3,
      });
      
      let title = response.content?.trim() || null;
      if (title) {
        title = title.replace(/^["']|["']$/g, '').trim();
      }
      return title;
      
    } catch (error) {
      console.error('[OpenAIProvider] generateChatTitle error:', error);
      return null;
    }
  }
  
  /**
   * Verifica la conexión
   */
  async healthCheck() {
    try {
      await this.complete({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
  
  _getAgentModel(agent) {
    const aiModel = agent?.aiModel;
    if (Array.isArray(aiModel) && aiModel.length > 0) {
      const first = aiModel[0];
      return typeof first === 'string' ? first : first?.id || 'gpt-4o-mini';
    }
    return typeof aiModel === 'string' ? aiModel : 'gpt-4o-mini';
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
}

// Singleton con factory
let instance = null;

export function getOpenAIProvider(apiKey = null) {
  if (!instance) {
    instance = new OpenAIProvider(apiKey);
  } else if (apiKey) {
    instance.setApiKey(apiKey);
  }
  return instance;
}

export default OpenAIProvider;
