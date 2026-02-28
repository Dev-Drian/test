
/**
 * DefaultNode - Nodo por defecto para tipos no reconocidos
 * Estilo n8n con handles horizontales
 */
import { Handle, Position } from '@xyflow/react';

export default function DefaultNode({ data, selected }) {
  return (
    <div 
      className={`min-w-[160px] max-w-[200px] rounded-2xl transition-all ${
        selected ? 'ring-2 ring-zinc-400' : ''
      }`}
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(113, 113, 122, 0.2)',
        boxShadow: selected ? '0 0 20px rgba(113, 113, 122, 0.3)' : '0 4px 20px rgba(0,0,0,0.4)'
      }}
    >
      {/* Handle entrada - izquierda */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-0 !-left-1.5"
        style={{ 
          background: '#71717a',
          boxShadow: '0 0 8px rgba(113, 113, 122, 0.5)'
        }}
      />
      
      {/* Header compacto */}
      <div 
        className="px-3 py-2 flex items-center gap-2"
        style={{ 
          background: 'linear-gradient(135deg, rgba(113, 113, 122, 0.12), rgba(113, 113, 122, 0.05))',
          borderBottom: '1px solid rgba(113, 113, 122, 0.15)',
          borderRadius: '16px 16px 0 0'
        }}
      >
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
          style={{ 
            background: 'linear-gradient(135deg, #71717a, #52525b)',
            boxShadow: '0 0 10px rgba(113, 113, 122, 0.4)'
          }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-zinc-400">{data?.label || 'Nodo'}</span>
      </div>
      
      {/* Contenido */}
      <div className="px-3 py-2 text-center">
        <p className="text-[10px] text-zinc-500">
          {data?.type ? `Tipo: ${data.type}` : 'Sin configurar'}
        </p>
      </div>
      
      {/* Handle salida - derecha */}
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-0 !-right-1.5"
        style={{ 
          background: '#71717a',
          boxShadow: '0 0 8px rgba(113, 113, 122, 0.5)'
        }}
      />
    </div>
  );
}
