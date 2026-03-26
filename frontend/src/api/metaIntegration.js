import { api } from './client';

export const getMetaConfig = (workspaceId) =>
  api.get('/integrations/meta/config', { params: { workspaceId } });

export const updateMetaConfig = (data) =>
  api.put('/integrations/meta/config', data);

export const testMetaConnection = (workspaceId, channel) =>
  api.post('/integrations/meta/test', { workspaceId, channel });

export const disconnectMeta = (workspaceId, channel) =>
  api.post('/integrations/meta/disconnect', { workspaceId, channel });

// ── OAuth (Facebook Login) ──────────────────────────────────────────────────
export const getMetaAuthUrl = (workspaceId, channel) =>
  api.get('/integrations/meta/auth-url', { params: { workspaceId, channel } });

export const getMetaPages = (workspaceId) =>
  api.get('/integrations/meta/pages', { params: { workspaceId } });

export const selectMetaPage = (workspaceId, channel, pageId) =>
  api.post('/integrations/meta/select-page', { workspaceId, channel, pageId });
