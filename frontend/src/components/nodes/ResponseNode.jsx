/**
 * ResponseNode - Nodo de respuesta al usuario (Estilo n8n)
 * Color: Rosa (#ec4899)
 * Compatible con plantillas (message) y flujos del sistema (response)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { ChatIcon } from '../Icons';

export default function ResponseNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  // Título del nodo (de plantilla o por defecto)
  const nodeLabel = data?.label || 'Respuesta';
  
  // Mensaje (puede venir de plantilla o de edición)
  const messageText = data?.message || '';
  
  // Si hay mensaje configurado, es modo vista
  const hasMessage = messageText.length > 0;

  return (
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-pink-400/60 shadow-2xl shadow-pink-500/20' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-pink-500/10'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(236, 72, 153, 0.2)'
      }}
    >
      {/* Handle de entrada - Estilo n8n */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !rounded-full !border-2 !-left-1.5"
        style={{ 
          background: '#ec4899', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)'
        }}
      />
      
      {/* Header compacto estilo n8n */}
      <div 
        className="px-3 py-2.5 flex items-center gap-2.5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(236, 72, 153, 0.05))',
          borderBottom: '1px solid rgba(236, 72, 153, 0.15)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)'
          }}
        >
          <ChatIcon size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-pink-300 block truncate">{nodeLabel}</span>
          <span className="text-[10px] text-pink-500/70">Mensaje</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Si hay mensaje configurado (de plantilla), mostrarlo */}
        {hasMessage ? (
          <div 
            className="px-2.5 py-2 rounded-xl text-[11px] leading-relaxed"
            style={{ 
              background: 'rgba(236, 72, 153, 0.08)', 
              border: '1px solid rgba(236, 72, 153, 0.15)',
              color: '#f9a8d4'
            }}
          >
            <p className="line-clamp-3">{messageText.slice(0, 80)}{messageText.length > 80 ? '...' : ''}</p>
          </div>
        ) : (
          /* Si no hay mensaje, mostrar editor */
          <>
            <select 
              className="w-full px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all cursor-pointer appearance-none"
              style={{ 
                background: '#1e1e2a', 
                border: '1px solid rgba(236, 72, 153, 0.3)',
                color: '#f9a8d4',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ec4899'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '16px',
                paddingRight: '32px'
              }}
              value={data?.type || 'success'}
              onChange={(e) => updateNodeData('type', e.target.value)}
            >
              <option value="success" style={{ background: '#1e1e2a', color: '#4ade80', padding: '8px' }}>✓ Éxito</option>
              <option value="error" style={{ background: '#1e1e2a', color: '#f87171', padding: '8px' }}>✗ Error</option>
              <option value="info" style={{ background: '#1e1e2a', color: '#60a5fa', padding: '8px' }}>ⓘ Info</option>
            </select>
            
            <textarea 
              className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none placeholder-slate-500"
              style={{ 
                background: '#1e1e2a', 
                border: '1px solid rgba(236, 72, 153, 0.3)',
                color: '#f1f5f9'
              }}
              placeholder="Escribe tu mensaje..."
              rows={2}
              value={data?.message || ''}
              onChange={(e) => updateNodeData('message', e.target.value)}
            />
          </>
        )}
      </div>
      
      {/* Handle de salida - Estilo n8n */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !rounded-full !border-2 !-right-1.5"
        style={{ 
          background: '#ec4899', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)'
        }}
      />
    </div>
  );
}
