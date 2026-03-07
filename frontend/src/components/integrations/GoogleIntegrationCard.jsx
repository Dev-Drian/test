/**
 * GoogleIntegrationCard - Tarjeta para conectar/desconectar Google
 * 
 * Muestra el estado de conexión y permite al usuario conectar
 * o desconectar su cuenta de Google.
 */

import { useState } from 'react';
import { Calendar, Sheet, Check } from 'lucide-react';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';

export default function GoogleIntegrationCard() {
  const { status, connect, disconnect, error, clearError } = useGoogleIntegration();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Error al conectar:', err);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Estás seguro de que quieres desconectar tu cuenta de Google?')) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnect();
    } catch (err) {
      console.error('Error al desconectar:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  if (status.loading) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-48 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Logo de Google */}
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white">Google</h3>
            <p className="text-sm text-zinc-400">
              Calendar y Sheets para automatizaciones
            </p>
          </div>
        </div>

        {/* Badge de estado */}
        {status.connected ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Conectado
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            Desconectado
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Contenido según estado */}
      {status.connected ? (
        <div className="space-y-4">
          {/* Info de cuenta conectada */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
            {status.picture ? (
              <img 
                src={status.picture} 
                alt={status.name} 
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                {status.name?.charAt(0)?.toUpperCase() || status.email?.charAt(0)?.toUpperCase() || 'G'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{status.name}</p>
              <p className="text-xs text-zinc-400 truncate">{status.email}</p>
            </div>
          </div>

          {/* Capacidades */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">Calendar</span>
              </div>
              <p className="text-xs text-zinc-400">
                Crea eventos automáticos desde tus flujos
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Sheet className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">Sheets</span>
              </div>
              <p className="text-xs text-zinc-400">
                Exporta datos a hojas de cálculo
              </p>
            </div>
          </div>

          {/* Botón desconectar */}
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {disconnecting ? 'Desconectando...' : 'Desconectar cuenta de Google'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Beneficios */}
          <div className="space-y-2">
            <p className="text-sm text-zinc-300 mb-3">
              Conecta tu cuenta de Google para desbloquear:
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Crear eventos en Calendar automáticamente</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Exportar datos a Google Sheets</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Sincronizar reservas con tu calendario</span>
            </div>
          </div>

          {/* Botón conectar */}
          <button
            onClick={handleConnect}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Conectar con Google
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
