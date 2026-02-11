/**
 * ActionNode - Nodo de acción automática
 * Color: Púrpura (#8b5cf6)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export default function ActionNode({ id, data, selected }) {
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
    <div className={`min-w-[220px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-purple-400 shadow-purple-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#8b5cf6', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(139, 92, 246, 0.15)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#8b5cf6' }}>
          ⚡
        </div>
        <div>
          <span className="text-sm font-semibold text-purple-400">Acción</span>
          <p className="text-[10px] text-purple-400/60">Hacer algo automático</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            ¿Qué acción ejecutar?
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.action || 'auto_create'}
            onChange={(e) => updateNodeData('action', e.target.value)}
          >
            <option value="auto_create" style={{ background: '#18181b', color: 'white' }}>➕ Crear registro automático</option>
            <option value="auto_assign" style={{ background: '#18181b', color: 'white' }}>🎯 Asignar automáticamente</option>
            <option value="set_value" style={{ background: '#18181b', color: 'white' }}>✏️ Establecer un valor</option>
            <option value="decrement" style={{ background: '#18181b', color: 'white' }}>➖ Restar cantidad</option>
            <option value="increment" style={{ background: '#18181b', color: 'white' }}>➕ Sumar cantidad</option>
            <option value="send_notification" style={{ background: '#18181b', color: 'white' }}>🔔 Enviar notificación</option>
            <option value="send_email" style={{ background: '#18181b', color: 'white' }}>📧 Enviar email</option>
          </select>
        </div>
        
        {(data?.action === 'set_value' || data?.action === 'decrement' || data?.action === 'increment') && (
          <>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
                ¿Qué campo modificar?
              </label>
              <input 
                type="text" 
                placeholder="ej: stock, estado, puntos..."
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-zinc-500"
                style={{ 
                  background: '#18181b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white'
                }}
                value={data?.field || ''}
                onChange={(e) => updateNodeData('field', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
                {data?.action === 'set_value' ? 'Nuevo valor' : 'Cantidad'}
              </label>
              <input 
                type="text" 
                placeholder={data?.action === 'set_value' ? 'ej: confirmado, 100...' : 'ej: 1, 5, 10...'}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-zinc-500"
                style={{ 
                  background: '#18181b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white'
                }}
                value={data?.value || ''}
                onChange={(e) => updateNodeData('value', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#8b5cf6', borderColor: '#0c0c0f' }}
      />
    </div>
  );
}
