/**
 * WidgetMessage — Burbuja individual de mensaje en el widget
 */

export default function WidgetMessage({ role, content, timestamp }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
        }`}
      >
        {content}
        {timestamp && (
          <div
            className={`text-[10px] mt-1 ${
              isUser ? 'text-indigo-200' : 'text-zinc-500'
            }`}
          >
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
