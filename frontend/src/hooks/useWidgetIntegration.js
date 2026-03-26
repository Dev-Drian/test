import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useWidgetIntegration() {
  const [status, setStatus] = useState({
    loading: true,
    enabled: false,
    token: null,
    theme: {},
    agentId: null,
  });
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, loading: true }));
      const res = await api.get('/integrations/widget/settings');
      const d = res.data;
      setStatus({
        loading: false,
        enabled: d.enabled ?? false,
        token: d.token ?? null,
        theme: d.theme ?? {},
        agentId: d.agentId ?? null,
      });
      setError(null);
    } catch (err) {
      setStatus({ loading: false, enabled: false, token: null, theme: {}, agentId: null });
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || err.message);
      }
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const enable = useCallback(async (agentId) => {
    try {
      const res = await api.post('/integrations/widget/enable', { agentId });
      setStatus((prev) => ({
        ...prev,
        enabled: true,
        token: res.data.token,
        agentId: agentId || prev.agentId,
      }));
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al activar widget');
      throw err;
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      await api.post('/integrations/widget/disable');
      setStatus((prev) => ({ ...prev, enabled: false, token: null }));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar widget');
      throw err;
    }
  }, []);

  const updateTheme = useCallback(async (theme) => {
    try {
      const res = await api.put('/integrations/widget/theme', { theme });
      setStatus((prev) => ({ ...prev, theme: res.data.theme ?? theme }));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar tema');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { status, enable, disable, updateTheme, refresh: fetchSettings, error, clearError };
}
