/**
 * TableNode - Nodo de conexión a tabla
 * Estilo n8n con handles horizontales - Color: Azul (#3b82f6)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { ChartIcon } from '../Icons';

export default function TableNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const tables = data?.tables || [];
  
  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  const actionLabels = {
    read: 'Buscar',
    create: 'Crear',
    update: 'Actualizar',
    validate: 'Validar'
  };

  return (
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl transition-all ${
        selected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: selected ? '0 0 20px rgba(59, 130, 246, 0.3)' : '0 4px 20px rgba(0,0,0,0.4)'
      }}
    >
      {/* Handle entrada - izquierda */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-0 !-left-1.5"
        style={{ 
          background: '#3b82f6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
        }}
      />
      
      {/* Header compacto */}
      <div 
        className="px-3 py-2 flex items-center gap-2"
        style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.05))',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '16px 16px 0 0'
        }}
      >
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
          }}
        >
          <ChartIcon size="xs" />
        </div>
        <span className="text-xs font-semibold text-blue-400">Datos</span>
      </div>
      
      {/* Content compacto */}
      <div className="px-3 py-2 space-y-2">
        <select 
          className="w-full px-2 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none"
          style={{ 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.15)',
            color: '#93c5fd',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.3rem center',
            backgroundSize: '1em 1em',
            paddingRight: '1.5rem'
          }}
          value={data?.tableId || ''}
          onChange={(e) => updateNodeData('tableId', e.target.value)}
        >
          <option value="" style={{ background: '#18181b', color: '#71717a' }}>Tabla...</option>
          {tables.map(t => (
            <option key={t._id} value={t._id} style={{ background: '#18181b', color: 'white' }}>{t.name}</option>
          ))}
        </select>
        
        <div className="flex gap-1 flex-wrap">
          {['read', 'create', 'update'].map(action => (
            <button
              key={action}
              onClick={() => updateNodeData('action', action)}
              className={`px-2 py-1 rounded text-[10px] transition-all ${data?.action === action ? 'text-white' : 'text-blue-400/60 hover:text-blue-400'}`}
              style={{ 
                background: data?.action === action ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.08)',
                border: `1px solid ${data?.action === action ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`
              }}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
      </div>
      
      {/* Handle salida - derecha */}
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-0 !-right-1.5"
        style={{ 
          background: '#3b82f6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
        }}
      />
    </div>
  );
}
