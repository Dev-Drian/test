/**
 * TableNode - Nodo de conexión a tabla
 * Color: Azul (#3b82f6)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

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

  return (
    <div className={`min-w-[220px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-blue-400 shadow-blue-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#3b82f6', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(59, 130, 246, 0.15)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#3b82f6' }}>
          📊
        </div>
        <div>
          <span className="text-sm font-semibold text-blue-400">Datos</span>
          <p className="text-[10px] text-blue-400/60">Buscar o guardar info</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            ¿Qué tabla usar?
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.tableId || ''}
            onChange={(e) => updateNodeData('tableId', e.target.value)}
          >
            <option value="" style={{ background: '#18181b', color: '#71717a' }}>Seleccionar tabla...</option>
            {tables.map(t => (
              <option key={t._id} value={t._id} style={{ background: '#18181b', color: 'white' }}>{t.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            ¿Qué hacer?
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.action || 'read'}
            onChange={(e) => updateNodeData('action', e.target.value)}
          >
            <option value="read" style={{ background: '#18181b', color: 'white' }}>🔍 Buscar datos</option>
            <option value="create" style={{ background: '#18181b', color: 'white' }}>➕ Crear registro</option>
            <option value="update" style={{ background: '#18181b', color: 'white' }}>✏️ Actualizar datos</option>
            <option value="validate" style={{ background: '#18181b', color: 'white' }}>✅ Validar relación</option>
          </select>
        </div>
      </div>
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#3b82f6', borderColor: '#0c0c0f' }}
      />
    </div>
  );
}
