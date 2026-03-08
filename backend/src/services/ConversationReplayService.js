/**
 * ConversationReplayService - Reproducción de conversaciones
 * 
 * Permite reproducir conversaciones paso a paso, ver qué flujos
 * se ejecutaron, qué decisiones tomó la IA, y debugging detallado.
 */

import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import OpenAI from 'openai';

const log = logger.child('ConversationReplayService');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Obtiene el timeline completo de una conversación
 */
export async function getConversationTimeline(workspaceId, chatId) {
  const cacheKey = cache.key('conversation_timeline', workspaceId, chatId);
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const chatsDb = await connectDB(`workspace_${workspaceId}_chats`);
    const chat = await chatsDb.get(chatId);
    
    // Obtener mensajes
    const messagesDb = await connectDB(`workspace_${workspaceId}_messages`);
    const messagesResult = await messagesDb.find({
      selector: { chatId },
      sort: [{ createdAt: 'asc' }]
    });
    
    const messages = messagesResult.docs || [];
    
    // Obtener ejecuciones de flujo relacionadas
    let flowExecutions = [];
    try {
      const executionsDb = await connectDB(`workspace_${workspaceId}_flow_executions`);
      const execResult = await executionsDb.find({
        selector: { 
          'context.chatId': chatId,
          type: 'flow_execution'
        },
        sort: [{ startedAt: 'asc' }]
      });
      flowExecutions = execResult.docs || [];
    } catch {}
    
    // Construir timeline unificado
    const timeline = [];
    
    for (const msg of messages) {
      // Evento de mensaje
      const event = {
        id: msg._id,
        type: 'message',
        timestamp: msg.createdAt,
        direction: msg.role === 'user' ? 'incoming' : 'outgoing',
        content: msg.content,
        metadata: {
          role: msg.role,
          intent: msg.intent,
          entities: msg.entities,
          confidence: msg.confidence
        }
      };
      
      timeline.push(event);
      
      // Si es mensaje del usuario, buscar procesamiento
      if (msg.role === 'user') {
        // Agregar evento de procesamiento
        timeline.push({
          id: `${msg._id}_processing`,
          type: 'processing',
          timestamp: msg.createdAt,
          parentId: msg._id,
          steps: [
            { name: 'Recepción', duration: 10 },
            { name: 'Preprocesamiento', duration: 15 },
            { name: 'Detección de intención', duration: 50 },
            { name: 'Generación de respuesta', duration: 200 }
          ]
        });
      }
      
      // Buscar ejecuciones de flujo cerca de este mensaje
      const nearbyExecutions = flowExecutions.filter(exec => {
        const execTime = new Date(exec.startedAt).getTime();
        const msgTime = new Date(msg.createdAt).getTime();
        return Math.abs(execTime - msgTime) < 5000; // 5 segundos
      });
      
      for (const exec of nearbyExecutions) {
        timeline.push({
          id: exec._id,
          type: 'flow_execution',
          timestamp: exec.startedAt,
          parentMessageId: msg._id,
          flowId: exec.flowId,
          flowName: exec.flowName || 'Sin nombre',
          status: exec.status,
          duration: exec.duration,
          nodesExecuted: exec.executionPath?.length || 0
        });
      }
    }
    
    // Ordenar por timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const result = {
      chatId,
      contactName: chat.contactName || 'Usuario',
      contactPhone: chat.contactPhone,
      startedAt: chat.createdAt,
      lastActivity: chat.lastMessageAt,
      totalMessages: messages.length,
      timeline
    };
    
    cache.set(cacheKey, result, cache.TTL.short);
    return result;
    
  } catch (error) {
    log.error('Error getting conversation timeline', { error: error.message });
    throw error;
  }
}

/**
 * Obtiene detalles de un mensaje específico
 */
