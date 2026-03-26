/**
 * metaIntegrationController.js
 *
 * Endpoints dashboard para configurar la integración Meta (WhatsApp/Instagram/Messenger)
 * por workspace. Requieren JWT + workspace member.
 *
 * Incluye flujo Facebook Login OAuth para Messenger e Instagram.
 */

import axios from 'axios';
import crypto from 'crypto';
import { WorkspaceConfigRepository } from '../config/WorkspaceConfigRepository.js';
import { getWorkspacesDbName } from '../config/db.js';
import logger from '../config/logger.js';

const log = logger.child('MetaIntegration');
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const DOMAIN = process.env.PUBLIC_DOMAIN || process.env.DOMAIN || 'https://tudominio.com';
const FRONTEND_URL = process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

function getRepo() {
  return new WorkspaceConfigRepository(() => getWorkspacesDbName());
}

function maskToken(token) {
  if (!token) return null;
  if (token.length <= 8) return '****';
  return '****' + token.slice(-4);
}

// ── GET /api/integrations/meta/config ─────────────────────────────────────────
export async function getMetaConfig(req, res) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = config?.integrations?.meta || {};

    res.json({
      enabled:  meta.enabled || false,
      defaultAgentId: meta.defaultAgentId || null,
      whatsapp: {
        enabled:       meta.whatsapp?.enabled || false,
        phoneNumberId: meta.whatsapp?.phoneNumberId || null,
        businessId:    meta.whatsapp?.businessId || null,
        hasToken:      !!meta.whatsapp?.token,
        tokenPreview:  maskToken(meta.whatsapp?.token),
      },
      instagram: {
        enabled:    meta.instagram?.enabled || false,
        hasToken:   !!meta.instagram?.token,
        username:   meta.instagram?.username || null,
        pageName:   meta.instagram?.pageName || null,
        connectedAt: meta.instagram?.connectedAt || null,
      },
      messenger: {
        enabled:  meta.messenger?.enabled || false,
        pageId:   meta.messenger?.pageId || null,
        pageName: meta.messenger?.pageName || null,
        hasToken: !!meta.messenger?.pageToken,
        connectedAt: meta.messenger?.connectedAt || null,
      },
      hasAppSecret: !!meta.appSecret,
      webhookUrl:   meta.webhookUrl || null,
    });
  } catch (err) {
    log.error('Error obteniendo config Meta', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── PUT /api/integrations/meta/config ─────────────────────────────────────────
export async function updateMetaConfig(req, res) {
  try {
    const { workspaceId, whatsapp, instagram, messenger, appSecret, defaultAgentId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const current = config?.integrations?.meta || {};

    // Merge incremental — solo actualizar campos proporcionados
    const updated = {
      enabled: true,
      defaultAgentId: defaultAgentId !== undefined ? defaultAgentId : (current.defaultAgentId || null),
      whatsapp: {
        ...current.whatsapp,
        ...(whatsapp || {}),
        enabled: !!(whatsapp?.token && whatsapp?.phoneNumberId) || current.whatsapp?.enabled,
      },
      instagram: {
        ...current.instagram,
        ...(instagram || {}),
        enabled: !!(instagram?.token) || current.instagram?.enabled,
      },
      messenger: {
        ...current.messenger,
        ...(messenger || {}),
        enabled: !!(messenger?.pageToken && messenger?.pageId) || current.messenger?.enabled,
      },
      appSecret: appSecret ?? current.appSecret,
      webhookUrl: `${DOMAIN}/api/webhooks/meta`,
    };

    await repo.updateConfig(workspaceId, {
      integrations: {
        ...config.integrations,
        meta: updated,
      },
    });

    log.info('Config Meta actualizada', { workspaceId });
    res.json({ ok: true, webhookUrl: updated.webhookUrl });
  } catch (err) {
    log.error('Error actualizando config Meta', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/integrations/meta/test ──────────────────────────────────────────
export async function testConnection(req, res) {
  try {
    const { workspaceId, channel } = req.body;
    if (!workspaceId || !channel) {
      return res.status(400).json({ error: 'workspaceId y channel requeridos' });
    }

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = config?.integrations?.meta || {};

    if (channel === 'whatsapp') {
      const token = meta.whatsapp?.token;
      const phoneId = meta.whatsapp?.phoneNumberId;
      if (!token || !phoneId) {
        return res.json({ connected: false, error: 'Token o Phone Number ID no configurados' });
      }
      const response = await axios.get(`${META_GRAPH_URL}/${phoneId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return res.json({
        connected: true,
        phoneNumber: response.data.display_phone_number,
        displayName: response.data.verified_name || response.data.display_phone_number,
      });
    }

    if (channel === 'instagram') {
      const token = meta.instagram?.token;
      if (!token) return res.json({ connected: false, error: 'Token de Instagram no configurado' });
      const response = await axios.get(`${META_GRAPH_URL}/me`, {
        params: { access_token: token, fields: 'name,username' },
        timeout: 10000,
      });
      return res.json({
        connected: true,
        name: response.data.name,
        username: response.data.username,
      });
    }

    if (channel === 'messenger') {
      const token = meta.messenger?.pageToken;
      if (!token) return res.json({ connected: false, error: 'Token de Messenger no configurado' });
      const response = await axios.get(`${META_GRAPH_URL}/me`, {
        params: { access_token: token, fields: 'name,id' },
        timeout: 10000,
      });
      return res.json({
        connected: true,
        pageName: response.data.name,
        pageId: response.data.id,
      });
    }

    res.status(400).json({ error: 'Canal no soportado' });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    log.warn('Test conexión Meta falló', { error: errMsg });
    res.json({ connected: false, error: errMsg });
  }
}

// ── POST /api/integrations/meta/disconnect ────────────────────────────────────
export async function disconnectMeta(req, res) {
  try {
    const { workspaceId, channel } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = { ...config?.integrations?.meta };

    if (!channel || channel === 'all') {
      // Desconectar todo
      meta.enabled = false;
      meta.whatsapp = { enabled: false, token: null, phoneNumberId: null, businessId: null, verifyToken: null };
      meta.instagram = { enabled: false, token: null };
      meta.messenger = { enabled: false, pageToken: null, pageId: null };
      meta.appSecret = null;
      meta.webhookUrl = null;
    } else if (channel === 'whatsapp') {
      meta.whatsapp = { enabled: false, token: null, phoneNumberId: null, businessId: null, verifyToken: null };
    } else if (channel === 'instagram') {
      meta.instagram = { enabled: false, token: null };
    } else if (channel === 'messenger') {
      meta.messenger = { enabled: false, pageToken: null, pageId: null };
    }

    // Si no queda ningún canal activo, desactivar meta
    if (!meta.whatsapp?.enabled && !meta.instagram?.enabled && !meta.messenger?.enabled) {
      meta.enabled = false;
    }

    await repo.updateConfig(workspaceId, {
      integrations: { ...config.integrations, meta },
    });

    log.info('Meta desconectado', { workspaceId, channel: channel || 'all' });
    res.json({ ok: true });
  } catch (err) {
    log.error('Error desconectando Meta', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACEBOOK LOGIN OAUTH — Messenger e Instagram
// ══════════════════════════════════════════════════════════════════════════════

const SCOPES_BY_CHANNEL = {
  messenger: 'pages_messaging,pages_show_list,pages_manage_metadata',
  instagram: 'pages_show_list,instagram_basic,instagram_manage_messages',
};

/**
 * GET /api/integrations/meta/auth-url?workspaceId=xxx&channel=messenger|instagram
 * Genera URL de Facebook Login OAuth
 */
export async function getMetaAuthUrl(req, res) {
  try {
    if (!META_APP_ID || !META_APP_SECRET) {
      return res.status(503).json({
        error: 'Facebook OAuth no configurado en el servidor (META_APP_ID / META_APP_SECRET)',
        code: 'META_OAUTH_NOT_CONFIGURED',
      });
    }

    const { workspaceId, channel } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });
    if (!channel || !SCOPES_BY_CHANNEL[channel]) {
      return res.status(400).json({ error: 'channel debe ser "messenger" o "instagram"' });
    }

    const state = Buffer.from(JSON.stringify({
      workspaceId,
      channel,
      userId: req.user.id,
      nonce: crypto.randomBytes(16).toString('hex'),
    })).toString('base64');

    const redirectUri = `${DOMAIN}/api/integrations/meta/callback`;
    const scopes = SCOPES_BY_CHANNEL[channel];

    const authUrl =
      `https://www.facebook.com/v19.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(META_APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code`;

    res.json({ authUrl });
  } catch (err) {
    log.error('Error generando Meta auth URL', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/integrations/meta/callback?code=xxx&state=xxx
 * Facebook redirige aquí tras autorizar. Sin auth middleware.
 */
export async function handleMetaCallback(req, res) {
  try {
    const { code, state, error_reason } = req.query;

    if (error_reason) {
      log.warn('Meta OAuth cancelado o denegado', { error_reason });
      return res.redirect(`${FRONTEND_URL}/integrations?meta_error=${encodeURIComponent(error_reason)}`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/integrations?meta_error=missing_params`);
    }

    // Decodificar state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.redirect(`${FRONTEND_URL}/integrations?meta_error=invalid_state`);
    }

    const { workspaceId, channel } = stateData;
    if (!workspaceId || !channel) {
      return res.redirect(`${FRONTEND_URL}/integrations?meta_error=invalid_state`);
    }

    const redirectUri = `${DOMAIN}/api/integrations/meta/callback`;

    // 1. Intercambiar code por token de corta duración
    const tokenRes = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
      timeout: 15000,
    });
    const shortLivedToken = tokenRes.data.access_token;

    // 2. Intercambiar por token de larga duración (60 días)
    const longRes = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
      timeout: 15000,
    });
    const longLivedToken = longRes.data.access_token;

    // 3. Obtener páginas del usuario
    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}',
      },
      timeout: 15000,
    });
    const pages = pagesRes.data.data || [];

    if (pages.length === 0) {
      log.warn('Meta OAuth: usuario no tiene páginas', { workspaceId, channel });
      return res.redirect(`${FRONTEND_URL}/integrations?meta_error=no_pages`);
    }

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = { ...config?.integrations?.meta, enabled: true };

    if (channel === 'messenger') {
      // Si hay múltiples páginas, guardar token y redirigir al selector
      if (pages.length > 1) {
        meta._oauthUserToken = longLivedToken;
        meta._oauthPages = pages.map(p => ({ id: p.id, name: p.name }));
        await repo.updateConfig(workspaceId, {
          integrations: { ...config.integrations, meta },
        });
        log.info('Múltiples páginas — redirigiendo a selector', { workspaceId, count: pages.length });
        return res.redirect(`${FRONTEND_URL}/integrations?meta=select_page&channel=${channel}`);
      }

      // Una sola página — conectar directamente
      const page = pages[0];
      meta.messenger = {
        enabled: true,
        pageToken: page.access_token,
        pageId: page.id,
        pageName: page.name,
        connectedAt: new Date().toISOString(),
      };

      // Suscribir la página al webhook de mensajes
      try {
        await axios.post(`${META_GRAPH_URL}/${page.id}/subscribed_apps`, null, {
          params: {
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
            access_token: page.access_token,
          },
          timeout: 10000,
        });
        log.info('Página suscrita a webhooks de Messenger', { pageId: page.id });
      } catch (subErr) {
        log.warn('Error suscribiendo página a webhooks', { error: subErr.message });
      }
    }

    if (channel === 'instagram') {
      // Si hay múltiples páginas con IG, guardar token y redirigir al selector
      const pagesWithIG = pages.filter(p => p.instagram_business_account);
      if (pagesWithIG.length === 0) {
        return res.redirect(`${FRONTEND_URL}/integrations?meta_error=no_instagram_account`);
      }
      if (pagesWithIG.length > 1) {
        meta._oauthUserToken = longLivedToken;
        meta._oauthPages = pagesWithIG.map(p => ({ id: p.id, name: p.name, igUsername: p.instagram_business_account?.username }));
        await repo.updateConfig(workspaceId, {
          integrations: { ...config.integrations, meta },
        });
        log.info('Múltiples páginas IG — redirigiendo a selector', { workspaceId, count: pagesWithIG.length });
        return res.redirect(`${FRONTEND_URL}/integrations?meta=select_page&channel=${channel}`);
      }

      // Una sola página con IG — conectar directamente
      const pageWithIG = pagesWithIG[0];

      const igAccount = pageWithIG.instagram_business_account;
      meta.instagram = {
        enabled: true,
        token: pageWithIG.access_token,
        igAccountId: igAccount.id,
        username: igAccount.username || igAccount.name,
        pageName: pageWithIG.name,
        pageId: pageWithIG.id,
        connectedAt: new Date().toISOString(),
      };

      // Suscribir la página a mensajes de Instagram
      try {
        await axios.post(`${META_GRAPH_URL}/${pageWithIG.id}/subscribed_apps`, null, {
          params: {
            subscribed_fields: 'messages',
            access_token: pageWithIG.access_token,
          },
          timeout: 10000,
        });
        log.info('Página suscrita a webhooks de Instagram', { pageId: pageWithIG.id });
      } catch (subErr) {
        log.warn('Error suscribiendo página a webhooks IG', { error: subErr.message });
      }
    }

    // Guardar webhook URL
    meta.webhookUrl = meta.webhookUrl || `${DOMAIN}/api/webhooks/meta`;

    await repo.updateConfig(workspaceId, {
      integrations: { ...config.integrations, meta },
    });

    log.info('Meta OAuth completado', { workspaceId, channel, pages: pages.map((p) => p.name) });
    res.redirect(`${FRONTEND_URL}/integrations?meta=${channel}_connected`);
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    log.error('Error en Meta OAuth callback', { error: errMsg });
    res.redirect(`${FRONTEND_URL}/integrations?meta_error=${encodeURIComponent(errMsg)}`);
  }
}

/**
 * GET /api/integrations/meta/pages?workspaceId=xxx
 * Lista las páginas disponibles (para seleccionar cuál conectar)
 */
export async function listPages(req, res) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId requerido' });

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = config?.integrations?.meta || {};

    // Si hay páginas temporales del OAuth (multi-page flow), devolverlas directamente
    if (meta._oauthPages?.length) {
      return res.json({ pages: meta._oauthPages });
    }

    // Necesitamos un token activo (messenger o instagram)
    const token = meta._oauthUserToken || meta.messenger?.pageToken || meta.instagram?.token;
    if (!token) {
      return res.json({ pages: [] });
    }

    // Re-obtener las páginas con el user token almacenado
    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: token,
        fields: 'id,name,access_token,instagram_business_account{id,name,username}',
      },
      timeout: 10000,
    });

    res.json({ pages: pagesRes.data.data || [] });
  } catch (err) {
    log.error('Error listando páginas Meta', { error: err.message });
    res.status(500).json({ error: 'Error obteniendo páginas' });
  }
}

/**
 * POST /api/integrations/meta/select-page
 * Selecciona una página específica para Messenger o Instagram
 * Body: { workspaceId, channel, pageId }
 */
export async function selectPage(req, res) {
  try {
    const { workspaceId, channel, pageId } = req.body;
    if (!workspaceId || !channel || !pageId) {
      return res.status(400).json({ error: 'workspaceId, channel y pageId requeridos' });
    }

    const repo = getRepo();
    const config = await repo.getConfig(workspaceId);
    const meta = { ...config?.integrations?.meta };

    // Obtener las páginas con el token actual
    const token = meta._oauthUserToken || meta.messenger?.pageToken || meta.instagram?.token;
    if (!token) {
      return res.status(400).json({ error: 'No hay token OAuth activo. Conecta primero vía Facebook Login.' });
    }

    const pagesRes = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: token,
        fields: 'id,name,access_token,instagram_business_account{id,name,username}',
      },
      timeout: 10000,
    });
    const pages = pagesRes.data.data || [];
    const selectedPage = pages.find((p) => p.id === pageId);

    if (!selectedPage) {
      return res.status(404).json({ error: 'Página no encontrada' });
    }

    if (channel === 'messenger') {
      meta.messenger = {
        enabled: true,
        pageToken: selectedPage.access_token,
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        connectedAt: new Date().toISOString(),
      };
      // Suscribir la página al webhook de mensajes
      try {
        await axios.post(`${META_GRAPH_URL}/${selectedPage.id}/subscribed_apps`, null, {
          params: {
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
            access_token: selectedPage.access_token,
          },
          timeout: 10000,
        });
        log.info('Página suscrita a webhooks de Messenger', { pageId: selectedPage.id });
      } catch (subErr) {
        log.warn('Error suscribiendo página a webhooks', { error: subErr.message });
      }
    } else if (channel === 'instagram') {
      if (!selectedPage.instagram_business_account) {
        return res.status(400).json({ error: 'Esta página no tiene cuenta de Instagram Business vinculada' });
      }
      const ig = selectedPage.instagram_business_account;
      meta.instagram = {
        enabled: true,
        token: selectedPage.access_token,
        igAccountId: ig.id,
        username: ig.username || ig.name,
        pageName: selectedPage.name,
        pageId: selectedPage.id,
        connectedAt: new Date().toISOString(),
      };
    }

    // Limpiar datos temporales del OAuth
    delete meta._oauthUserToken;
    delete meta._oauthPages;

    await repo.updateConfig(workspaceId, {
      integrations: { ...config.integrations, meta },
    });

    log.info('Página seleccionada', { workspaceId, channel, pageId, pageName: selectedPage.name });
    res.json({ ok: true, pageName: selectedPage.name });
  } catch (err) {
    log.error('Error seleccionando página', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}
