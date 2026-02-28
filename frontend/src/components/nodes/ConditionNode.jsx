/**
 * ConditionNode - Nodo de condición Si/Entonces
 * Color: Ámbar (#f59e0b)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { SplitIcon, CalendarIcon } from '../Icons';

/**
 * Convierte operador a texto legible
 */
function getOperatorDisplay(operator) {
  const operators = {
    '==': 'es igual a',
    '===': 'es igual a',
    '!=': 'es diferente de',
    '!==': 'es diferente de',
    '>': 'es mayor que',
    '>=': 'es mayor o igual a',
    '<': 'es menor que',
    '<=': 'es menor o igual a',
  };
  return operators[operator] || operator;
}

/**
 * Convierte nombre de campo técnico a nombre legible
 * productoData.stock -> "Stock del producto"
 * total -> "Total"
 * estadoPago -> "Estado de pago"
 */
function getFieldDisplayName(fieldName) {
  if (!fieldName) return 'Campo';
  
  // Mapeo de campos conocidos
  const fieldMappings = {
    // Campos simples
    'total': 'Total',
    'cantidad': 'Cantidad',
    'precio': 'Precio',
    'stock': 'Stock',
    'nombre': 'Nombre',
    'estado': 'Estado',
    'estadoPago': 'Estado de pago',
    'estadoTarea': 'Estado de tarea',
    'estadoFactura': 'Estado de factura',
    'estadoCampana': 'Estado de campaña',
    'tipo': 'Tipo',
    'fecha': 'Fecha',
    'fechaVencimiento': 'Fecha de vencimiento',
    'prioridad': 'Prioridad',
    'cliente': 'Cliente',
    'producto': 'Producto',
    'email': 'Email',
    'telefono': 'Teléfono',
    'count': 'Cantidad de registros',
    
    // Campos con acceso a variable (productoData.stock)
    'productoData.stock': 'Stock del producto',
    'productoData.precio': 'Precio del producto',
    'productoData.nombre': 'Nombre del producto',
    'clienteData.tipo': 'Tipo de cliente',
    'clienteData.nombre': 'Nombre del cliente',
    'ventaData.total': 'Total de la venta',
  };
  
  // Buscar en el mapeo
  if (fieldMappings[fieldName]) {
    return fieldMappings[fieldName];
  }
  
  // Si tiene punto, intentar hacer legible automáticamente
  if (fieldName.includes('.')) {
    const parts = fieldName.split('.');
    const lastPart = parts[parts.length - 1];
    const firstPart = parts[0].replace(/Data$/, '');
    
    // Convertir camelCase a palabras separadas
    const fieldReadable = lastPart.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    const sourceReadable = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    
    return `${fieldReadable.charAt(0).toUpperCase() + fieldReadable.slice(1)} del ${sourceReadable.toLowerCase()}`;
  }
  
  // Convertir camelCase a palabras separadas
  const readable = fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return readable;
}

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

  // Detectar si es modo vista (viene de flujo guardado con operator)
  const isViewMode = data?.operator !== undefined;

  return (
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-amber-400/60 shadow-2xl shadow-amber-500/20' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-amber-500/10'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(245, 158, 11, 0.2)'
      }}
    >
      {/* Handle de entrada - Estilo n8n */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !rounded-full !border-2 !-left-1.5"
        style={{ 
          background: '#f59e0b', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)'
        }}
      />
      
      {/* Header compacto estilo n8n */}
      <div 
        className="px-3 py-2.5 flex items-center gap-2.5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.05))',
          borderBottom: '1px solid rgba(245, 158, 11, 0.15)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
          }}
        >
          <SplitIcon size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-amber-300 block truncate">
            {data?.label || 'Decisión'}
          </span>
          <span className="text-[10px] text-amber-500/70">Condición</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Modo Vista (flujo guardado) */}
        {isViewMode ? (
          <div 
            className="px-2.5 py-2 rounded-xl space-y-1"
            style={{ 
              background: 'rgba(245, 158, 11, 0.08)', 
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-amber-400">Si</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 truncate max-w-[60px]">
                {getFieldDisplayName(data.field)}
              </span>
              <span className="text-amber-400/70">
                {getOperatorDisplay(data.operator)}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 truncate max-w-[50px]">
                {String(data.value)}
              </span>
            </div>
          </div>
        ) : (
          /* Modo Edición */
          <>
            <select 
              className="w-full px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all cursor-pointer"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#d1d5db'
              }}
              value={data?.condition || 'exists'}
              onChange={(e) => updateNodeData('condition', e.target.value)}
            >
              <option value="exists">✓ Si existe</option>
              <option value="not_exists">✗ Si NO existe</option>
              <option value="equals">= Es igual a</option>
              <option value="greater">&gt; Mayor que</option>
              <option value="less">&lt; Menor que</option>
            </select>
            
            <input 
              type="text" 
              placeholder="Campo..."
              className="w-full px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-slate-600"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white'
              }}
              value={data?.field || ''}
              onChange={(e) => updateNodeData('field', e.target.value)}
            />
            
            {(data?.condition === 'equals' || data?.condition === 'greater' || data?.condition === 'less') && (
              <input 
                type="text" 
                placeholder="Valor..."
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-slate-600"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white'
                }}
                value={data?.value || ''}
                onChange={(e) => updateNodeData('value', e.target.value)}
              />
            )}
          </>
        )}
      </div>
      
      {/* Salidas Sí / No */}
      <div className="flex rounded-b-2xl overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div 
          className="flex-1 py-2 text-center"
          style={{ background: 'rgba(34, 197, 94, 0.1)' }}
        >
          <span className="text-[10px] text-emerald-400 font-medium">✓ Sí</span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div 
          className="flex-1 py-2 text-center"
          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
        >
          <span className="text-[10px] text-red-400 font-medium">✗ No</span>
        </div>
      </div>
      
      {/* Handle Sí (abajo izquierda) */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ 
          background: '#22c55e', 
          borderColor: '#1a1a24',
          left: '25%',
          bottom: -6,
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
        }}
      />
      
      {/* Handle No (abajo derecha) */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{ 
          background: '#ef4444', 
          borderColor: '#1a1a24',
          left: '75%',
          bottom: -6,
          boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
        }}
      />
    </div>
  );
}