export async function getMessageDetails(workspaceId, messageId) {
  try {
    const messagesDb = await connectDB(`workspace_${workspaceId}_messages`);
    const message = await messagesDb.get(messageId);
    
    // Obtener contexto antes y después
    const result = await messagesDb.find({
      selector: { chatId: message.chatId },
      sort: [{ createdAt: 'asc' }]
    });
    
    const messages = result.docs || [];
    const currentIndex = messages.findIndex(m => m._id === messageId);
    
    return {
      message,
      previousMessages: messages.slice(Math.max(0, currentIndex - 3), currentIndex),
      nextMessages: messages.slice(currentIndex + 1, currentIndex + 4),
      context: {
        index: currentIndex + 1,
        total: messages.length
      }
    };
  } catch (error) {
    log.error('Error getting message details', { error: error.message });
    throw error;
  }
}

/**
 * Analiza la conversación con IA
 */
export async function analyzeConversationWithAI(workspaceId, chatId) {
  try {
    const timeline = await getConversationTimeline(workspaceId, chatId);
    
    // Preparar mensajes para análisis
    const conversationText = timeline.timeline
      .filter(e => e.type === 'message')
      .map(m => `${m.direction === 'incoming' ? 'Usuario' : 'Bot'}: ${m.content}`)
      .join('\n');
    
    const prompt = `Analiza esta conversación de soporte/ventas y proporciona:

1. **Resumen**: ¿De qué trató la conversación?
2. **Intención principal**: ¿Qué quería el usuario?
3. **Resultado**: ¿Se resolvió? ¿Quedó satisfecho?
4. **Puntos de fricción**: ¿Hubo momentos de confusión o frustración?
5. **Oportunidades perdidas**: ¿Se podría haber ofrecido algo más?
6. **Sentimiento**: Del 1 al 10, ¿cómo fue la experiencia?
7. **Sugerencias**: ¿Cómo mejorar el flujo?

Conversación:
${conversationText}

Responde en JSON con las claves: resumen, intencion, resultado, puntosDesFriccion, oportunidadesPerdidas, sentimiento, sugerencias`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    return JSON.parse(response.choices[0].message.content);
    
  } catch (error) {
    log.error('Error analyzing conversation', { error: error.message });
    return {
      error: 'No se pudo analizar la conversación',
      resumen: 'Conversación no analizada'
    };
  }
}

/**
 * Simula una respuesta alternativa
 * ¿Qué hubiera pasado si...?
 */
export async function simulateAlternativeResponse(workspaceId, messageId, alternativePrompt) {
  try {
    const details = await getMessageDetails(workspaceId, messageId);
    
    // Construir contexto
    const context = details.previousMessages
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
    
    context.push({
      role: 'user',
      content: details.message.content
    });
    
    // Generar respuesta alternativa
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: alternativePrompt || 'Eres un asistente de atención al cliente. Responde de forma amable y profesional.'
        },
        ...context
      ],
      temperature: 0.7
    });
    
    const alternativeResponse = response.choices[0].message.content;
    
    // Obtener la respuesta real que se dio
    const realResponse = details.nextMessages.find(m => m.role !== 'user')?.content;
    
    return {
      originalMessage: details.message.content,
      realResponse,
      alternativeResponse,
      comparison: await compareResponses(realResponse, alternativeResponse)
    };
    
  } catch (error) {
    log.error('Error simulating response', { error: error.message });
    throw error;
  }
}

/**
 * Compara dos respuestas
 */
async function compareResponses(response1, response2) {
  if (!response1 || !response2) return null;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Compara estas dos respuestas de un bot:

Respuesta A: ${response1}

Respuesta B: ${response2}

¿Cuál es mejor y por qué? Responde en JSON: {mejor: "A" o "B", razon: "...", diferenciasClaves: [...]}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return null;
  }
}

/**
 * Exporta la conversación en diferentes formatos
 */
export async function exportConversation(workspaceId, chatId, format = 'json') {
  const timeline = await getConversationTimeline(workspaceId, chatId);
  
  switch (format) {
    case 'json':
      return JSON.stringify(timeline, null, 2);
      
    case 'markdown':
      return generateMarkdownExport(timeline);
      
    case 'html':
      return generateHtmlExport(timeline);
      
    case 'csv':
      return generateCsvExport(timeline);
      
    default:
      return JSON.stringify(timeline);
  }
}

