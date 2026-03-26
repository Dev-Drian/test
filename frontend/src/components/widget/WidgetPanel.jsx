/**
 * WidgetPanel — Contenedor principal del chat del widget
 */

import { useRef, useEffect } from 'react';
import WidgetMessage from './WidgetMessage';
import WidgetInput from './WidgetInput';

export default function WidgetPanel({ messages, isTyping, onSend, theme }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const primaryColor = theme?.primaryColor || '#4F46E5';

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: primaryColor }}
      >
        {theme?.avatarUrl ? (
          <img src={theme.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
            💬
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">
            {theme?.title || 'Chat'}
          </h2>
          {theme?.subtitle && (
            <p className="text-xs text-white/70 truncate">{theme.subtitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !isTyping && (
          <div className="text-center text-zinc-500 text-sm mt-8">
            ¡Envía un mensaje para comenzar!
          </div>
        )}
        {messages.map((msg, i) => (
          <WidgetMessage key={msg.id || i} {...msg} />
        ))}
        {isTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <WidgetInput onSend={onSend} disabled={isTyping} placeholder={theme?.inputPlaceholder} />

      {/* Powered by */}
      <div className="text-center py-1.5 text-[10px] text-zinc-600 border-t border-zinc-900">
        Powered by FlowAI
      </div>
    </div>
  );
}
