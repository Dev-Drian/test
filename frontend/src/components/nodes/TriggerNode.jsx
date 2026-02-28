/**
 * TriggerNode - Nodo de inicio del flujo (Estilo n8n)
 * Color: Esmeralda (#10b981)
 * Compatible con plantillas (start) y flujos del sistema (trigger)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { RocketIcon, ClipboardIcon } from '../Icons';

export default function TriggerNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  // Obtener nombre de tabla del contexto o data
  const tableName = data?.tableName || data?.table || data?.tablePlaceholder || null;
  
  // Obtener keywords si vienen de plantilla
  const keywords = data?.keywords || [];
  
  // Detectar modo: 
  // - Con keywords → modo palabras clave
  // - Con trigger definido y tablePlaceholder → modo vista con trigger
  // - Sin nada → modo edición
  const hasKeywords = keywords.length > 0;
  const hasTriggerConfig = data?.trigger && data?.tablePlaceholder;
  const isViewMode = hasKeywords || hasTriggerConfig;
  
  // Título del nodo
  const nodeLabel = data?.label || 'Inicio';
  
  // Descripción según el trigger
  const getTriggerDescription = () => {
    if (hasKeywords) return 'Al detectar palabras';
    const triggers = {
      'create': 'Al crear',
      'afterCreate': 'Después de crear',
      'update': 'Al actualizar',
      'afterUpdate': 'Después de actualizar',
      'delete': 'Al eliminar',
      'beforeCreate': 'Antes de crear',
      'query': 'Al consultar',
      'availability': 'Disponibilidad',
      'onMessage': 'Al recibir mensaje',
    };
    return triggers[data?.trigger] || 'Trigger';
  };

  return (
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-emerald-400/60 shadow-2xl shadow-emerald-500/20' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-emerald-500/10'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(16, 185, 129, 0.2)'
      }}
    >
      {/* Header compacto estilo n8n */}
      <div 
        className="px-3 py-2.5 flex items-center gap-2.5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05))',
          borderBottom: '1px solid rgba(16, 185, 129, 0.15)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}
        >
          <RocketIcon size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-emerald-300 block truncate">{nodeLabel}</span>
          <span className="text-[10px] text-emerald-500/70">{getTriggerDescription()}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2.5">
        {/* Si tiene keywords, mostrar keywords */}
        {hasKeywords ? (
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1.5 text-slate-500 font-medium">
              Palabras clave
            </label>
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 4).map((kw, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-medium"
                  style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
                    color: '#34d399' 
                  }}
                >
                  {kw}
                </span>
              ))}
              {keywords.length > 4 && (
                <span className="text-[10px] text-slate-500">+{keywords.length - 4}</span>
              )}
            </div>
          </div>
        ) : hasTriggerConfig ? (
          /* Modo vista con trigger configurado */
          <div 
            className="px-2.5 py-2 rounded-xl text-[11px] flex items-center gap-2"
            style={{ 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.15)',
              color: '#34d399'
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {getTriggerDescription()}
          </div>
        ) : (
          /* Modo edición: Selector de Trigger */
          <select 
            className="w-full px-2.5 py-2 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#d1d5db'
            }}
            value={data?.trigger || 'create'}
            onChange={(e) => updateNodeData('trigger', e.target.value)}
          >
            <option value="create">Al CREAR</option>
            <option value="update">Al ACTUALIZAR</option>
            <option value="delete">Al ELIMINAR</option>
            <option value="beforeCreate">ANTES de crear</option>
            <option value="query">Al CONSULTAR</option>
            <option value="availability">DISPONIBILIDAD</option>
          </select>
        )}
        
        {/* Mostrar tabla asociada si existe */}
        {tableName && (
          <div 
            className="px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 mt-1"
            style={{ 
              background: 'rgba(16, 185, 129, 0.06)', 
              color: '#6ee7b7'
            }}
          >
            <ClipboardIcon size="xs" /> 
            <span className="truncate">{tableName}</span>
          </div>
        )}
      </div>
      
      {/* Handle de salida - Estilo n8n */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !rounded-full !border-2 !-right-1.5"
        style={{ 
          background: '#10b981', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
        }}
      />
    </div>
  );
}
