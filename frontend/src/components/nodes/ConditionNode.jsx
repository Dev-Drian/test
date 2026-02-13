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
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#f59e0b' }}>
          <SplitIcon size="sm" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-amber-400">Decisión</span>
          <p className="text-[10px] text-amber-400/60">¿Cumple la condición?</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Label si existe */}
        {data?.label && (
          <div className="text-sm font-medium text-white">
            {data.label}
          </div>
        )}
        
        {/* Modo Vista (flujo guardado) */}
        {isViewMode ? (
          <div className="px-3 py-3 rounded-lg space-y-2"
            style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-300 text-sm">Si</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">
                {getFieldDisplayName(data.field)}
              </span>
              <span className="text-amber-300 text-xs">
                {getOperatorDisplay(data.operator)}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                {String(data.value)}
              </span>
            </div>
          </div>
        ) : (
          /* Modo Edición */
          <>
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
                <option value="exists">✓ Si existe</option>
                <option value="not_exists">✗ Si NO existe</option>
                <option value="equals">= Si es igual a</option>
                <option value="greater">&gt; Si es mayor que</option>
                <option value="less">&lt; Si es menor que</option>
                <option value="available">▷ Si está disponible</option>
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
          </>
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
