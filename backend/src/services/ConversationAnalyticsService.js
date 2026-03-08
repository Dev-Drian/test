/**
 * ConversationAnalyticsService - Analytics de conversaciones con IA
 * 
 * Analiza:
 * - Intenciones más frecuentes
 * - Dónde abandonan los usuarios
 * - Sentimiento de conversaciones
 * - Sugerencias de mejora automáticas
 */

import OpenAI from 'openai';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';

const log = logger.child('ConversationAnalytics');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Obtiene estadísticas generales de conversaciones
 */
export async function getConversationStats(workspaceId, options = {}) {
  const cacheKey = cache.key('conv_stats', workspaceId, options.period || '7d');
  
  const cached = cache.get(cacheKey);
  if (cached && !options.skipCache) return cached;
  
  try {
    const dbName = `workspace_${workspaceId}_chats`;
    const db = await connectDB(dbName);
    
    // Calcular fecha de inicio según período
    const now = new Date();
    const periodDays = parseInt(options.period) || 7;
    const startDate = new Date(now - periodDays * 24 * 60 * 60 * 1000).toISOString();
    
    // Obtener todas las conversaciones del período
    const result = await db.find({
      selector: {
        createdAt: { $gte: startDate }
      },
      limit: 1000
    });
    
    const chats = result.docs || [];
    
    // Calcular estadísticas
    const stats = {
      totalConversations: chats.length,
      totalMessages: 0,
      avgMessagesPerChat: 0,
      avgResponseTime: 0,
      completionRate: 0,
      topIntents: [],
      topQuestions: [],
      sentimentScore: 0,
      peakHours: [],
      abandonmentPoints: [],
      period: options.period || '7d',
      generatedAt: new Date().toISOString()
    };
    
    // Contar mensajes y analizar
    let totalUserMessages = 0;
    let completedChats = 0;
    const hourCounts = new Array(24).fill(0);
    const intentCounts = {};
    const questionCounts = {};
    
    for (const chat of chats) {
      const messages = chat.messages || [];
      stats.totalMessages += messages.length;
      
      const userMessages = messages.filter(m => m.role === 'user');
      totalUserMessages += userMessages.length;
      
      // Completado si tiene más de 3 mensajes
      if (messages.length >= 3) completedChats++;
      
      // Hora del día
      if (chat.createdAt) {
        const hour = new Date(chat.createdAt).getHours();
        hourCounts[hour]++;
      }
      
      // Analizar mensajes de usuario
      for (const msg of userMessages) {
        const text = (msg.content || '').toLowerCase();
        
        // Detectar intenciones simples
        if (text.includes('precio') || text.includes('costo') || text.includes('cuánto')) {
          intentCounts['consulta_precio'] = (intentCounts['consulta_precio'] || 0) + 1;
        }
        if (text.includes('horario') || text.includes('hora') || text.includes('abierto')) {
          intentCounts['consulta_horario'] = (intentCounts['consulta_horario'] || 0) + 1;
        }
        if (text.includes('cita') || text.includes('agendar') || text.includes('reservar')) {
          intentCounts['agendar_cita'] = (intentCounts['agendar_cita'] || 0) + 1;
        }
        if (text.includes('cancelar') || text.includes('anular')) {
          intentCounts['cancelar'] = (intentCounts['cancelar'] || 0) + 1;
        }
        if (text.includes('información') || text.includes('info') || text.includes('saber')) {
          intentCounts['info_general'] = (intentCounts['info_general'] || 0) + 1;
        }
        
        // Detectar preguntas
        if (text.endsWith('?') || text.startsWith('qué') || text.startsWith('cómo') || 
            text.startsWith('cuándo') || text.startsWith('dónde') || text.startsWith('cuál')) {
          // Normalizar pregunta
          const shortQuestion = text.substring(0, 50);
          questionCounts[shortQuestion] = (questionCounts[shortQuestion] || 0) + 1;
        }
      }
    }
    
    // Calcular promedios
    stats.avgMessagesPerChat = chats.length > 0 ? 
      Math.round(stats.totalMessages / chats.length * 10) / 10 : 0;
    
    stats.completionRate = chats.length > 0 ? 
      Math.round(completedChats / chats.length * 100) : 0;
    
    // Top intenciones
    stats.topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: Math.round(count / totalUserMessages * 100)
      }));
    
    // Top preguntas
    stats.topQuestions = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));
    
    // Horas pico
    stats.peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    cache.set(cacheKey, stats, cache.TTL.medium);
    return stats;
    
  } catch (error) {
    log.error('Error getting conversation stats', { error: error.message });
    return {
      totalConversations: 0,
      totalMessages: 0,
      error: error.message
    };
  }
}

