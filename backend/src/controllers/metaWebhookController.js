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
import { enqueueMetaMessage, isRedisAvailable } from '../queues/index.js';
import logger from '../config/logger.js';
import { splitMessageForPlatform } from '../utils/messageUtils.js';
import {
  ingestWhatsAppMediaToWorkspace,
  ingestUrlToWorkspace,
  hintMimeForAttachmentType,
} from '../services/channelMediaIngest.js';

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

// Cache de perfiles de usuario (para no consultar en cada mensaje)
const profileCache = new Map();

function filenameFromAttachmentUrl(u) {
  try {
    const pathname = new URL(u).pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    return base ? decodeURIComponent(base) : 'archivo';
  } catch {
    return 'archivo';
  }
}

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
async function getDefaultAgentId(workspaceId, metaConfig = {}) {
  try {
    const repo  = new AgentRepository();

    // 1. Usar agente configurado en Meta config
    if (metaConfig.defaultAgentId) {
      const agent = await repo.findById(metaConfig.defaultAgentId, workspaceId);
      if (agent && agent.active !== false) {
        log.info('[Meta] Usando agente configurado', { agentId: agent._id, name: agent.name });
        return agent._id;
      }
      log.warn('[Meta] Agente configurado no encontrado o inactivo, buscando otro', { defaultAgentId: metaConfig.defaultAgentId });
    }

    // 2. Fallback: primer agente activo
    const agents = await repo.findAll(workspaceId);
    const active = agents.find(a => a.active !== false) || agents[0];
    return active?._id || null;
  } catch (err) {
    log.error('[Meta] Error buscando agente', { workspaceId, error: err.message });
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
    const key   = `${platform}:${senderId}`;
    const chats = await repo.find({ externalRef: key }, {}, workspaceId);
    if (chats.length > 0) return chats[0]._id;
    return null;
  } catch {
    return null;
  }
}

/**
 * Obtiene el perfil del usuario (nombre, foto) desde la Graph API de Meta.
 * Solo aplica para Messenger e Instagram (WhatsApp ya lo trae en el webhook).
 *
 * @param {string} userId - PSID (Messenger) o IG-scoped user ID
 * @param {string} platform - 'messenger' | 'instagram'
 * @param {string} token - Page token o IG token
 * @returns {Promise<{name: string, profilePic: string|null}>}
 */
async function fetchSenderProfile(userId, platform, token) {
  const cacheKey = `${platform}:${userId}`;
  if (profileCache.has(cacheKey)) return profileCache.get(cacheKey);

  const fallback = { name: userId, profilePic: null };
  if (!token) return fallback;

  try {
    const fields = platform === 'instagram'
      ? 'name,username,profile_pic'
      : 'first_name,last_name,profile_pic';
    const { data } = await axios.get(`${META_GRAPH_URL}/${userId}`, {
      params: { fields, access_token: token },
      timeout: 5000,
    });

    let name;
    if (platform === 'instagram') {
      name = data.name || data.username || userId;
    } else {
      name = [data.first_name, data.last_name].filter(Boolean).join(' ') || userId;
    }
    const profile = { name, profilePic: data.profile_pic || null };
    profileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    log.warn(`[${platform}] No se pudo obtener perfil del usuario`, { userId, error: err.message });
    return fallback;
  }
}

/**
 * Obtiene las credenciales de Meta para un workspace/agent.
 * Útil para enviar mensajes proactivos (ej: notificación de pago confirmado).
 * 
 * @param {string} workspaceId
 * @param {string} agentId - (opcional) para futuro soporte de credenciales por agente
 * @returns {Promise<object>} { whatsappToken, phoneNumberId, pageAccessToken, instagramToken }
 */
export async function getMetaCredentials(workspaceId, agentId = null) {
  const repo = WorkspaceConfigRepository.getInstance();
  let metaConfig = {};
  
  try {
    const wsConfig = await repo.getConfig(workspaceId);
    metaConfig = wsConfig?.integrations?.meta || {};
  } catch (err) {
    log.warn('[Meta] No se pudo leer config del workspace', { workspaceId, error: err.message });
  }
  
  return {
    whatsappToken: metaConfig.whatsapp?.token || WA_TOKEN,
    phoneNumberId: metaConfig.whatsapp?.phoneNumberId || WA_PHONE_ID,
    pageAccessToken: metaConfig.messenger?.pageToken || PAGE_TOKEN,
    instagramToken: metaConfig.instagram?.token || IG_TOKEN,
  };
}

// ── Enviar respuesta por cada canal (exportados para uso desde chatController) ──

