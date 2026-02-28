/**
 * AvailabilityNode - Nodo de verificación de disponibilidad
 * Estilo n8n con handle entrada izquierda y salidas duales
 * Color: Cyan (#06b6d4)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { CalendarIcon, ClockIcon, BriefcaseIcon } from '../Icons';

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
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl transition-all ${
        selected ? 'ring-2 ring-cyan-400' : ''
      }`}
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        boxShadow: selected ? '0 0 20px rgba(6, 182, 212, 0.3)' : '0 4px 20px rgba(0,0,0,0.4)'
      }}
    >
      {/* Handle entrada - izquierda */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-0 !-left-1.5"
        style={{ 
          background: '#06b6d4',
          boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)'
        }}
      />
      
      {/* Header compacto */}
      <div 
        className="px-3 py-2 flex items-center gap-2"
        style={{ 
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(6, 182, 212, 0.05))',
          borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
          borderRadius: '16px 16px 0 0'
        }}
      >
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
          style={{ 
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.4)'
          }}
        >
          <CalendarIcon size="xs" />
        </div>
        <span className="text-xs font-semibold text-cyan-400">Disponibilidad</span>
      </div>
      
      {/* Content compacto */}
      <div className="px-3 py-2 space-y-2">
        <select 
          className="w-full px-2 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer appearance-none"
          style={{ 
            background: 'rgba(6, 182, 212, 0.08)', 
            border: '1px solid rgba(6, 182, 212, 0.15)',
            color: '#67e8f9',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2306b6d4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.3rem center',
            backgroundSize: '1em 1em',
            paddingRight: '1.5rem'
          }}
          value={data?.staffTable || ''}
          onChange={(e) => updateNodeData('staffTable', e.target.value)}
        >
          <option value="" style={{ background: '#18181b', color: '#71717a' }}>Tabla...</option>
          {tables.map(t => (
            <option key={t._id} value={t._id} style={{ background: '#18181b', color: 'white' }}>{t.name}</option>
          ))}
        </select>
        
        {/* Checkboxes compactos */}
        <div className="flex gap-1.5 flex-wrap">
          <label 
            className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all text-[10px]"
            style={{ 
              background: data?.checkDate !== false ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.05)',
              border: `1px solid ${data?.checkDate !== false ? 'rgba(6, 182, 212, 0.3)' : 'transparent'}`
            }}
          >
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded"
              style={{ accentColor: '#06b6d4' }}
              checked={data?.checkDate !== false}
              onChange={(e) => updateNodeData('checkDate', e.target.checked)}
            />
            <span className="text-cyan-300">Fecha</span>
          </label>
          <label 
            className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all text-[10px]"
            style={{ 
              background: data?.checkTime !== false ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.05)',
              border: `1px solid ${data?.checkTime !== false ? 'rgba(6, 182, 212, 0.3)' : 'transparent'}`
            }}
          >
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded"
              style={{ accentColor: '#06b6d4' }}
              checked={data?.checkTime !== false}
              onChange={(e) => updateNodeData('checkTime', e.target.checked)}
            />
            <span className="text-cyan-300">Hora</span>
          </label>
        </div>
      </div>
      
      {/* Salidas duales en la parte inferior */}
      <div className="px-3 pb-2 flex justify-between items-center text-[9px]">
        <span className="text-emerald-400">✓ Libre</span>
        <span className="text-red-400">✗ Ocupado</span>
      </div>
      
      {/* Handle Libre - 25% desde la izquierda */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="available"
        className="!w-3 !h-3 !rounded-full !border-0"
        style={{ 
          left: '25%',
          background: '#22c55e',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
        }}
      />
      
      {/* Handle Ocupado - 75% desde la izquierda */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="busy"
        className="!w-3 !h-3 !rounded-full !border-0"
        style={{ 
          left: '75%',
          background: '#ef4444',
          boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
        }}
      />
    </div>
  );
}
