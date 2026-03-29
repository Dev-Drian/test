/**
 * widgetController.js
 *
 * Endpoints para el widget embebible de chat.
 *
 * Públicos (auth por token de widget):
 *   GET  /api/widget/:token/config            → Config del widget (theme, agentName)
 *   POST /api/widget/:token/session           → Crear/recuperar sesión de visitante
 *   POST /api/widget/:token/message           → Enviar mensaje al agente
 *   GET  /api/widget/:token/history/:visitorId → Historial de conversación
 *
 * Protegidos (requieren JWT — dashboard):
 *   POST /api/integrations/widget/enable      → Activar widget y generar token
 *   POST /api/integrations/widget/disable     → Desactivar widget
 *   GET  /api/integrations/widget/settings    → Obtener config actual
 *   PUT  /api/integrations/widget/theme       → Actualizar tema visual
 */

import { v4 as uuidv4 } from 'uuid';
import { getChatService } from '../services/ChatServiceFactory.js';
import { ChatRepository } from '../repositories/ChatRepository.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { WorkspaceConfigRepository } from '../config/WorkspaceConfigRepository.js';
import { getSocketService } from '../realtime/SocketService.js';
import { getWorkspacesDbName } from '../config/db.js';
import logger from '../config/logger.js';

const log = logger.child('Widget');

// ── Token cache (token → workspace info) con TTL ─────────────────────────────
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 min

// ── Rate limiter en memoria ──────────────────────────────────────────────────
const rateLimits = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 min