export async function replyWhatsApp(toNumber, text, creds = {}) {
  const token = creds.token || WA_TOKEN;
  const phoneId = creds.phoneNumberId || WA_PHONE_ID;
  if (!token || !phoneId) {
    log.warn('[WhatsApp] Token o Phone Number ID no configurados');
    return;
  }
  try {
    // Dividir mensaje si es muy largo
    const messageParts = splitMessageForPlatform(text, 'whatsapp');
    
    for (const part of messageParts) {
      await axios.post(
        `${META_GRAPH_URL}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: part },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      // Pausa entre mensajes para evitar rate limiting
      if (messageParts.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (err) {
    log.error('[WhatsApp] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

export async function replyMessenger(recipientId, text, creds = {}) {
  const token = creds.pageToken || PAGE_TOKEN;
  if (!token) {
    log.warn('[Messenger] Page Token no configurado');
    return;
  }
  try {
    // Dividir mensaje si es muy largo (Messenger: 2000 chars)
    const messageParts = splitMessageForPlatform(text, 'messenger');
    
    for (const part of messageParts) {
      await axios.post(
        `${META_GRAPH_URL}/me/messages`,
        { recipient: { id: recipientId }, message: { text: part } },
        { params: { access_token: token } }
      );
      if (messageParts.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (err) {
    log.error('[Messenger] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

export async function replyInstagram(recipientId, text, creds = {}) {
  const token = creds.token || IG_TOKEN;
  if (!token) {
    log.warn('[Instagram] Token no configurado');
    return;
  }
  try {
    // Dividir mensaje si es muy largo (Instagram: 1000 chars)
    const messageParts = splitMessageForPlatform(text, 'instagram');
    
    for (const part of messageParts) {
      await axios.post(
        `${META_GRAPH_URL}/me/messages`,
        { recipient: { id: recipientId }, message: { text: part } },
        { params: { access_token: token } }
      );
      if (messageParts.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (err) {
    log.error('[Instagram] Error enviando mensaje', { error: err.response?.data || err.message });
  }
}

/**
 * WhatsApp Cloud API: envía imagen por URL pública HTTPS (Meta descarga el archivo).
 * Requiere APP_PUBLIC_URL + PUBLIC_WORKSPACE_UPLOADS_READ (o CDN) para URLs propias.
 */
export async function replyWhatsAppImageByLink(toNumber, imageUrl, creds = {}, caption = '') {
  const token = creds.token || WA_TOKEN;
  const phoneId = creds.phoneNumberId || WA_PHONE_ID;
  const u = String(imageUrl || '').trim();
  if (!token || !phoneId || !/^https:\/\//i.test(u)) {
    log.warn('[WhatsApp] Imagen omitida: falta token/phoneId o URL no es https', { hasUrl: !!u });
    return;
  }
  try {
    const cap = String(caption || '').slice(0, 1024);
    const imagePayload = cap ? { link: u, caption: cap } : { link: u };
    await axios.post(
      `${META_GRAPH_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'image',
        image: imagePayload,
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    log.error('[WhatsApp] Error enviando imagen por link', { error: err.response?.data || err.message });
  }
}

async function sendMetaMessagingImageAttachment(recipientId, imageUrl, accessToken) {
  const u = String(imageUrl || '').trim();
  if (!accessToken || !/^https:\/\//i.test(u)) return;
  await axios.post(
    `${META_GRAPH_URL}/me/messages`,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: { url: u, is_reusable: true },
        },
      },
    },
    { params: { access_token: accessToken } }
  );
}

/** Messenger: imagen por URL pública. */
export async function replyMessengerImageByLink(recipientId, imageUrl, creds = {}) {
  const token = creds.pageToken || PAGE_TOKEN;
  if (!token) {
    log.warn('[Messenger] Page Token no configurado (imagen)');
    return;
  }
  try {
    await sendMetaMessagingImageAttachment(recipientId, imageUrl, token);
  } catch (err) {
    log.error('[Messenger] Error enviando imagen', { error: err.response?.data || err.message });
  }
}

/** Instagram Direct: imagen por URL pública (misma API Send que Messenger). */
export async function replyInstagramImageByLink(recipientId, imageUrl, creds = {}) {
  const token = creds.token || IG_TOKEN;
  if (!token) {
    log.warn('[Instagram] Token no configurado (imagen)');
    return;
  }
  try {
    await sendMetaMessagingImageAttachment(recipientId, imageUrl, token);
  } catch (err) {
    log.error('[Instagram] Error enviando imagen', { error: err.response?.data || err.message });
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
async function dispatchToAgent({ workspaceId, senderId, senderName, text, platform, metaConfig }) {
  const agentId = await getDefaultAgentId(workspaceId, metaConfig);
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
    metadata: {
      platform,
      senderId,
      senderName: senderName || senderId,
      externalRef: `${platform}:${senderId}`,
    },
  });

  const responseText = result?.response || result?.message || null;
  const finalChatId = result?.chatId || chatId;

  // Emitir mensajes al socket para actualización en tiempo real
  const socketSvc = getSocketService();
  
  // Emitir mensaje del usuario
  socketSvc.emitNewMessage(workspaceId, finalChatId, {
    id: `user_${Date.now()}`,
    role: 'user',
    content: text,
    senderName: senderName || senderId,
    platform,
    ts: Date.now(),
  });

  // Emitir respuesta del asistente (si hay)
  if (responseText) {
    socketSvc.emitNewMessage(workspaceId, finalChatId, {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: responseText,
      ts: Date.now(),
    });
  }

  return {
    response: responseText,
    chatId: finalChatId,
    agentId,
  };
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
  
  // Log de entrada para debug
  log.info('[Meta] ═══════════════════════════════════════════════════════════');
  log.info('[Meta] Webhook recibido', { 
    object: body.object, 
    entriesCount: body.entry?.length || 0,
    params: req.params,
    query: req.query,
    forwardedBy: req.headers['x-forwarded-by'] || 'direct'
  });

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

  // 2. Fallback: parámetro de ruta /webhooks/meta/:workspaceId
  if (!workspaceId && req.params.workspaceId) {
    workspaceId = req.params.workspaceId;
    log.info('[Meta] Usando workspaceId de params', { workspaceId });
  }

  // 3. Fallback: query param ?workspaceId=xxx
  if (!workspaceId && req.query.workspaceId) {
    workspaceId = req.query.workspaceId;
  }

  // 4. Fallback: variable de entorno
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
            let incomingFile = null;

            if (msg.type === 'text') {
              text = msg.text?.body || '';
            } else if (msg.type === 'image') {
              text = `[Imagen recibida] ${msg.image?.caption || ''}`.trim();
              const mediaId = msg.image?.id;
              if (mediaId && waCreds.token) {
                incomingFile = await ingestWhatsAppMediaToWorkspace({
                  workspaceId,
                  mediaId,
                  accessToken: waCreds.token,
                  originalFilename: 'imagen.jpg',
                });
              }
            } else if (msg.type === 'document') {
              const fn = msg.document?.filename || 'documento';
              text = `[Documento recibido: ${fn}]`;
              const mediaId = msg.document?.id;
              if (mediaId && waCreds.token) {
                incomingFile = await ingestWhatsAppMediaToWorkspace({
                  workspaceId,
                  mediaId,
                  accessToken: waCreds.token,
                  originalFilename: fn,
                });
              }
            } else if (msg.type === 'sticker') {
              text = '[Sticker recibido]';
              const mediaId = msg.sticker?.id;
              if (mediaId && waCreds.token) {
                incomingFile = await ingestWhatsAppMediaToWorkspace({
                  workspaceId,
                  mediaId,
                  accessToken: waCreds.token,
                  originalFilename: 'sticker.webp',
                });
              }
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
            const waName = value.contacts?.[0]?.profile?.name || from;
            getSocketService().toWorkspace(workspaceId, 'meta:message', {
              platform: 'whatsapp',
              senderId: from,
              text: text.slice(0, 200),
              senderName: waName,
            });

            // Encolar para procesamiento asíncrono (o procesar directo si no hay Redis)
            const agentId = await getDefaultAgentId(workspaceId, metaConfig);
            await enqueueMetaMessage({
              workspaceId,
              platform: 'whatsapp',
              senderId: from,
              senderName: waName,
              text,
              agentId,
              credentials: waCreds,
              incomingFile: incomingFile || undefined,
              externalMessageId: msg.id || undefined,
            });
          }
        }
      }
      return;
    }

    // ────────────── Instagram Direct ─────────────────────────────────────────
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (event.message?.is_echo) continue;
          const m = event.message;
          if (!m) continue;
          const atts = m.attachments || [];
          const hasText = !!(m.text && String(m.text).trim());
          if (!hasText && !atts.length) continue;

          let text = m.text || '';
          let incomingFile = null;
          for (const att of atts) {
            const url = att.payload?.url;
            if (!url) continue;
            const hint = hintMimeForAttachmentType(att.type);
            incomingFile = await ingestUrlToWorkspace({
              workspaceId,
              url,
              originalFilename: filenameFromAttachmentUrl(url),
              hintMime: hint,
            });
            if (incomingFile) break;
          }
          if (!text.trim() && incomingFile) {
            text = `[Archivo recibido: ${incomingFile.filename}]`;
          }
          if (!text.trim()) {
            if (atts.length) text = '[Adjunto recibido; no se pudo guardar en el servidor]';
            else continue;
          }

          const from = event.sender?.id;
          log.info('[Instagram] Mensaje recibido', { from, text: text.slice(0, 60) });

          const igProfile = await fetchSenderProfile(from, 'instagram', igCreds.token);

          getSocketService().toWorkspace(workspaceId, 'meta:message', {
            platform: 'instagram',
            senderId: from,
            text: text.slice(0, 200),
            senderName: igProfile.name,
            profilePic: igProfile.profilePic,
          });

          const agentId = await getDefaultAgentId(workspaceId, metaConfig);
          await enqueueMetaMessage({
            workspaceId,
            platform: 'instagram',
            senderId: from,
            senderName: igProfile.name,
            text,
            agentId,
            credentials: igCreds,
            incomingFile: incomingFile || undefined,
            externalMessageId: m.mid || undefined,
          });
        }

        for (const change of entry.changes || []) {
          const msg = change.value;
          const inner = msg?.message;
          if (!inner && !msg?.sender?.id) continue;

          const atts = inner?.attachments || [];
          const hasText = !!(inner?.text && String(inner.text).trim());
          if (!hasText && !atts.length) continue;

          let text = inner?.text || '';
          let incomingFile = null;
          for (const att of atts) {
            const url = att.payload?.url;
            if (!url) continue;
            const hint = hintMimeForAttachmentType(att.type);
            incomingFile = await ingestUrlToWorkspace({
              workspaceId,
              url,
              originalFilename: filenameFromAttachmentUrl(url),
              hintMime: hint,
            });
            if (incomingFile) break;
          }
          if (!text.trim() && incomingFile) {
            text = `[Archivo recibido: ${incomingFile.filename}]`;
          }
          if (!text.trim()) {
            if (atts.length) text = '[Adjunto recibido; no se pudo guardar en el servidor]';
            else continue;
          }

          const from = msg.sender?.id;
          log.info('[Instagram] Mensaje recibido (changes)', { from, text: text.slice(0, 60) });

          const igProfile = await fetchSenderProfile(from, 'instagram', igCreds.token);

          getSocketService().toWorkspace(workspaceId, 'meta:message', {
            platform: 'instagram',
            senderId: from,
            text: text.slice(0, 200),
            senderName: igProfile.name,
            profilePic: igProfile.profilePic,
          });

          const agentId = await getDefaultAgentId(workspaceId, metaConfig);
          await enqueueMetaMessage({
            workspaceId,
            platform: 'instagram',
            senderId: from,
            senderName: igProfile.name,
            text,
            agentId,
            credentials: igCreds,
            incomingFile: incomingFile || undefined,
            externalMessageId: inner?.mid || undefined,
          });
        }
      }
      return;
    }

    // ────────────── Facebook Messenger ───────────────────────────────────────
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (event.message?.is_echo) continue;
          const m = event.message;
          if (!m) continue;
          const atts = m.attachments || [];
          const hasText = !!(m.text && String(m.text).trim());
          if (!hasText && !atts.length) continue;

          let text = m.text || '';
          let incomingFile = null;
          for (const att of atts) {
            const url = att.payload?.url;
            if (!url) continue;
            const hint = hintMimeForAttachmentType(att.type);
            incomingFile = await ingestUrlToWorkspace({
              workspaceId,
              url,
              originalFilename: filenameFromAttachmentUrl(url),
              hintMime: hint,
            });
            if (incomingFile) break;
          }
          if (!text.trim() && incomingFile) {
            text = `[Archivo recibido: ${incomingFile.filename}]`;
          }
          if (!text.trim()) {
            if (atts.length) text = '[Adjunto recibido; no se pudo guardar en el servidor]';
            else continue;
          }

          const from = event.sender?.id;
          log.info('[Messenger] Mensaje recibido', { from, text: text.slice(0, 60) });

          const msgProfile = await fetchSenderProfile(from, 'messenger', msgCreds.pageToken);

          getSocketService().toWorkspace(workspaceId, 'meta:message', {
            platform: 'messenger',
            senderId: from,
            text: text.slice(0, 200),
            senderName: msgProfile.name,
            profilePic: msgProfile.profilePic,
          });

          const agentId = await getDefaultAgentId(workspaceId, metaConfig);
          await enqueueMetaMessage({
            workspaceId,
            platform: 'messenger',
            senderId: from,
            senderName: msgProfile.name,
            text,
            agentId,
            credentials: msgCreds,
            incomingFile: incomingFile || undefined,
            externalMessageId: m.mid || undefined,
          });
        }
      }
      return;
    }

    log.debug('[Meta] Objeto no reconocido', { object: body.object });
  } catch (err) {
    log.error('[Meta] Error procesando evento', { error: err.message });
  }
}
