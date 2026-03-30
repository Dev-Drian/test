/**
 * ChatMessageList - Lista de mensajes con burbujas, avatares y typing indicator.
 */
import { useEffect, useRef } from "react";
import { User } from "lucide-react";
import { SparklesIcon } from "../Icons";
import UserAvatar from './UserAvatar';
import ImportPreviewCard from './ImportPreviewCard';
import { EmptyMessagesState } from './ChatEmptyState';
import { EXTERNAL_CHANNEL_LABELS } from './ChatConstants';
import renderMarkdown from './ChatMarkdown';

function MessageBubble({ message, idx, messages, headerMeta, isExternalChat, alignRight, selectedAgentName }) {
  const isUser = message.role === 'user';
  const prevMsg = messages[idx - 1];
  const nextMsg = messages[idx + 1];

  const isFirstInGroup = !prevMsg || prevMsg.role !== message.role || prevMsg.type === 'import_preview' || prevMsg.type === 'import_done';
  const isLastInGroup = !nextMsg || nextMsg.role !== message.role || nextMsg.type === 'import_preview' || nextMsg.type === 'import_done';

  const senderName = isUser
    ? (isExternalChat ? (headerMeta?.senderName || 'Cliente') : 'Tú')
    : selectedAgentName;
  const senderProfilePic = isUser && isExternalChat ? headerMeta?.senderProfilePic : null;

  return (
    <div
      className={`flex gap-4 ${isFirstInGroup ? 'pt-5' : 'pt-1'} ${alignRight ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-10 shrink-0 ${isFirstInGroup ? '' : 'invisible'}`}>
        {isFirstInGroup && (
          isUser ? (
            isExternalChat ? (
              <UserAvatar
                name={headerMeta?.senderName || 'Cliente'}
                profilePic={senderProfilePic}
                size="md"
                showChannelBadge={false}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
            )
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <SparklesIcon size="sm" className="text-white" />
            </div>
          )
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${alignRight ? 'flex flex-col items-end' : ''}`}>
        {isFirstInGroup && (
          <div className={`flex items-center gap-3 mb-1.5 ${alignRight ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm font-semibold ${isUser ? 'text-blue-400' : 'text-emerald-400'}`}>
              {senderName}
            </span>
            {message.ts && (
              <span className="text-xs text-slate-500">
                {new Date(message.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        <div
          className={`inline-block max-w-[85%] lg:max-w-[70%] xl:max-w-[60%] px-4 py-2.5 text-[15px] leading-relaxed ring-1 ring-white/[0.04] ${
            alignRight
              ? `bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ${isFirstInGroup ? 'rounded-2xl rounded-tr-md' : isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-r-md'}`
              : isUser
                ? `bg-slate-800/90 text-slate-100 backdrop-blur-sm border border-slate-600/40 ${isFirstInGroup ? 'rounded-2xl rounded-tl-md' : isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-l-md'}`
                : `bg-gradient-to-br from-slate-800/90 to-slate-900/80 text-slate-100 backdrop-blur-sm border border-violet-500/15 ${isFirstInGroup ? 'rounded-2xl rounded-tl-md' : isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-l-md'}`
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2">
              {renderMarkdown(message.content)}
            </div>
          )}
        </div>

        {!isFirstInGroup && isLastInGroup && message.ts && (
          <span className={`text-xs text-slate-500 mt-1.5 ${alignRight ? 'text-right' : ''}`}>
            {new Date(message.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ agentName }) {
  return (
    <div className="flex gap-4 pt-5">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
        <SparklesIcon size="sm" className="text-white" />
      </div>
      <div>
        <span className="text-sm font-semibold text-emerald-400 mb-1.5 block">{agentName}</span>
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-md bg-slate-800/60 backdrop-blur-sm border border-slate-700/30">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatMessageList({
  messages,
  sending,
  selectedAgentName,
  headerMeta,
  isExternalThread,
  pendingImport,
  onConfirmImport,
  onCancelImport,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isExternalChat = headerMeta?.channel && headerMeta.channel !== 'web';
  const channelLabel = EXTERNAL_CHANNEL_LABELS[headerMeta?.channel] || 'su canal';

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-12 scrollbar-thin min-h-0">
      <div className="py-5 space-y-1 max-w-4xl mx-auto">
        {messages.length === 0 && !sending && (
          <EmptyMessagesState isExternalThread={isExternalThread} channelLabel={channelLabel} />
        )}

        {messages.map((m, idx) => {
          if (m.type === 'import_preview' || m.type === 'import_done') {
            return (
              <ImportPreviewCard
                key={m.id || idx}
                message={m}
                onConfirm={() => onConfirmImport(m)}
                onCancel={() => onCancelImport(m.id)}
                confirming={!!(pendingImport?.msgId === m.id)}
                agentName={selectedAgentName}
              />
            );
          }

          const isUser = m.role === 'user';
          const alignRight = isUser && !isExternalChat;

          return (
            <MessageBubble
              key={m.id || idx}
              message={m}
              idx={idx}
              messages={messages}
              headerMeta={headerMeta}
              isExternalChat={isExternalChat}
              alignRight={alignRight}
              selectedAgentName={selectedAgentName}
            />
          );
        })}

        {sending && <TypingIndicator agentName={selectedAgentName} />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
