/**
 * TelegramBotManager - Gestión del bot de Telegram conectado
 * 
 * Permite configurar el webhook, ver info del bot y probar envío de mensajes
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PaperAirplaneIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
  CommandLineIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

export default function TelegramBotManager({ workspaceId }) {
  const [botInfo, setBotInfo] = useState(null);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  
  // Agentes
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [savingAgent, setSavingAgent] = useState(false);
  
  // Test message
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Commands
  const [commands, setCommands] = useState([
    { command: 'start', description: 'Iniciar conversación' },
    { command: 'help', description: 'Ver ayuda' },
    { command: 'menu', description: 'Ver menú de opciones' }
  ]);
  const [savingCommands, setSavingCommands] = useState(false);
  
  const [toast, setToast] = useState(null);

  // Cargar info del bot
  const loadBotInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/telegram/${workspaceId}/bot-info`);
      if (res.data.success) {
        setBotInfo(res.data.bot);
        // Cargar info del webhook
        if (res.data.webhook) {
          setWebhookInfo(res.data.webhook);
          if (res.data.webhook.url) {
            setWebhookUrl(res.data.webhook.url);
            setWebhookConfigured(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading bot info:', err);
      setBotInfo(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Cargar agentes disponibles
  const loadAgents = useCallback(async () => {
    try {
      const res = await api.get('/agent/list', { params: { workspaceId } });
      setAgents(res.data || []);
    } catch (err) {
      console.error('Error loading agents:', err);
    }
  }, [workspaceId]);

  // Cargar configuración de Telegram (agente seleccionado)
  const loadTelegramConfig = useCallback(async () => {
    try {
      const res = await api.get(`/telegram/${workspaceId}/config`);
      if (res.data?.defaultAgentId) {
        setSelectedAgentId(res.data.defaultAgentId);
      }
    } catch (err) {
      console.error('Error loading telegram config:', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadBotInfo();
    loadAgents();
    loadTelegramConfig();
  }, [loadBotInfo, loadAgents, loadTelegramConfig]);

  // Guardar agente seleccionado
  const handleSaveAgent = async () => {
    if (!selectedAgentId) {
      setToast({ type: 'error', message: 'Selecciona un agente' });
      return;
    }
    
    setSavingAgent(true);
    try {
      await api.post(`/telegram/${workspaceId}/config`, {
        defaultAgentId: selectedAgentId
      });
      setToast({ type: 'success', message: 'Agente guardado correctamente' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al guardar agente' });
    } finally {
      setSavingAgent(false);
    }
  };

  // Configurar webhook
  const handleSetupWebhook = async () => {
    setSettingWebhook(true);
    try {
      const res = await api.post(`/telegram/${workspaceId}/setup-webhook`, {
        webhookUrl: webhookUrl || undefined
      });
      
      if (res.data.success) {
        setWebhookConfigured(true);
        setWebhookUrl(res.data.webhookUrl);
        setToast({ type: 'success', message: 'Webhook configurado correctamente' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al configurar webhook' });
    } finally {
      setSettingWebhook(false);
    }
  };

  // Eliminar webhook
  const handleDeleteWebhook = async () => {
    try {
      await api.delete(`/telegram/${workspaceId}/webhook`);
      setWebhookConfigured(false);
      setWebhookUrl('');
      setToast({ type: 'success', message: 'Webhook eliminado' });
    } catch (err) {
      setToast({ type: 'error', message: 'Error al eliminar webhook' });
    }
  };

  // Enviar mensaje de prueba
  const handleSendTest = async () => {
    if (!testChatId || !testMessage) {
      setToast({ type: 'error', message: 'Ingresa el Chat ID y el mensaje' });
      return;
    }
    
    setSending(true);
    try {
      await api.post(`/telegram/${workspaceId}/send`, {
        chatId: testChatId,
        text: testMessage
      });
      
      setToast({ type: 'success', message: 'Mensaje enviado' });
      setTestMessage('');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al enviar mensaje' });
    } finally {
      setSending(false);
    }
  };

  // Guardar comandos
  const handleSaveCommands = async () => {
    const validCommands = commands.filter(c => c.command && c.description);
    
    if (validCommands.length === 0) {
      setToast({ type: 'error', message: 'Agrega al menos un comando' });
      return;
    }
    
    setSavingCommands(true);
    try {
      await api.post(`/telegram/${workspaceId}/set-commands`, {
        commands: validCommands
      });
      
      setToast({ type: 'success', message: 'Comandos guardados' });
    } catch (err) {
      setToast({ type: 'error', message: 'Error al guardar comandos' });
    } finally {
      setSavingCommands(false);
    }
  };

  // Agregar comando
  const addCommand = () => {
    setCommands([...commands, { command: '', description: '' }]);
  };

  // Eliminar comando
  const removeCommand = (index) => {
    setCommands(commands.filter((_, i) => i !== index));
  };

  // Actualizar comando
  const updateCommand = (index, field, value) => {
    const newCommands = [...commands];
    newCommands[index][field] = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (field === 'description') {
      newCommands[index][field] = value;
    }
    setCommands(newCommands);
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4"></div>
        <div className="h-4 w-64 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (!botInfo) {
    return (
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">Bot no configurado</h3>
        <p className="text-zinc-400 text-sm">
          Conecta un bot de Telegram desde la página de Integraciones
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Info Card */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center text-white">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{botInfo.first_name}</h3>
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-blue-300">@{botInfo.username}</p>
            <div className="flex gap-4 mt-2 text-sm text-zinc-400">
              <span>ID: {botInfo.id}</span>
              {botInfo.can_join_groups && <span>• Puede unirse a grupos</span>}
            </div>
          </div>
          <button
            onClick={loadBotInfo}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Actualizar"
          >
            <ArrowPathIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-medium text-white">Configurar Webhook</h3>
        </div>
        
        <p className="text-sm text-zinc-400 mb-4">
          El webhook permite que tu bot reciba mensajes en tiempo real. 
          Necesitas una URL pública (ej: ngrok o tu servidor en producción).
        </p>
        
        {/* Estado actual del webhook */}
        {webhookConfigured && webhookUrl && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Webhook Activo</span>
              </div>
              <button
                onClick={handleDeleteWebhook}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                Eliminar
              </button>
            </div>
            <div className="mt-2">
              <span className="text-xs text-zinc-500 block mb-1">URL actual:</span>
              <code className="text-xs text-green-300 bg-zinc-900/50 px-2 py-1 rounded block break-all">
                {webhookUrl}
              </code>
            </div>
            {webhookInfo?.pending_update_count > 0 && (
              <p className="text-xs text-amber-400 mt-2">
                {webhookInfo.pending_update_count} mensaje(s) pendiente(s)
              </p>
            )}
            {webhookInfo?.last_error_message && (
              <p className="text-xs text-red-400 mt-2">
                Error: {webhookInfo.last_error_message}
              </p>
            )}
          </div>
        )}
        
        {/* Formulario para configurar/cambiar webhook */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={webhookConfigured ? '' : webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder={webhookConfigured ? 'Nueva URL para reemplazar...' : 'https://tu-servidor.com (opcional)'}
            className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50"
          />
          <button
            onClick={handleSetupWebhook}
            disabled={settingWebhook}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {settingWebhook ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <LinkIcon className="w-4 h-4" />
            )}
            {webhookConfigured ? 'Actualizar' : 'Configurar'}
          </button>
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs text-zinc-400 flex items-start gap-2">
            <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> Para desarrollo local, usa{' '}
              <a href="https://ngrok.com" target="_blank" rel="noopener" className="text-violet-400 hover:underline">
                ngrok
              </a>{' '}
              para exponer tu servidor: <code className="bg-zinc-900 px-1 rounded">ngrok http 3010</code>
            </span>
          </p>
        </div>
      </div>

      {/* Agent Selection */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-medium text-white">Agente de Respuesta</h3>
        </div>
        
        <p className="text-sm text-zinc-400 mb-4">
          Selecciona el agente de IA que respondera automaticamente los mensajes que lleguen a este bot de Telegram.
        </p>
        
        <div className="space-y-4">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          >
            <option value="">Seleccionar agente...</option>
            {agents.map(agent => (
              <option key={agent._id} value={agent._id}>
                {agent.name} {agent.active === false ? '(inactivo)' : ''}
              </option>
            ))}
          </select>
          
          {selectedAgentId && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-300">
                Los mensajes que lleguen al bot seran respondidos por este agente usando su personalidad y conocimientos configurados.
              </p>
            </div>
          )}
          
          <button
            onClick={handleSaveAgent}
            disabled={savingAgent || !selectedAgentId}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {savingAgent ? 'Guardando...' : 'Guardar Agente'}
          </button>
        </div>
      </div>

      {/* Commands Configuration */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CommandLineIcon className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-medium text-white">Comandos del Bot</h3>
          </div>
          <button
            onClick={addCommand}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            + Agregar comando
          </button>
        </div>
        
        <div className="space-y-3 mb-4">
          {commands.map((cmd, index) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={cmd.command}
                  onChange={(e) => updateCommand(index, 'command', e.target.value)}
                  placeholder="comando"
                  className="w-32 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 text-sm"
                />
                <input
                  type="text"
                  value={cmd.description}
                  onChange={(e) => updateCommand(index, 'description', e.target.value)}
                  placeholder="Descripción del comando"
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 text-sm"
                />
              </div>
              <button
                onClick={() => removeCommand(index)}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <TrashIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleSaveCommands}
          disabled={savingCommands}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {savingCommands ? 'Guardando...' : 'Guardar Comandos'}
        </button>
      </div>

      {/* Test Message */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <PaperAirplaneIcon className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-medium text-white">Enviar Mensaje de Prueba</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Chat ID</label>
            <input
              type="text"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              placeholder="Ej: 123456789"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Abre tu bot en Telegram y envía /start para obtener tu Chat ID
            </p>
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Mensaje</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
          </div>
          
          <button
            onClick={handleSendTest}
            disabled={sending || !testChatId || !testMessage}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
            Enviar Mensaje
          </button>
        </div>
      </div>

      {/* Usage in Flows Info */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20">
        <h4 className="text-sm font-semibold text-violet-400 mb-2">
          ¿Cómo usar Telegram en tus flujos?
        </h4>
        <p className="text-sm text-zinc-300 mb-3">
          Una vez configurado el webhook, puedes usar acciones de Telegram en tus flujos de automatización:
        </p>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• <strong className="text-white">Enviar mensaje:</strong> Responde a usuarios desde tus flujos</li>
          <li>• <strong className="text-white">Botones inline:</strong> Agrega botones interactivos</li>
          <li>• <strong className="text-white">Enviar fotos:</strong> Comparte imágenes con tus usuarios</li>
          <li>• <strong className="text-white">Trigger de mensaje:</strong> Inicia flujos cuando lleguen mensajes</li>
        </ul>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:bg-white/20 rounded p-1">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
