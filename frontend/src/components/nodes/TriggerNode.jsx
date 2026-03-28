/**
 * TriggerNode - Nodo de inicio del flujo
 * Diseño intuitivo para usuarios sin conocimientos técnicos
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { RocketIcon, ClipboardIcon } from '../Icons';

// Triggers con iconos y descripciones amigables
const TRIGGER_OPTIONS = [
  { value: 'create', label: 'Al crear registro', desc: 'Cuando se anade un nuevo dato', color: '#4ade80' },
  { value: 'update', label: 'Al modificar', desc: 'Cuando se edita un dato existente', color: '#60a5fa' },
  { value: 'delete', label: 'Al eliminar', desc: 'Cuando se borra un registro', color: '#f87171' },
  { value: 'onMessage', label: 'Al recibir mensaje', desc: 'Cuando un usuario escribe', color: '#a78bfa' },
];

export default function TriggerNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [showHelp, setShowHelp] = useState(false);

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  const tableName = data?.tableName || data?.table || data?.tablePlaceholder || null;
  const keywords = data?.keywords || [];
  const hasKeywords = keywords.length > 0;
  const hasTriggerConfig = data?.trigger && data?.tablePlaceholder;
  const isViewMode = hasKeywords || hasTriggerConfig;
  const nodeLabel = data?.label || 'Inicio';
  
  const currentTrigger = TRIGGER_OPTIONS.find(t => t.value === data?.trigger) || TRIGGER_OPTIONS[0];

  return (
    <div 
      className={`min-w-[200px] max-w-[240px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-emerald-400/60 shadow-2xl shadow-emerald-500/30 scale-[1.02]' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-emerald-500/15 hover:scale-[1.01]'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1f2e, #141820)',
        border: `1px solid ${selected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.15)'}`
      }}
    >
      {/* Header con indicador visual */}
      <div 
        className="px-4 py-3 flex items-center gap-3" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
          borderBottom: '1px solid rgba(16, 185, 129, 0.12)' 
        }}
      >
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
            }}
          >
            <RocketIcon size="md" />
          </div>
          {/* Indicador de activo */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#1a1f2e] animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-300 truncate">{nodeLabel}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
              className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
              title="¿Qué es esto?"
            >
              ?
            </button>
          </div>
          <span className="text-[11px] text-emerald-500/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            Punto de inicio
          </span>
        </div>
      </div>

      {/* Tooltip de ayuda */}
      {showHelp && (
        <div 
          className="absolute left-full ml-2 top-0 w-48 p-3 rounded-xl text-xs z-50 animate-fade-in"
          style={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          <p className="text-emerald-300 font-medium mb-1">Disparador</p>
          <p className="text-slate-400 leading-relaxed">
            Este nodo define <strong className="text-white">cuando se activa</strong> tu automatizacion. Elige el evento que la iniciara.
          </p>
        </div>
      )}
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {hasKeywords ? (
          <div>
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2 text-slate-400 font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
              Palabras que activan
            </label>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 4).map((kw, i) => (
                <span 
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                  style={{ 
                    background: 'rgba(16, 185, 129, 0.12)', 
                    border: '1px solid rgba(16, 185, 129, 0.2)', 
                    color: '#34d399' 
                  }}
                >
                  {kw}
                </span>
              ))}
              {keywords.length > 4 && (
                <span className="text-[11px] text-slate-500 px-2">+{keywords.length - 4} más</span>
              )}
            </div>
          </div>
        ) : isViewMode ? (
          <div 
            className="px-3 py-2.5 rounded-xl text-[12px] flex items-center gap-2.5"
            style={{ 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.12)',
            }}
          >
            <span className="text-lg">{currentTrigger.label.split(' ')[0]}</span>
            <span className="text-emerald-300">{currentTrigger.label.slice(2)}</span>
          </div>
        ) : (
          /* Modo edición con opciones visuales */
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              ¿Cuándo se activa?
            </label>
            <div className="space-y-1.5">
              {TRIGGER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateNodeData('trigger', opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                    data?.trigger === opt.value 
                      ? 'ring-2 ring-emerald-500/50' 
                      : 'hover:bg-white/5'
                  }`}
                  style={{ 
                    background: data?.trigger === opt.value ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${data?.trigger === opt.value ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  <span className="font-medium" style={{ color: opt.color }}>{opt.label}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Tabla asociada */}
        {tableName && (
          <div 
            className="px-3 py-2 rounded-xl text-[11px] flex items-center gap-2"
            style={{ 
              background: 'rgba(16, 185, 129, 0.05)', 
              border: '1px dashed rgba(16, 185, 129, 0.2)'
            }}
          >
            <ClipboardIcon size="xs" className="text-emerald-500" /> 
            <span className="text-slate-400">Tabla:</span>
            <span className="text-emerald-300 font-medium truncate">{tableName}</span>
          </div>
        )}
      </div>

      {/* Indicador de flujo saliente */}
      <div 
        className="px-4 py-2 flex items-center justify-end gap-2 text-[10px] text-slate-500"
        style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
      >
        <span>Siguiente paso</span>
        <span className="text-emerald-400">→</span>
      </div>
      
      {/* Handle de salida mejorado */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !rounded-full !border-2 !-right-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #10b981, #059669)', 
          borderColor: '#1a1f2e',
          boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
        }}
      />
    </div>
  );
}