function checkRateLimit(visitorId) {
  const now = Date.now();
  const entry = rateLimits.get(visitorId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(visitorId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Limpiar entries viejos cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimits) {
    if (now > val.resetAt) rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

// ── Resolver token → workspace info ──────────────────────────────────────────

async function resolveToken(token) {
  // Check cache
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  // Buscar en todas las configs de workspace
  // Usamos una vista o iteramos — para MVP iteramos configs
  const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
  const all = await configRepo.find({ type: 'workspace_config' });

  for (const cfg of all) {
    if (cfg.integrations?.widget?.enabled && cfg.integrations?.widget?.token === token) {
      const data = {
        workspaceId: cfg.workspaceId,
        agentId: cfg.integrations.widget.agentId,
        theme: cfg.integrations.widget.theme || {},
      };
      tokenCache.set(token, { data, expiresAt: Date.now() + TOKEN_CACHE_TTL });
      return data;
    }
  }

  return null;
}

function invalidateTokenCache(token) {
  if (token) tokenCache.delete(token);
}

// ── Endpoints públicos (auth por widget token) ──────────────────────────────

/**
 * GET /api/widget/:token/config
 */
export async function getConfig(req, res) {
  try {
    const resolved = await resolveToken(req.params.token);
    if (!resolved) return res.status(404).json({ error: 'Widget no encontrado' });

    // Obtener nombre del agente
    let agentName = 'Asistente';
    try {
      const agentRepo = new AgentRepository();
      const agent = await agentRepo.findById(resolved.agentId, resolved.workspaceId);
      if (agent) agentName = agent.name || agentName;
    } catch {}

    res.json({
      agentName,
      theme: resolved.theme,
    });
  } catch (err) {
    log.error('Error en getConfig', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * POST /api/widget/:token/session
 * Body: { visitorId }
 */
export async function createSession(req, res) {
  try {
    const resolved = await resolveToken(req.params.token);
    if (!resolved) return res.status(404).json({ error: 'Widget no encontrado' });

    const { visitorId } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'visitorId requerido' });

    const chatRepo = new ChatRepository();
    const externalRef = `widget:${visitorId}`;

    // Buscar chat existente
    const chats = await chatRepo.find({ externalRef }, {}, resolved.workspaceId);
    if (chats.length > 0) {
      return res.json({ chatId: chats[0]._id, visitorId, isNew: false });
    }

    // Crear nuevo chat
    const chat = await chatRepo.create({
      agentId: resolved.agentId,
      title: `Widget - ${visitorId.slice(0, 8)}`,
      externalRef,
    }, resolved.workspaceId);

    res.json({ chatId: chat._id, visitorId, isNew: true });
  } catch (err) {
    log.error('Error en createSession', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * POST /api/widget/:token/message
 * Body: { visitorId, chatId, message }
 */
export async function sendMessage(req, res) {
  try {
    const resolved = await resolveToken(req.params.token);
    if (!resolved) return res.status(404).json({ error: 'Widget no encontrado' });

    const { visitorId, chatId, message } = req.body;
    if (!visitorId || !message?.trim()) {
      return res.status(400).json({ error: 'visitorId y message requeridos' });
    }

    // Rate limit
    if (!checkRateLimit(visitorId)) {
      return res.status(429).json({ error: 'Demasiados mensajes. Intenta en un minuto.' });
    }

    const svc = getChatService(resolved.workspaceId);
    const result = await svc.processMessage({
      workspaceId: resolved.workspaceId,
      chatId: chatId || null,
      agentId: resolved.agentId,
      message: message.trim(),
      userId: `widget:${visitorId}`,
      metadata: { platform: 'widget', visitorId },
    });

    // Emitir por Socket: al visitante y al dashboard
    const responsePayload = {
      role: 'assistant',
      content: result?.response || '',
      timestamp: new Date().toISOString(),
    };
    getSocketService().toVisitor(visitorId, 'chat:message', responsePayload);

    // También notificar al dashboard del workspace
    if (result?.chatId) {
      getSocketService().emitNewMessage(resolved.workspaceId, result.chatId, responsePayload);
    }

    res.json({
      response: result?.response || '',
      chatId: result?.chatId || chatId,
    });
  } catch (err) {
    log.error('Error en sendMessage', { error: err.message });
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
}

/**
 * GET /api/widget/:token/history/:visitorId
 */
export async function getHistory(req, res) {
  try {
    const resolved = await resolveToken(req.params.token);
    if (!resolved) return res.status(404).json({ error: 'Widget no encontrado' });

    const { visitorId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const chatRepo = new ChatRepository();
    const externalRef = `widget:${visitorId}`;
    const chats = await chatRepo.find({ externalRef }, {}, resolved.workspaceId);

    if (chats.length === 0) return res.json({ messages: [] });

    const chat = chats[0];
    const messages = (chat.messages || []).slice(-limit).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    res.json({ messages });
  } catch (err) {
    log.error('Error en getHistory', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── Endpoints protegidos (requieren JWT — dashboard) ─────────────────────────

/**
 * POST /api/integrations/widget/enable
 * Body: { workspaceId, agentId }
 */
export async function enableWidget(req, res) {
  try {
    const { workspaceId, agentId } = req.body;
    if (!workspaceId || !agentId) {
      return res.status(400).json({ error: 'workspaceId y agentId requeridos' });
    }

    const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
    const config = await configRepo.getConfig(workspaceId);

    const token = uuidv4();
    const widgetConfig = {
      ...config.integrations?.widget,
      enabled: true,
      token,
      agentId,
    };

    await configRepo.updateConfig(workspaceId, {
      integrations: {
        ...config.integrations,
        widget: widgetConfig,
      },
    });

    // Invalidar cache
    invalidateTokenCache(config.integrations?.widget?.token);

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const embedSnippet = `<script src="${appUrl}/widget.js" data-token="${token}"></script>`;

    log.info('Widget activado', { workspaceId, agentId });
    res.json({ token, embedSnippet });
  } catch (err) {
    log.error('Error en enableWidget', { error: err.message });
    res.status(500).json({ error: 'Error activando widget' });
  }
}

/**
 * POST /api/integrations/widget/disable
 * Body: { workspaceId }
 */
export async function disableWidget(req, res) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
    const config = await configRepo.getConfig(workspaceId);

    // Invalidar cache del token anterior
    invalidateTokenCache(config.integrations?.widget?.token);

    await configRepo.updateConfig(workspaceId, {
      integrations: {
        ...config.integrations,
        widget: {
          ...config.integrations?.widget,
          enabled: false,
          token: null,
        },
      },
    });

    log.info('Widget desactivado', { workspaceId });
    res.json({ ok: true });
  } catch (err) {
    log.error('Error en disableWidget', { error: err.message });
    res.status(500).json({ error: 'Error desactivando widget' });
  }
}

/**
 * GET /api/integrations/widget/settings?workspaceId=xxx
 */
export async function getWidgetSettings(req, res) {
  try {
    const workspaceId = req.query.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
    const config = await configRepo.getConfig(workspaceId);
    const widget = config.integrations?.widget || {};

    res.json({
      enabled: widget.enabled || false,
      token: widget.token || null,
      agentId: widget.agentId || null,
      theme: widget.theme || {},
    });
  } catch (err) {
    log.error('Error en getWidgetSettings', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * PUT /api/integrations/widget/theme
 * Body: { workspaceId, theme: { primaryColor, position, title, subtitle, avatarUrl } }
 */
export async function updateWidgetTheme(req, res) {
  try {
    const { workspaceId, theme } = req.body;
    if (!workspaceId || !theme) return res.status(400).json({ error: 'workspaceId y theme requeridos' });

    const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
    const config = await configRepo.getConfig(workspaceId);

    // Solo permitir campos conocidos del theme
    const safeTheme = {
      primaryColor: theme.primaryColor || '#4F46E5',
      position: ['bottom-right', 'bottom-left'].includes(theme.position) ? theme.position : 'bottom-right',
      title: (theme.title || '').slice(0, 100),
      subtitle: (theme.subtitle || '').slice(0, 200),
      avatarUrl: theme.avatarUrl || null,
    };

    await configRepo.updateConfig(workspaceId, {
      integrations: {
        ...config.integrations,
        widget: {
          ...config.integrations?.widget,
          theme: safeTheme,
        },
      },
    });

    // Invalidar token cache para que los widgets vean el cambio
    invalidateTokenCache(config.integrations?.widget?.token);

    res.json({ ok: true, theme: safeTheme });
  } catch (err) {
    log.error('Error en updateWidgetTheme', { error: err.message });
    res.status(500).json({ error: 'Error actualizando tema' });
  }
}
