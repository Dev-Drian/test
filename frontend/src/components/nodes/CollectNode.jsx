/**
 * CollectNode - Nodo para recopilar datos del usuario
 * Estilo n8n con handles horizontales - Color: Cyan (#06b6d4)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

// Icono de formulario
const FormIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

export default function CollectNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  const fields = data?.fields || [];

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
          <FormIcon />
        </div>
        <span className="text-xs font-semibold text-cyan-400">{data?.label || 'Recopilar'}</span>
      </div>
      
      {/* Content compacto */}
      <div className="px-3 py-2">
        {fields.length > 0 ? (
          <div className="space-y-1">
            {fields.slice(0, 3).map((field, i) => (
              <div 
                key={i}
                className="px-2 py-1 rounded text-[10px] flex items-center justify-between"
                style={{ background: 'rgba(6, 182, 212, 0.08)' }}
              >
                <span className="text-cyan-300 truncate">{field.label || field.key}</span>
                <span className="text-cyan-400/50 ml-1">{field.type || 'txt'}</span>
              </div>
            ))}
            {fields.length > 3 && (
              <p className="text-[10px] text-cyan-400/50 text-center">+{fields.length - 3} más</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-zinc-500 text-center py-1">Sin campos</p>
        )}
      </div>
      
      {/* Handle salida - derecha */}
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-0 !-right-1.5"
        style={{ 
          background: '#06b6d4',
          boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)'
        }}
      />
    </div>
  );
}
