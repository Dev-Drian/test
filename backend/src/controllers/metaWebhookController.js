/**
 * metaWebhookController.js
 *
 * Webhook unificado para Meta Business Platform:
 *   - WhatsApp Business API
 *   - Instagram Direct
 *   - Facebook Messenger
 *
 * Rutas:
 *   GET  /api/webhooks/meta        → Verificación de webhook (Meta llama esto al registrar)
 *   POST /api/webhooks/meta        → Recibe mensajes entrantes de los 3 canales
 *
 * Env vars requeridas:
 *   META_VERIFY_TOKEN              → String que defines tú, se pone en el dashboard de Meta
 *   META_APP_SECRET                → App Secret del dashboard (para validar firma X-Hub-Signature-256)
 *   META_WHATSAPP_TOKEN            → Token de acceso permanente (Cloud API o BSP)
 *   META_WHATSAPP_PHONE_NUMBER_ID  → Phone Number ID del negocio en Meta
 *   META_PAGE_TOKEN                → Token de página para Messenger
 *   META_INSTAGRAM_TOKEN           → Token de Instagram (mismo que META_PAGE_TOKEN en muchos casos)
 *
 * Docs:
 *   WhatsApp:  https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 *   Instagram: https://developers.facebook.com/docs/messenger-platform/instagram
 *   Messenger: https://developers.facebook.com/docs/messenger-platform/webhooks
 */

import crypto from 'crypto';
import axios from 'axios';
import { ChatService } from '../services/ChatService.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { ChatRepository } from '../repositories/ChatRepository.js';
import { getSocketService } from '../realtime/SocketService.js';
import { EVENTS } from '../core/EventEmitter.js';
import { executeFlowsForTrigger } from '../services/FlowExecutor.js';
import { WorkspaceConfigRepository } from '../config/WorkspaceConfigRepository.js';
import { getWorkspacesDbName } from '../config/db.js';
import logger from '../config/logger.js';

const log = logger.child('MetaWebhook');

// ── Constantes ────────────────────────────────────────────────────────────────
const META_GRAPH_URL  = 'https://graph.facebook.com/v19.0';
const VERIFY_TOKEN    = process.env.META_VERIFY_TOKEN    || '';
const APP_SECRET      = process.env.META_APP_SECRET      || '';
const WA_TOKEN        = process.env.META_WHATSAPP_TOKEN  || '';
const WA_PHONE_ID     = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const PAGE_TOKEN      = process.env.META_PAGE_TOKEN      || '';
const IG_TOKEN        = process.env.META_INSTAGRAM_TOKEN || PAGE_TOKEN;

// Cache de ChatService por workspaceId
const serviceCache = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Valida la firma X-Hub-Signature-256 de Meta.
 * Usa appSecret del workspace o el global de .env como fallback.
 */
function validateSignature(rawBody, headers, appSecret) {
  const secret = appSecret || APP_SECRET;
  if (!secret) {
    log.warn('APP_SECRET no configurado. Aceptando webhook sin validar firma.');
    return true;
  }
  const sig = headers['x-hub-signature-256'] || '';
  if (!sig) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === sig;
}

/**
 * Obtiene o crea un ChatService para el workspace.
 */
async function getService(workspaceId) {
  if (serviceCache.has(workspaceId)) return serviceCache.get(workspaceId);
  const svc = new ChatService();
  svc.on(EVENTS.RECORD_CREATED, async ({ workspaceId: wid, tableId, record }) => {
    if (wid) getSocketService().emitRecordCreated(wid, tableId, record);
    if (wid && tableId && record) await executeFlowsForTrigger(wid, 'create', tableId, record).catch(() => {});
  });
  svc.on(EVENTS.RECORD_UPDATED, async ({ workspaceId: wid, tableId, record }) => {
    if (wid) getSocketService().emitRecordUpdated(wid, tableId, record);
    if (wid && tableId && record) await executeFlowsForTrigger(wid, 'update', tableId, record).catch(() => {});
  });
  serviceCache.set(workspaceId, svc);
  return svc;
}

/**
 * Busca el primer agente activo del workspace como agente de recepción.
 */
async function getDefaultAgentId(workspaceId) {
  try {
    const repo  = new AgentRepository();
    const agents = await repo.getAgentsByWorkspaceId(workspaceId);
    const active = agents.find(a => a.active !== false) || agents[0];
    return active?._id || null;
  } catch {
    return null;
  }
}

/**
 * Busca o crea un chatId para el sender externo dentro de un workspace.
 * Usa el senderId como identificador de conversación persistente.
 */
