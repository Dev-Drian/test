/**
 * ConditionNode - Nodo de condición Si/Entonces
 * Color: Ámbar (#f59e0b)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export default function ConditionNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  return (
    <div className={`min-w-[240px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-amber-400 shadow-amber-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#f59e0b', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#f59e0b' }}>
          🔀
        </div>
        <div>
          <span className="text-sm font-semibold text-amber-400">Decisión</span>
          <p className="text-[10px] text-amber-400/60">¿Cumple la condición?</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Tipo de condición
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.condition || 'exists'}
            onChange={(e) => updateNodeData('condition', e.target.value)}
          >
            <option value="exists" style={{ background: '#18181b', color: 'white' }}>✓ Si existe</option>
            <option value="not_exists" style={{ background: '#18181b', color: 'white' }}>✗ Si NO existe</option>
            <option value="equals" style={{ background: '#18181b', color: 'white' }}>= Si es igual a</option>
            <option value="greater" style={{ background: '#18181b', color: 'white' }}>&gt; Si es mayor que</option>
            <option value="less" style={{ background: '#18181b', color: 'white' }}>&lt; Si es menor que</option>
            <option value="available" style={{ background: '#18181b', color: 'white' }}>📅 Si está disponible</option>
          </select>
        </div>
        
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Campo a evaluar
          </label>
          <input 
            type="text" 
            placeholder="ej: stock, estado, fecha..."
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder-zinc-500"
            style={{ 
              background: '#18181b', 
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white'
            }}
            value={data?.field || ''}
            onChange={(e) => updateNodeData('field', e.target.value)}
          />
        </div>
        
        {(data?.condition === 'equals' || data?.condition === 'greater' || data?.condition === 'less') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
              Valor a comparar
            </label>
            <input 
              type="text" 
              placeholder="ej: 0, activo, VIP..."
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder-zinc-500"
              style={{ 
                background: '#18181b', 
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white'
              }}
              value={data?.value || ''}
              onChange={(e) => updateNodeData('value', e.target.value)}
            />
          </div>
        )}
      </div>
      
      {/* Handles de salida - Sí / No */}
      <div className="px-4 pb-4 flex justify-between items-center">
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            ✓ Sí
          </div>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="yes" 
            className="!w-4 !h-4 !rounded-full !border-2 !relative !transform-none !left-0"
            style={{ background: '#22c55e', borderColor: '#0c0c0f', marginTop: '8px' }}
          />
        </div>
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            ✗ No
          </div>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="no" 
            className="!w-4 !h-4 !rounded-full !border-2 !relative !transform-none !left-0"
            style={{ background: '#ef4444', borderColor: '#0c0c0f', marginTop: '8px' }}
          />
        </div>
      </div>
    </div>
  );
}
