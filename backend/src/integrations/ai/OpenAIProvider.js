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

// Modelo por defecto configurable via environment
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'gpt-4o';

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
    if (!userModel) return DEFAULT_MODEL;
    return MODEL_MAP[String(userModel).trim()] || DEFAULT_MODEL;
  }
  
  /**
   * Genera una respuesta de chat
   */
  async complete(options) {
    const { messages, model = DEFAULT_MODEL, maxTokens = 1024, temperature = 0.7 } = options;
    
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
   * V3 LLM-First: Ejecuta Function Calling para determinar la acción
   * El LLM decide qué tool usar basándose en semántica, no keywords
   * @param {object} options - Opciones de la llamada
   * @param {string} options.systemPrompt - System prompt configurado por tenant
   * @param {object[]} options.messages - Historial de mensajes
   * @param {object[]} options.tools - Tools disponibles en formato OpenAI
   * @param {string} options.model - Modelo a usar
   * @returns {Promise<{tool: string|null, arguments: object, response: string|null}>}
   */
  async functionCall(options) {
    const { 
      systemPrompt, 
      messages, 
      tools, 
      model = DEFAULT_MODEL,
      maxTokens = 1024,
      temperature = 0.3,
    } = options;
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Construir mensajes con system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.resolveModel(model),
          messages: fullMessages,
          tools,
          tool_choice: 'required', // FORZAR que siempre use una herramienta
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
      
      const choice = response.data.choices?.[0];
      const message = choice?.message;
      
      // Si el modelo decidió usar una tool
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0]; // Tomamos la primera tool
        return {
          tool: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments || '{}'),
          response: null,
          toolCallId: toolCall.id,
          usage: response.data.usage,
        };
      }
      
      // Si el modelo respondió directamente (sin tool)
      return {
        tool: null,
        arguments: {},
        response: message?.content || '',
        usage: response.data.usage,
      };
      
    } catch (error) {
      console.error('[OpenAIProvider] Function call error:', error.response?.data || error.message);
      throw new Error(`OpenAI Function Call error: ${error.message}`);
    }
  }
  
  /**
   * V3: Clasifica un mensaje como VALID/GARBAGE/SPAM/ABUSE
   * Reemplaza los regex hardcodeados de _isGarbageText
   * @param {string} message - Mensaje a clasificar
   * @param {string} model - Modelo a usar (default: gpt-4o-mini para costo)
   * @param {string[]} tableNames - Nombres de tablas del workspace (para validar consultas)
   * @returns {Promise<{category: string, isValid: boolean}>}
   */
  async classifyMessage(message, model = 'gpt-4o-mini', tableNames = []) {
    // Pre-check: Detectar patrones válidos sin necesidad de LLM
    const msg = String(message).trim();
    const msgLower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // ═══ PRE-CHECK: Si menciona una tabla conocida → VALID ═══
    if (tableNames.length > 0) {
      const tableNamesLower = tableNames.map(t => 
        t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      );
      for (const tableName of tableNamesLower) {
        // Buscar tanto singular como plural
        const singular = tableName.replace(/s$/, '');
        if (msgLower.includes(tableName) || msgLower.includes(singular)) {
          return { category: 'VALID', isValid: true };
        }
      }
    }
    
    // ═══ KEYWORDS MULTIIDIOMA (español, inglés, portugués) ═══
    const validKeywords = [
      // Español
      'que', 'cual', 'cuales', 'cuantos', 'cuantas', 'mostrar', 'dame', 'lista', 
      'buscar', 'ver', 'existen', 'hay', 'tienen', 'quiero', 'necesito', 'agendar',
      'registrar', 'crear', 'nuevo', 'nueva', 'agregar', 'cancelar', 'modificar',
      'hola', 'buenos', 'buenas', 'gracias', 'soy', 'me llamo',
      // Inglés
      'show', 'list', 'find', 'search', 'get', 'want', 'need', 'book', 'schedule',
      'create', 'new', 'add', 'cancel', 'update', 'modify', 'hello', 'hi', 'thanks',
      'please', 'client', 'customer', 'appointment', 'sale', 'product', 'order',
      // Portugués
      'mostrar', 'listar', 'buscar', 'quero', 'preciso', 'agendar', 'criar', 'novo',
      'ola', 'obrigado', 'cliente', 'venda', 'produto',
      // Acciones comunes con typos
      'agndar', 'agnedar', 'registar', 'creat', 'mostrame', 'damelo'
    ];
    
    const hasValidKeyword = validKeywords.some(kw => msgLower.includes(kw));
    if (hasValidKeyword) {
      return { category: 'VALID', isValid: true };
    }
    
    // ═══ MENSAJES LARGOS (>15 chars) CON ESTRUCTURA → VALID ═══
    // Si tiene más de 15 caracteres y palabras coherentes, probablemente es válido
    if (msg.length > 15 && /[a-záéíóúñ]{3,}/i.test(msg)) {
      return { category: 'VALID', isValid: true };
    }
    
    // Emails válidos (cualquier dominio)
    if (/^[\w.-]+@[\w.-]+\.\w{2,}$/i.test(msg)) {
      return { category: 'VALID', isValid: true };
    }
    
    // Números de teléfono (8-15 dígitos, con o sin espacios/guiones)
    const digitsOnly = msg.replace(/[\s\-\(\)\.]/g, '');
    if (/^\d{8,15}$/.test(digitsOnly)) {
      return { category: 'VALID', isValid: true };
    }
    
    // Mensajes cortos que son respuestas comunes
    const shortValidResponses = ['si', 'sí', 'no', 'ok', 'hola', 'gracias', 'cancelar', 'yes', 'hi', 'hey', 'hello', 'thanks'];
    if (shortValidResponses.includes(msg.toLowerCase())) {
      return { category: 'VALID', isValid: true };
    }
    
    // Si contiene @ es probablemente un email
    if (msg.includes('@') && msg.includes('.')) {
      return { category: 'VALID', isValid: true };
    }
    
    // Si tiene emojis, probablemente es válido
    if (/[\u{1F300}-\u{1F9FF}]/u.test(msg)) {
      return { category: 'VALID', isValid: true };
    }
    
    const prompt = `Clasifica el mensaje en UNA categoría:

- VALID: Mensaje coherente en CUALQUIER idioma (español, inglés, portugués, etc.), solicitud, datos, nombres, productos, cantidades, fechas, saludos, preguntas
- GARBAGE: SOLO texto completamente incoherente: caracteres aleatorios (ej: "asdfasdf", "aaaa", "xyzxyz", "!@#$%^")
- SPAM: Publicidad externa no solicitada (ej: "COMPRA VIAGRA", "Gana dinero fácil")
- ABUSE: Insultos, amenazas, contenido ofensivo

IMPORTANTE - Son VALID (NO son SPAM ni GARBAGE):
- Cualquier mensaje en INGLÉS: "show me clients", "I want to book", "list products"
- Cualquier mensaje en PORTUGUÉS: "mostrar clientes", "quero agendar"
- SPANGLISH/mezclado: "quiero make an appointment", "necesito el product"
- Mensajes con TYPOS: "agndar sita", "mostrame los cleintes", "qiero ver"
- Datos de transacciones: "Juan compro 100 productos"
- Nombres con cantidades: "Maria, 50 licencias"
- Mensajes completos: "Hola, soy Luis y quiero registrar una venta"
- Respuestas a formularios con datos
- Emails de CUALQUIER dominio
- Números de teléfono
- Mensajes con emojis: "👋 hola", "quiero info 😊"

Reglas:
1. Si tiene palabras reconocibles en cualquier idioma → VALID
2. Si tiene nombres de personas o datos → VALID
3. Si tiene errores ortográficos pero es entendible → VALID
4. Si tiene emojis → VALID
5. Si parece una solicitud legítima → VALID
6. SOLO marcar GARBAGE si es texto completamente aleatorio sin sentido
7. Si dudas → VALID

Mensaje: "${String(message).slice(0, 200)}"

Responde SOLO la categoría.`;

    try {
      const response = await this.complete({
        messages: [{ role: 'user', content: prompt }],
        model: this.resolveModel(model),
        maxTokens: 10,
        temperature: 0.1,
      });
      
      const category = response.content?.trim().toUpperCase() || 'VALID';
      const validCategories = ['VALID', 'GARBAGE', 'SPAM', 'ABUSE', 'OFF_TOPIC'];
      
      return {
        category: validCategories.includes(category) ? category : 'VALID',
        isValid: category === 'VALID' || category === 'OFF_TOPIC',
      };
      
    } catch (error) {
      console.error('[OpenAIProvider] classifyMessage error:', error);
      // Fail-safe: si hay error, asumimos válido
      return { category: 'VALID', isValid: true };
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
      return typeof first === 'string' ? first : first?.id || DEFAULT_MODEL;
    }
    return typeof aiModel === 'string' ? aiModel : DEFAULT_MODEL;
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