function generateMarkdownExport(timeline) {
  let md = `# Conversación: ${timeline.contactName}\n\n`;
  md += `**Teléfono:** ${timeline.contactPhone}\n`;
  md += `**Inicio:** ${timeline.startedAt}\n`;
  md += `**Mensajes:** ${timeline.totalMessages}\n\n`;
  md += `---\n\n`;
  
  for (const event of timeline.timeline) {
    if (event.type === 'message') {
      const sender = event.direction === 'incoming' ? '👤 Usuario' : '🤖 Bot';
      md += `### ${sender} - ${new Date(event.timestamp).toLocaleTimeString()}\n\n`;
      md += `${event.content}\n\n`;
    }
  }
  
  return md;
}

function generateHtmlExport(timeline) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Conversación - ${timeline.contactName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .message { margin: 10px 0; padding: 10px; border-radius: 10px; }
    .incoming { background: #e3f2fd; text-align: left; }
    .outgoing { background: #c8e6c9; text-align: right; }
    .time { font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>Conversación con ${timeline.contactName}</h1>
  <p>Teléfono: ${timeline.contactPhone}</p>
`;
  
  for (const event of timeline.timeline) {
    if (event.type === 'message') {
      html += `
  <div class="message ${event.direction}">
    <div class="time">${new Date(event.timestamp).toLocaleString()}</div>
    <div>${event.content}</div>
  </div>`;
    }
  }
  
  html += `\n</body></html>`;
  return html;
}

function generateCsvExport(timeline) {
  let csv = 'timestamp,direction,content\n';
  
  for (const event of timeline.timeline) {
    if (event.type === 'message') {
      const content = event.content.replace(/"/g, '""');
      csv += `"${event.timestamp}","${event.direction}","${content}"\n`;
    }
  }
  
  return csv;
}

/**
 * Busca conversaciones similares
 */
export async function findSimilarConversations(workspaceId, chatId) {
  try {
    const timeline = await getConversationTimeline(workspaceId, chatId);
    
    // Obtener mensajes del usuario
    const userMessages = timeline.timeline
      .filter(e => e.type === 'message' && e.direction === 'incoming')
      .map(e => e.content)
      .join(' ');
    
    // Buscar conversaciones con contenido similar
    const chatsDb = await connectDB(`workspace_${workspaceId}_chats`);
    const result = await chatsDb.find({
      selector: { type: 'chat' },
      limit: 100
    });
    
    const similar = [];
    const currentChat = await chatsDb.get(chatId);
    
    for (const chat of result.docs || []) {
      if (chat._id === chatId) continue;
      
      // Calcular similitud básica por palabras clave
      const messagesDb = await connectDB(`workspace_${workspaceId}_messages`);
      const msgResult = await messagesDb.find({
        selector: { chatId: chat._id, role: 'user' },
        limit: 20
      });
      
      const otherMessages = (msgResult.docs || []).map(m => m.content).join(' ');
      const similarity = calculateTextSimilarity(userMessages, otherMessages);
      
      if (similarity > 0.3) {
        similar.push({
          chatId: chat._id,
          contactName: chat.contactName,
          similarity: Math.round(similarity * 100),
          lastActivity: chat.lastMessageAt
        });
      }
    }
    
    // Ordenar por similitud
    similar.sort((a, b) => b.similarity - a.similarity);
    
    return similar.slice(0, 10);
    
  } catch (error) {
    log.error('Error finding similar conversations', { error: error.message });
    return [];
  }
}

/**
 * Calcula similitud de texto básica (Jaccard)
 */
function calculateTextSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export default {
  getConversationTimeline,
  getMessageDetails,
  analyzeConversationWithAI,
  simulateAlternativeResponse,
  exportConversation,
  findSimilarConversations
};
