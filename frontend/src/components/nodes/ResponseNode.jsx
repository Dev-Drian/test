/**
 * ResponseNode - Nodo de respuesta al usuario
 * Diseño intuitivo para usuarios sin conocimientos técnicos
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { ChatIcon } from '../Icons';

// Tipos de respuesta con descripciones amigables
const RESPONSE_TYPES = [
  { value: 'success', label: 'Confirmacion', desc: 'Todo salio bien', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.1)' },
  { value: 'info', label: 'Informacion', desc: 'Datos o detalles', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
  { value: 'warning', label: 'Advertencia', desc: 'Algo a considerar', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
  { value: 'error', label: 'Error', desc: 'Algo fallo', color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' },
];

// Plantillas de mensajes sugeridos
const MESSAGE_TEMPLATES = [
  '¡Perfecto! Tu solicitud fue procesada.',
  '¡Listo! He guardado la información.',
  'Gracias, te confirmo que todo está en orden.',
  'Entendido, procesando tu pedido...',
];

export default function ResponseNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  const nodeLabel = data?.label || 'Responder';
  const messageText = data?.message || '';
  const hasMessage = messageText.length > 0;
  const currentType = RESPONSE_TYPES.find(t => t.value === data?.type) || RESPONSE_TYPES[0];

  return (
    <div 
      className={`min-w-[200px] max-w-[260px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-pink-400/60 shadow-2xl shadow-pink-500/30 scale-[1.02]' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-pink-500/15 hover:scale-[1.01]'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1f1a24, #181418)',
        border: `1px solid ${selected ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.15)'}`
      }}
    >
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !rounded-full !border-2 !-left-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #ec4899, #db2777)', 
          borderColor: '#1f1a24',
          boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)'
        }}
      />
      
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))',
          borderBottom: '1px solid rgba(236, 72, 153, 0.12)' 
        }}
      >
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #ec4899, #db2777)',
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
            }}
          >
            <ChatIcon size="md" />
          </div>
          {/* Indicador de mensaje */}
          {hasMessage && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full border-2 border-[#1f1a24]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-pink-300 truncate">{nodeLabel}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
              className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 text-[10px] flex items-center justify-center hover:bg-pink-500/30 transition-colors"
            >
              ?
            </button>
          </div>
          <span className="text-[11px] text-pink-500/70">Envía mensaje al usuario</span>
        </div>
      </div>

      {/* Tooltip */}
      {showHelp && (
        <div 
          className="absolute left-full ml-2 top-0 w-52 p-3 rounded-xl text-xs z-50"
          style={{ background: '#1e293b', border: '1px solid rgba(236, 72, 153, 0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          <p className="text-pink-300 font-medium mb-1">Respuesta</p>
          <p className="text-slate-400 leading-relaxed">
            Este nodo envía un <strong className="text-white">mensaje al usuario</strong> en el chat. Úsalo para confirmar acciones, dar información o mostrar errores.
          </p>
        </div>
      )}
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {hasMessage ? (
          /* Vista del mensaje configurado */
          <div className="space-y-2">
            <div 
              className="flex items-center gap-2 px-2 py-1 rounded-lg w-fit"
              style={{ background: currentType.bg }}
            >
              <span className="text-[11px]" style={{ color: currentType.color }}>{currentType.label}</span>
            </div>
            <div 
              className="px-3 py-2.5 rounded-xl text-[12px] leading-relaxed relative"
              style={{ 
                background: 'rgba(236, 72, 153, 0.08)', 
                border: '1px solid rgba(236, 72, 153, 0.15)',
                color: '#f9a8d4'
              }}
            >
              {/* Burbuja de chat */}
              <div className="absolute -left-1.5 top-3 w-3 h-3 rotate-45" style={{ background: 'rgba(236, 72, 153, 0.08)', borderLeft: '1px solid rgba(236, 72, 153, 0.15)', borderBottom: '1px solid rgba(236, 72, 153, 0.15)' }} />
              <p className="line-clamp-3">{messageText}</p>
            </div>
          </div>
        ) : (
          /* Modo edición */
          <div className="space-y-3">
            {/* Selector de tipo */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 block">
                Tipo de mensaje
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {RESPONSE_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => updateNodeData('type', type.value)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                      data?.type === type.value ? 'ring-1 ring-pink-500/50' : 'hover:bg-white/5'
                    }`}
                    style={{ 
                      background: data?.type === type.value ? type.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${data?.type === type.value ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255,255,255,0.05)'}`
                    }}
                  >
                    <span style={{ color: type.color }}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Área de mensaje */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  Mensaje
                </label>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-[10px] text-pink-400 hover:text-pink-300 transition-colors"
                >
                  {showTemplates ? 'Escribir' : 'Ideas'}
                </button>
              </div>
              
              {showTemplates ? (
                <div className="space-y-1.5">
                  {MESSAGE_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        updateNodeData('message', tpl);
                        setShowTemplates(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-pink-500/10 hover:text-pink-300 transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea 
                  className="w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none placeholder-slate-600"
                  style={{ 
                    background: '#18181f', 
                    border: '1px solid rgba(236, 72, 153, 0.2)',
                    color: '#f1f5f9'
                  }}
                  placeholder="Escribe lo que quieres decir al usuario..."
                  rows={3}
                  value={data?.message || ''}
                  onChange={(e) => updateNodeData('message', e.target.value)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer indicador */}
      <div 
        className="px-4 py-2 flex items-center justify-between text-[10px] text-slate-500"
        style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
      >
        <span className="flex items-center gap-1">
          <span className="text-pink-400">←</span> Desde paso anterior
        </span>
        <span className="flex items-center gap-1">
          Continuar <span className="text-pink-400">→</span>
        </span>
      </div>
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !rounded-full !border-2 !-right-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #ec4899, #db2777)', 
          borderColor: '#1f1a24',
          boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)'
        }}
      />
    </div>
  );
}
