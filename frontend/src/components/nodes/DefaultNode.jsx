/**
 * DefaultNode - Nodo por defecto para tipos no reconocidos
 * Evita que aparezcan bloques blancos vacíos
 */
import { Handle, Position } from '@xyflow/react';

export default function DefaultNode({ data, selected }) {
  return (
    <div 
      className={`min-w-[180px] rounded-xl shadow-xl transition-all ${
        selected ? 'ring-2 ring-zinc-400' : ''
      }`}
      style={{ background: '#0c0c0f' }}
    >
      {/* Entrada */}
      <Handle 
        type="target" 
        position={Position.Top}
        style={{ 
          width: 14, 
          height: 14, 
          background: '#71717a', 
          border: '2px solid #0c0c0f',
          top: -7
        }}
      />
      
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(113, 113, 122, 0.15)', borderBottom: '1px solid rgba(113, 113, 122, 0.2)' }}
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-white"
          style={{ background: '#71717a' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-zinc-400">{data?.label || 'Nodo'}</span>
      </div>
      
      {/* Contenido */}
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">
          {data?.type ? `Tipo: ${data.type}` : 'Nodo sin configurar'}
        </p>
      </div>
      
      {/* Salida */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        style={{ 
          width: 14, 
          height: 14, 
          background: '#71717a', 
          border: '2px solid #0c0c0f',
          bottom: -7
        }}
      />
    </div>
  );
}
