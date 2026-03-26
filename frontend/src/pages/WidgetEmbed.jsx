/**
 * WidgetEmbed — Página standalone que se carga dentro del iframe.
 * NO usa AuthProvider, sidebar ni nada del dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import WidgetPanel from '../components/widget/WidgetPanel';
import {
  getWidgetConfig,
  createWidgetSession,
  sendWidgetMessage,
  getWidgetHistory,
} from '../api/widget';

const VISITOR_KEY = 'flowai_visitor_id';

export default function WidgetEmbed() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [theme, setTheme] = useState({});
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  const chatIdRef = useRef(null);
  const visitorIdRef = useRef(null);
  const socketRef = useRef(null);

  // Inicializar
  useEffect(() => {
    if (!token) {
      setError('Token no proporcionado');
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // 1. Obtener config
        const configRes = await getWidgetConfig(token);
        if (cancelled) return;
        setTheme(configRes.data.theme || {});

        // 2. Visitor ID persistente
        let vid = localStorage.getItem(VISITOR_KEY);
        if (!vid) {
          vid = uuidv4();
          localStorage.setItem(VISITOR_KEY, vid);
        }
        visitorIdRef.current = vid;

        // 3. Crear/recuperar sesión
        const sessionRes = await createWidgetSession(token, vid);
        if (cancelled) return;
        chatIdRef.current = sessionRes.data.chatId;

        // 4. Cargar historial
        const historyRes = await getWidgetHistory(token, vid);
        if (cancelled) return;
        setMessages(
          (historyRes.data.messages || []).map((m, i) => ({
            id: `hist-${i}`,
            ...m,
          }))
        );

        // 5. Conectar Socket.io
        const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        const socket = io(`${socketUrl}/widget`, {
          transports: ['websocket', 'polling'],
        });
        socket.on('connect', () => {
          socket.emit('join:visitor', { visitorId: vid, token });
        });
        socket.on('chat:message', (data) => {
          if (data.role === 'assistant') {
            setMessages((prev) => [
              ...prev,
              {
                id: `ws-${Date.now()}`,
                role: 'assistant',
                content: data.content,
                timestamp: data.timestamp || new Date().toISOString(),
              },
            ]);
            setIsTyping(false);
          }
        });
        socketRef.current = socket;

        setReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('Widget init error:', err);
          setError('No se pudo cargar el widget');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, [token]);

  // Enviar mensaje
  const handleSend = useCallback(
    async (text) => {
      if (!token || !visitorIdRef.current) return;

      // Agregar mensaje del usuario al state inmediatamente
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const res = await sendWidgetMessage(token, {
          visitorId: visitorIdRef.current,
          chatId: chatIdRef.current,
          message: text,
        });

        // Actualizar chatId si es nuevo
        if (res.data.chatId) chatIdRef.current = res.data.chatId;

        // La respuesta del bot llega por Socket o por HTTP fallback
        // Si no hay socket, usar la respuesta HTTP
        if (!socketRef.current?.connected && res.data.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              role: 'assistant',
              content: res.data.response,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsTyping(false);
        }
      } catch (err) {
        console.error('Send error:', err);
        setIsTyping(false);
        if (err.response?.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: '⏳ Has enviado demasiados mensajes. Espera un momento.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    },
    [token]
  );

  // Comunicar al iframe padre sobre nuevos mensajes (para badge en burbuja)
  useEffect(() => {
    if (messages.length > 0) {
      window.parent.postMessage(
        { type: 'flowai-widget', event: 'new-message', count: messages.length },
        '*'
      );
    }
  }, [messages.length]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm px-4 text-center">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <WidgetPanel
        messages={messages}
        isTyping={isTyping}
        onSend={handleSend}
        theme={theme}
      />
    </div>
  );
}
