/**
 * AvailabilityNode - Nodo de verificación de disponibilidad
 * Color: Cyan (#06b6d4)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export default function AvailabilityNode({ id, data, selected }) {
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
    <div className={`min-w-[240px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-cyan-400 shadow-cyan-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#06b6d4', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(6, 182, 212, 0.15)', borderBottom: '1px solid rgba(6, 182, 212, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#06b6d4' }}>
          📅
        </div>
        <div>
          <span className="text-sm font-semibold text-cyan-400">Disponibilidad</span>
          <p className="text-[10px] text-cyan-400/60">Verificar horarios</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Tabla de personal/recursos
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.staffTable || ''}
            onChange={(e) => updateNodeData('staffTable', e.target.value)}
          >
            <option value="" style={{ background: '#18181b', color: '#71717a' }}>Seleccionar tabla...</option>
            {tables.map(t => (
              <option key={t._id} value={t._id} style={{ background: '#18181b', color: 'white' }}>{t.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Verificar por
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/[0.02]" style={{ background: data?.checkDate !== false ? 'rgba(6, 182, 212, 0.1)' : 'transparent' }}>
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded"
                style={{ accentColor: '#06b6d4' }}
                checked={data?.checkDate !== false}
                onChange={(e) => updateNodeData('checkDate', e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'white' }}>📆 Fecha</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/[0.02]" style={{ background: data?.checkTime !== false ? 'rgba(6, 182, 212, 0.1)' : 'transparent' }}>
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded"
                style={{ accentColor: '#06b6d4' }}
                checked={data?.checkTime !== false}
                onChange={(e) => updateNodeData('checkTime', e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'white' }}>🕐 Hora</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/[0.02]" style={{ background: data?.checkService ? 'rgba(6, 182, 212, 0.1)' : 'transparent' }}>
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded"
                style={{ accentColor: '#06b6d4' }}
                checked={data?.checkService || false}
                onChange={(e) => updateNodeData('checkService', e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'white' }}>💼 Servicio</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Handles de salida - Disponible / Ocupado */}
      <div className="px-4 pb-4 flex justify-between items-center">
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            ✓ Libre
          </div>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="available" 
            className="!w-4 !h-4 !rounded-full !border-2 !relative !transform-none !left-0"
            style={{ background: '#22c55e', borderColor: '#0c0c0f', marginTop: '8px' }}
          />
        </div>
        <div className="flex flex-col items-center">
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            ✗ Ocupado
          </div>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="busy" 
            className="!w-4 !h-4 !rounded-full !border-2 !relative !transform-none !left-0"
            style={{ background: '#ef4444', borderColor: '#0c0c0f', marginTop: '8px' }}
          />
        </div>
      </div>
    </div>
  );
}
