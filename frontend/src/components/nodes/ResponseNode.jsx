/**
 * ResponseNode - Nodo de respuesta al usuario
 * Color: Rosa (#ec4899)
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

  return (
    <div className={`min-w-[240px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-pink-400 shadow-pink-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#ec4899', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(236, 72, 153, 0.15)', borderBottom: '1px solid rgba(236, 72, 153, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" style={{ background: '#ec4899' }}>
          <ChatIcon size="sm" />
        </div>
        <div>
          <span className="text-sm font-semibold text-pink-400">Respuesta</span>
          <p className="text-[10px] text-pink-400/60">Mensaje al usuario</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Tipo de respuesta
          </label>
          <select 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all cursor-pointer appearance-none"
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
            value={data?.type || 'success'}
            onChange={(e) => updateNodeData('type', e.target.value)}
          >
            <option value="success" style={{ background: '#18181b', color: 'white' }}>Mensaje de éxito</option>
            <option value="error" style={{ background: '#18181b', color: 'white' }}>Mensaje de error</option>
            <option value="options" style={{ background: '#18181b', color: 'white' }}>Mostrar opciones</option>
            <option value="question" style={{ background: '#18181b', color: 'white' }}>Hacer pregunta</option>
            <option value="info" style={{ background: '#18181b', color: 'white' }}>Información</option>
            <option value="custom" style={{ background: '#18181b', color: 'white' }}>Personalizado</option>
          </select>
        </div>
        
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
            Mensaje
          </label>
          <textarea 
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'white'
            }}
            placeholder="Escribe el mensaje que verá el usuario..."
            rows={3}
            value={data?.message || ''}
            onChange={(e) => updateNodeData('message', e.target.value)}
          />
        </div>
        
        {/* Preview del mensaje */}
        {data?.message && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#71717a' }}>Vista previa</p>
            <p className="text-sm text-pink-300">"{data.message}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
