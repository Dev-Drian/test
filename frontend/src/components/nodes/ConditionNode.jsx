/**
 * ConditionNode - Nodo de decisión Si/No
 * Diseño intuitivo para usuarios sin conocimientos técnicos
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { SplitIcon } from '../Icons';

// Condiciones con descripciones amigables
const CONDITION_OPTIONS = [
  { value: 'exists', label: 'Existe', desc: 'Si el dato tiene valor', icon: 'check' },
  { value: 'not_exists', label: 'No existe', desc: 'Si esta vacio', icon: 'x' },
  { value: 'equals', label: 'Es igual a', desc: 'Comparar valores', icon: '=' },
  { value: 'greater', label: 'Mayor que', desc: 'Numeros mayores', icon: '>' },
  { value: 'less', label: 'Menor que', desc: 'Numeros menores', icon: '<' },
  { value: 'contains', label: 'Contiene', desc: 'Buscar texto', icon: '~' },
];

function getOperatorDisplay(operator) {
  const operators = {
    '==': 'es igual a',
    '===': 'es igual a',
    '!=': 'es diferente de',
    '!==': 'es diferente de',
    '>': 'es mayor que',
    '>=': 'es mayor o igual',
    '<': 'es menor que',
    '<=': 'es menor o igual',
    'contains': 'contiene',
  };
  return operators[operator] || operator;
}

function getFieldDisplayName(fieldName) {
  if (!fieldName) return 'Campo';
  const fieldMappings = {
    'total': 'Total', 'cantidad': 'Cantidad', 'precio': 'Precio', 'stock': 'Stock',
    'nombre': 'Nombre', 'estado': 'Estado', 'estadoPago': 'Estado de pago',
    'tipo': 'Tipo', 'fecha': 'Fecha', 'prioridad': 'Prioridad',
    'cliente': 'Cliente', 'producto': 'Producto', 'count': 'Cantidad',
  };
  if (fieldMappings[fieldName]) return fieldMappings[fieldName];
  if (fieldName.includes('.')) {
    const parts = fieldName.split('.');
    const lastPart = parts[parts.length - 1];
    return fieldMappings[lastPart] || lastPart;
  }
  return fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

export default function ConditionNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [showHelp, setShowHelp] = useState(false);

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  const isViewMode = data?.operator !== undefined;
  const currentCondition = CONDITION_OPTIONS.find(c => c.value === data?.condition) || CONDITION_OPTIONS[0];

  return (
    <div 
      className={`min-w-[200px] max-w-[240px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-amber-400/60 shadow-2xl shadow-amber-500/30 scale-[1.02]' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-amber-500/15 hover:scale-[1.01]'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1f1f2e, #18181f)',
        border: `1px solid ${selected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.15)'}`
      }}
    >
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !rounded-full !border-2 !-left-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
          borderColor: '#1f1f2e',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)'
        }}
      />
      
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
          borderBottom: '1px solid rgba(245, 158, 11, 0.12)' 
        }}
      >
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
            }}
          >
            <SplitIcon size="md" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-300 truncate">
              {data?.label || 'Decision'}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
              className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center hover:bg-amber-500/30 transition-colors"
            >
              ?
            </button>
          </div>
          <span className="text-[11px] text-amber-500/70">Bifurca el flujo</span>
        </div>
      </div>

      {/* Tooltip */}
      {showHelp && (
        <div 
          className="absolute left-full ml-2 top-0 w-52 p-3 rounded-xl text-xs z-50"
          style={{ background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          <p className="text-amber-300 font-medium mb-1">Condicion</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Evalua un dato y <strong className="text-white">divide el flujo</strong> en dos caminos: uno si se cumple (Si) y otro si no (No).
          </p>
        </div>
      )}
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {isViewMode ? (
          /* Vista resumida */
          <div 
            className="px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
          >
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-amber-400 font-medium">Si</span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-medium">
                {getFieldDisplayName(data.field)}
              </span>
              <span className="text-amber-400/70">{getOperatorDisplay(data.operator)}</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">
                {String(data.value)}
              </span>
            </div>
          </div>
        ) : (
          /* Modo edición intuitivo */
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 block">
                ¿Qué verificar?
              </label>
              <select 
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer"
                style={{ background: '#18181f', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}
                value={data?.condition || 'exists'}
                onChange={(e) => updateNodeData('condition', e.target.value)}
              >
                {CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#18181f' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5 block">
                Campo a evaluar
              </label>
              <input 
                type="text" 
                placeholder="Ej: stock, total, estado..."
                className="w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder-slate-600"
                style={{ background: '#18181f', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f1f5f9' }}
                value={data?.field || ''}
                onChange={(e) => updateNodeData('field', e.target.value)}
              />
            </div>
            
            {['equals', 'greater', 'less', 'contains'].includes(data?.condition) && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5 block">
                  Comparar con
                </label>
                <input 
                  type="text" 
                  placeholder="Escribe el valor..."
                  className="w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder-slate-600"
                  style={{ background: '#18181f', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f1f5f9' }}
                  value={data?.value || ''}
                  onChange={(e) => updateNodeData('value', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Indicadores de salida Sí/No */}
      <div className="flex rounded-b-2xl overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div 
          className="flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 group cursor-default"
          style={{ background: 'rgba(34, 197, 94, 0.08)' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
          <span className="text-[11px] text-emerald-400 font-medium">Sí, cumple</span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.04)' }} />
        <div 
          className="flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 group cursor-default"
          style={{ background: 'rgba(239, 68, 68, 0.08)' }}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 group-hover:scale-125 transition-transform" />
          <span className="text-[11px] text-red-400 font-medium">No cumple</span>
        </div>
      </div>
      
      {/* Handles de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="true"
        className="!w-4 !h-4 !rounded-full !border-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
          borderColor: '#1f1f2e',
          left: '25%',
          bottom: -8,
          boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="false"
        className="!w-4 !h-4 !rounded-full !border-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
          borderColor: '#1f1f2e',
          left: '75%',
          bottom: -8,
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)'
        }}
      />
    </div>
  );
}
