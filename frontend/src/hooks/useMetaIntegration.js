import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  getMetaConfig,
  updateMetaConfig,
  testMetaConnection,
  disconnectMeta,
  getMetaAuthUrl,
  getMetaPages,
  selectMetaPage,
} from '../api/metaIntegration';

export function useMetaIntegration() {
  const { workspaceId } = useWorkspace();

  const [config, setConfig] = useState({
    loading: true,
    enabled: false,
    whatsapp: {},
    instagram: {},
    messenger: {},
    webhookUrl: null,
  });
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setConfig((prev) => ({ ...prev, loading: true }));
      const res = await getMetaConfig(workspaceId);
      setConfig({ loading: false, ...(res.data || res) });
      setError(null);
    } catch (err) {
      setConfig((prev) => ({ ...prev, loading: false }));
      if (err.response?.status !== 503) {
        setError(err.response?.data?.error || err.message);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(
    async (data) => {
      try {
        const res = await updateMetaConfig({ workspaceId, ...data });
        await fetchConfig();
        setError(null);
        return res.data || res;
      } catch (err) {
        setError(err.response?.data?.error || 'Error al guardar configuración');
        throw err;
      }
    },
    [workspaceId, fetchConfig]
  );

  const testConnection = useCallback(
    async (channel) => {
      try {
        const res = await testMetaConnection(workspaceId, channel);
        return res.data || res;
      } catch (err) {
        setError(err.response?.data?.error || 'Error al probar conexión');
        throw err;
      }
    },
    [workspaceId]
  );

  const disconnect = useCallback(
    async (channel) => {
      try {
        await disconnectMeta(workspaceId, channel);
        await fetchConfig();
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al desconectar');
        throw err;
      }
    },
    [workspaceId, fetchConfig]
  );

  // ── OAuth: Facebook Login ──────────────────────────────────────
  const connectChannel = useCallback(
    async (channel) => {
      try {
        setError(null);
        const res = await getMetaAuthUrl(workspaceId, channel);
        const authUrl = res.data?.authUrl || res.authUrl;
        if (authUrl) {
          window.location.href = authUrl;
        } else {
          setError('No se pudo obtener la URL de autorización');
        }
      } catch (err) {
        const msg = err.response?.data?.error || 'Error al iniciar conexión OAuth';
        setError(msg);
      }
    },
    [workspaceId]
  );

  const fetchPages = useCallback(async () => {
    try {
      const res = await getMetaPages(workspaceId);
      return res.data?.pages || res.pages || [];
    } catch (err) {
      setError(err.response?.data?.error || 'Error obteniendo páginas');
      return [];
    }
  }, [workspaceId]);

  const choosePage = useCallback(
    async (channel, pageId) => {
      try {
        const res = await selectMetaPage(workspaceId, channel, pageId);
        await fetchConfig();
        setError(null);
        return res.data || res;
      } catch (err) {
        setError(err.response?.data?.error || 'Error seleccionando página');
        throw err;
      }
    },
    [workspaceId, fetchConfig]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    config,
    saveConfig,
    testConnection,
    disconnect,
    refresh: fetchConfig,
    error,
    clearError,
    // OAuth
    connectChannel,
    fetchPages,
    choosePage,
  };
}