/**
 * Analiza conversaciones con IA para insights más profundos
 */
export async function analyzeConversationsWithAI(workspaceId, options = {}) {
  log.info('Starting AI conversation analysis', { workspaceId });
  
  try {
    // Obtener muestra de conversaciones recientes
    const dbName = `workspace_${workspaceId}_chats`;
    const db = await connectDB(dbName);
    
    const result = await db.find({
      selector: {},
      sort: [{ createdAt: 'desc' }],
      limit: options.sampleSize || 50
    });
    
    const chats = result.docs || [];
    
    if (chats.length === 0) {
      return {
        success: false,
        message: 'No hay conversaciones para analizar'
      };
    }
    
    // Preparar resumen de conversaciones para la IA
    const conversationSummaries = chats.slice(0, 20).map(chat => {
      const messages = (chat.messages || []).slice(0, 10);
      return messages.map(m => `${m.role}: ${(m.content || '').substring(0, 200)}`).join('\n');
    }).join('\n---\n');
    
    const analysisPrompt = `Analiza estas conversaciones de un chatbot de atención al cliente y proporciona insights:

CONVERSACIONES:
${conversationSummaries}

Responde en JSON con este formato:
{
  "mainTopics": ["tema1", "tema2"],
  "commonProblems": ["problema1", "problema2"],
  "missedOpportunities": ["oportunidad1"],
  "sentimentAnalysis": {
    "positive": 40,
    "neutral": 45,
    "negative": 15
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "Título corto",
      "description": "Descripción de la recomendación",
      "impact": "Impacto esperado"
    }
  ],
  "userFrustrationPoints": ["punto1"],
  "botPerformanceScore": 75,
  "summary": "Resumen ejecutivo en 2-3 oraciones"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'Eres un experto en análisis de conversaciones y experiencia del cliente. Analiza conversaciones de chatbots y proporciona insights accionables.' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);
    
    // Guardar análisis
    const analyticsDb = await connectDB(`workspace_${workspaceId}_analytics`);
    await analyticsDb.insert({
      _id: `analysis_${Date.now()}`,
      type: 'conversation_analysis',
      ...analysis,
      conversationsAnalyzed: chats.length,
      generatedAt: new Date().toISOString()
    });
    
    log.info('AI analysis completed', { workspaceId, score: analysis.botPerformanceScore });
    
    return {
      success: true,
      ...analysis,
      conversationsAnalyzed: chats.length
    };
    
  } catch (error) {
    log.error('Error in AI analysis', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene métricas en tiempo real
 */
export async function getRealTimeMetrics(workspaceId) {
  const cacheKey = cache.key('realtime_metrics', workspaceId);
  
  // Cache muy corto para métricas en tiempo real
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const dbName = `workspace_${workspaceId}_chats`;
    const db = await connectDB(dbName);
    
    // Conversaciones de las últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const [last24h, lastHourResult] = await Promise.all([
      db.find({
        selector: { createdAt: { $gte: yesterday } },
        limit: 500
      }),
      db.find({
        selector: { createdAt: { $gte: lastHour } },
        limit: 100
      })
    ]);
    
    const metrics = {
      last24h: {
        conversations: last24h.docs?.length || 0,
        messages: (last24h.docs || []).reduce((sum, c) => sum + (c.messages?.length || 0), 0)
      },
      lastHour: {
        conversations: lastHourResult.docs?.length || 0,
        messages: (lastHourResult.docs || []).reduce((sum, c) => sum + (c.messages?.length || 0), 0)
      },
      trend: 'stable', // TODO: calcular tendencia real
      updatedAt: new Date().toISOString()
    };
    
    cache.set(cacheKey, metrics, 60); // 1 minuto de cache
    return metrics;
    
  } catch (error) {
    log.error('Error getting realtime metrics', { error: error.message });
    return {
      last24h: { conversations: 0, messages: 0 },
      lastHour: { conversations: 0, messages: 0 }
    };
  }
}

/**
 * Genera reporte de analytics para exportar
 */
export async function generateAnalyticsReport(workspaceId, period = '30d') {
  const stats = await getConversationStats(workspaceId, { period });
  const aiAnalysis = await analyzeConversationsWithAI(workspaceId, { sampleSize: 100 });
  const realtime = await getRealTimeMetrics(workspaceId);
  
  return {
    period,
    generatedAt: new Date().toISOString(),
    workspaceId,
    overview: stats,
    aiInsights: aiAnalysis,
    realtime,
    exportFormat: 'json'
  };
}

export default {
  getConversationStats,
  analyzeConversationsWithAI,
  getRealTimeMetrics,
  generateAnalyticsReport
};
