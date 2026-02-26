/**
 * CollectNode - Nodo para recopilar datos del usuario
 * Color: Cyan (#06b6d4)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

// Icono de formulario
const FormIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#06b6d4' }}>
          <FormIcon />
        </div>
        <div>
          <span className="text-sm font-semibold text-cyan-400">{data?.label || 'Recopilar datos'}</span>
          <p className="text-[10px] text-cyan-400/60">Solicitar información</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {fields.length > 0 ? (
          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-wider" style={{ color: '#71717a' }}>
              Campos a solicitar
            </label>
            <div className="space-y-1.5">
              {fields.map((field, i) => (
                <div 
                  key={i}
                  className="px-3 py-2 rounded-lg text-sm flex items-center justify-between"
                  style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                >
                  <span className="text-cyan-300">{field.label || field.key}</span>
                  <span className="text-[10px] text-cyan-400/60 bg-cyan-500/10 px-2 py-0.5 rounded">
                    {field.type || 'texto'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-500">Sin campos configurados</p>
          </div>
        )}
      </div>
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#06b6d4', borderColor: '#0c0c0f' }}
      />
    </div>
  );
}
