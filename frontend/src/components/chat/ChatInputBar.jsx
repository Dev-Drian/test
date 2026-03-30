/**
 * ChatInputBar - Barra de entrada con textarea, adjuntos y selección de tabla.
 */
import { useRef, useEffect } from "react";
import { Paperclip } from "lucide-react";
import { SendIcon } from "../Icons";
import { EXTERNAL_CHANNEL_LABELS } from './ChatConstants';

export default function ChatInputBar({
  input,
  sending,
  attachedFile,
  importTables,
  importTableId,
  tableSearch,
  isExternalThread,
  headerMeta,
  onInputChange,
  onKeyDown,
  onSubmit,
  onFileSelect,
  onRemoveFile,
  onTableSearchChange,
  onTableSearchFocus,
  onTableSearchBlur,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTextareaChange = (e) => {
    onInputChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const placeholder = attachedFile
    ? `Enviar para analizar ${attachedFile.name}...`
    : isExternalThread
      ? 'Escribe la respuesta al cliente…'
      : 'Mensaje al asistente · Enter envía, Shift+Enter salto de línea';

  return (
    <div
      className="shrink-0 px-4 lg:px-8 xl:px-12 backdrop-blur-sm"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(to top, rgba(13,13,18,0.98), rgba(10,10,15,0.95))',
      }}
    >
      {/* File attachment bar */}
      {attachedFile && (
        <div className="pt-4 max-w-4xl mx-auto">
          <div
            className="flex items-center gap-2.5 p-3 rounded-2xl flex-wrap"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(56,189,248,0.06))',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 4px 16px rgba(139,92,246,0.05)',
            }}
          >
            <Paperclip className="w-4 h-4 text-violet-400" />
            <span className="text-sky-300 text-sm font-medium truncate max-w-40">{attachedFile.name}</span>
            <span className="text-slate-500 text-xs">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
            <span className="text-slate-400 text-xs mx-1">→</span>
            <div className="relative flex-1 min-w-32 max-w-xs">
              <input
                type="text"
                placeholder="Buscar tabla..."
                value={tableSearch || (importTables.find(t => t._id === importTableId)?.name || '')}
                onChange={e => onTableSearchChange(e.target.value)}
                onFocus={onTableSearchFocus}
                onBlur={onTableSearchBlur}
                className="w-full text-xs bg-slate-700/70 text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-600 focus:border-sky-500 outline-none"
                list="import-tables-list"
              />
              <datalist id="import-tables-list">
                {importTables.map(t => <option key={t._id} value={t.name} />)}
              </datalist>
            </div>
            <button
              onClick={onRemoveFile}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={onSubmit} className="py-4 max-w-4xl mx-auto w-full">
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileSelect} />
        <div
          className="relative rounded-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-violet-500/25 focus-within:border-violet-500/30"
          style={{
            background: 'linear-gradient(145deg, rgba(30,41,59,0.85), rgba(15,23,42,0.95))',
            border: '1px solid rgba(100,116,139,0.22)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={sending}
            className="w-full px-5 py-4 pr-[7.5rem] bg-transparent text-slate-100 text-[15px] placeholder-slate-500 resize-none focus:outline-none max-h-48 leading-relaxed"
            style={{ fontWeight: 450 }}
          />
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="p-2.5 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-30 transition-all duration-200"
              title="Adjuntar CSV o Excel"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={sending || (!input.trim() && !attachedFile)}
              className="p-3 rounded-xl text-white disabled:opacity-30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: '0 4px 24px rgba(139,92,246,0.45)',
              }}
            >
              <SendIcon size="sm" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