async function getOrCreateExternalChatId(workspaceId, senderId, platform) {
  try {
    const repo  = new ChatRepository();
    const chats = await repo.listChats(workspaceId);
    const key   = `${platform}:${senderId}`;
    const found = chats.find(c => c.externalRef === key);
    if (found) return found._id;
    // Si no existe, retornar null → ChatService creará uno nuevo y lo devuelve
    return null;
  } catch {
    return null;
  }
}

// ── Enviar respuesta por cada canal ──────────────────────────────────────────

async function replyWhatsApp(toNumber, text, creds = {}) {
  const token = creds.token || WA_TOKEN;
  const phoneId = creds.phoneNumberId || WA_PHONE_ID;
  if (!token || !phoneId) {
    log.warn('[WhatsApp] Token o Phone Number ID no configurados');
    return;
  }
  try {
    await axios.post(
      `${META_GRAPH_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    log.error('[WhatsApp] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

async function replyMessenger(recipientId, text, creds = {}) {
  const token = creds.pageToken || PAGE_TOKEN;
  if (!token) {
    log.warn('[Messenger] Page Token no configurado');
    return;
  }
  try {
    await axios.post(
      `${META_GRAPH_URL}/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: token } }
    );
  } catch (err) {
    log.error('[Messenger] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

async function replyInstagram(recipientId, text, creds = {}) {
  const token = creds.token || IG_TOKEN;
  if (!token) {
    log.warn('[Instagram] Token no configurado');
    return;
  }
  try {
    await axios.post(
      `${META_GRAPH_URL}/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: token } }
    );
  } catch (err) {
    log.error('[Instagram] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

// ── Procesar mensaje con IA ──────────────────────────────────────────────────

/**
 * Rutea el mensaje al agente del workspace y devuelve la respuesta de texto.
 *
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.senderId    - ID externo del usuario (número WA, PSID, IG user ID)
 * @param {string} opts.text        - Mensaje de texto recibido
 * @param {string} opts.platform    - 'whatsapp' | 'messenger' | 'instagram'
 */
async function dispatchToAgent({ workspaceId, senderId, text, platform }) {
  const agentId = await getDefaultAgentId(workspaceId);
  if (!agentId) {
    log.warn('[Meta] No hay agente activo en workspace', { workspaceId });
    return null;
  }

  const chatId = await getOrCreateExternalChatId(workspaceId, senderId, platform);
  const svc    = await getService(workspaceId);

  const result = await svc.processMessage({
    workspaceId,
    chatId,
    agentId,
    message: text,
    userId: `${platform}:${senderId}`,
    metadata: { platform, senderId },
  });

  return result?.response || result?.message || null;
}

// ── Controladores ─────────────────────────────────────────────────────────────

/**
 * GET /api/webhooks/meta
 * Meta llama este endpoint al registrar o actualizar el webhook.
 * Responde el hub.challenge si el verify_token coincide.
 */
export function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    log.info('[Meta] Webhook verificado correctamente');
    return res.status(200).send(challenge);
  }
  log.warn('[Meta] Verificación fallida — token incorrecto o modo inválido', { mode, token });
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * POST /api/webhooks/meta
 * Recibe eventos de WhatsApp, Instagram y Messenger.
 *
 * El workspaceId se resuelve automáticamente buscando qué workspace
 * tiene configurado el pageId / phoneNumberId / igAccountId que envió el mensaje.
 * Fallback: query param ?workspaceId= o META_DEFAULT_WORKSPACE_ID.
 */
export async function receiveEvent(req, res) {
  // Responder 200 de inmediato (Meta reintenta si no responde en 20s)
  res.sendStatus(200);

  const body = req.body;

  // ── Extraer identificador de plataforma del payload ─────────────────────
  let platformMetaId = null;
  if (body.object === 'whatsapp_business_account') {
    // WhatsApp: metadata.phone_number_id identifica el número del negocio
    const firstChange = body.entry?.[0]?.changes?.[0]?.value?.metadata;
    platformMetaId = firstChange?.phone_number_id || null;
  } else if (body.object === 'page') {
    // Messenger: entry[].id es el Page ID
    platformMetaId = body.entry?.[0]?.id || null;
  } else if (body.object === 'instagram') {
    // Instagram: entry[].id es el IG Account ID o Page ID
    platformMetaId = body.entry?.[0]?.id || null;
  }

  // ── Resolver workspaceId ────────────────────────────────────────────────
  const repo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
  let workspaceId = null;

  // 1. Buscar por identificador de plataforma (auto-routing)
  if (platformMetaId) {
    workspaceId = await repo.findWorkspaceByMetaId(platformMetaId);
    if (workspaceId) {
      log.info('[Meta] Workspace resuelto automáticamente', { platformMetaId, workspaceId });
    }
  }

  // 2. Fallback: query param
  if (!workspaceId && req.query.workspaceId) {
    workspaceId = req.query.workspaceId;
  }

  // 3. Fallback: variable de entorno
  if (!workspaceId) {
    workspaceId = process.env.META_DEFAULT_WORKSPACE_ID;
  }

  if (!workspaceId) {
    log.warn('[Meta] No se pudo resolver workspaceId', { platformMetaId, object: body.object });
    return;
  }

  // Leer config per-workspace (tokens, appSecret)
  let metaConfig = {};
  try {
    const wsConfig = await repo.getConfig(workspaceId);
    metaConfig = wsConfig?.integrations?.meta || {};
  } catch (err) {
    log.warn('[Meta] No se pudo leer config del workspace, usando .env', { error: err.message });
  }

  // Validar firma con appSecret del workspace o global
  const rawBody = JSON.stringify(body);
  if (!validateSignature(rawBody, req.headers, metaConfig.appSecret)) {
    log.warn('[Meta] Firma inválida — descartando evento');
    return;
  }

  // Credenciales con fallback a .env
  const waCreds = {
    token: metaConfig.whatsapp?.token || WA_TOKEN,
    phoneNumberId: metaConfig.whatsapp?.phoneNumberId || WA_PHONE_ID,
  };
  const igCreds = { token: metaConfig.instagram?.token || IG_TOKEN };
  const msgCreds = { pageToken: metaConfig.messenger?.pageToken || PAGE_TOKEN };

  try {
    // ────────────── WhatsApp ──────────────────────────────────────────────────
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value    = change.value || {};
          const messages = value.messages || [];
          for (const msg of messages) {
            const from = msg.from;
            let text = '';
            if (msg.type === 'text') {
              text = msg.text?.body || '';
            } else if (msg.type === 'image') {
              text = `[Imagen recibida] ${msg.image?.caption || ''}`;
            } else if (msg.type === 'document') {
              text = `[Documento recibido: ${msg.document?.filename || 'archivo'}]`;
            } else if (msg.type === 'audio') {
              text = '[Audio recibido]';
            } else if (msg.type === 'location') {
              text = `[Ubicación: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
            } else {
              text = `[Mensaje tipo ${msg.type} no soportado]`;
            }
            if (!text) continue;
            log.info('[WhatsApp] Mensaje recibido', { from, type: msg.type, text: text.slice(0, 60) });

            // Notificar al frontend en tiempo real
            getSocketService().toWorkspace(workspaceId, 'meta:message', {
              platform: 'whatsapp',
              senderId: from,
              text: text.slice(0, 200),
              senderName: value.contacts?.[0]?.profile?.name || from,
            });

            const reply = await dispatchToAgent({ workspaceId, senderId: from, text, platform: 'whatsapp' });
            if (reply) await replyWhatsApp(from, reply, waCreds);
          }
        }
      }
      return;
    }

    // ────────────── Instagram Direct ─────────────────────────────────────────
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const msg = change.value;
          if (!msg?.message?.text) continue;
          const from = msg.sender?.id;
          const text = msg.message.text;
          log.info('[Instagram] Mensaje recibido', { from, text: text.slice(0, 60) });

          // Notificar al frontend en tiempo real
          getSocketService().toWorkspace(workspaceId, 'meta:message', {
            platform: 'instagram',
            senderId: from,
            text: text.slice(0, 200),
            senderName: from,
          });

          const reply = await dispatchToAgent({ workspaceId, senderId: from, text, platform: 'instagram' });
          if (reply) await replyInstagram(from, reply, igCreds);
        }
      }
      return;
    }

    // ────────────── Facebook Messenger ───────────────────────────────────────
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (!event.message?.text || event.message?.is_echo) continue;
          const from = event.sender?.id;
          const text = event.message.text;
          log.info('[Messenger] Mensaje recibido', { from, text: text.slice(0, 60) });

          // Notificar al frontend en tiempo real
          getSocketService().toWorkspace(workspaceId, 'meta:message', {
            platform: 'messenger',
            senderId: from,
            text: text.slice(0, 200),
            senderName: from,
          });

          const reply = await dispatchToAgent({ workspaceId, senderId: from, text, platform: 'messenger' });
          if (reply) await replyMessenger(from, reply, msgCreds);
        }
      }
      return;
    }

    log.debug('[Meta] Objeto no reconocido', { object: body.object });
  } catch (err) {
    log.error('[Meta] Error procesando evento', { error: err.message });
  }
}
