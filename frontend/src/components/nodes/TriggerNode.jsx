/**
 * TriggerNode - Nodo de inicio del flujo
 * Color: Esmeralda (#10b981)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

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
  const tableName = data?.tableName || data?.table || 'Sin tabla';

  return (
    <div className={`min-w-[220px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-emerald-400 shadow-emerald-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(16, 185, 129, 0.15)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#10b981' }}>
          🚀
        </div>
        <div>
          <span className="text-sm font-semibold text-emerald-400">Inicio</span>
          <p className="text-[10px] text-emerald-400/60">Cuando sucede algo...</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Selector de Trigger */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            ¿Cuándo se activa?
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none"
            style={{ 
              background: '#18181b', 
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
            value={data?.trigger || 'create'}
            onChange={(e) => updateNodeData('trigger', e.target.value)}
          >
            <option value="create" style={{ background: '#18181b', color: 'white' }}>📝 Al CREAR registro</option>
            <option value="update" style={{ background: '#18181b', color: 'white' }}>✏️ Al ACTUALIZAR registro</option>
            <option value="delete" style={{ background: '#18181b', color: 'white' }}>🗑️ Al ELIMINAR registro</option>
            <option value="beforeCreate" style={{ background: '#18181b', color: 'white' }}>⚠️ ANTES de crear</option>
            <option value="query" style={{ background: '#18181b', color: 'white' }}>🔍 Al CONSULTAR</option>
            <option value="availability" style={{ background: '#18181b', color: 'white' }}>📅 Al preguntar DISPONIBILIDAD</option>
          </select>
        </div>
        
        {/* Mostrar tabla asociada */}
        <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Tabla
          </label>
          <div 
            className="px-3 py-2 rounded-lg text-sm"
            style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#10b981'
            }}
          >
            📋 {tableName}
          </div>
        </div>
      </div>
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#10b981', borderColor: '#0c0c0f' }}
      />
    </div>
  );
}
