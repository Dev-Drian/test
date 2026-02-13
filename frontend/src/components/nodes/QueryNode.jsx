/**
 * QueryNode - Nodo de consulta simplificado
 * Dos salidas: Sí encuentra / No encuentra
 */
import { Handle, Position } from '@xyflow/react';
import { SearchIcon } from '../Icons';

export default function QueryNode({ data, selected }) {
  const { filterField, filterValueType, filterValueField, filterValueFixed, targetTableName, tables, targetTable, label } = data || {};
  
  // Obtener label del campo
  const getFieldLabel = (fieldName) => {
    if (!fieldName) return '';
    const table = tables?.find(t => t._id === targetTable);
    const header = table?.headers?.find(h => h.key === fieldName);
    return header?.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  // Valor a mostrar
  const valueDisplay = filterValueType === 'fixed' 
    ? (filterValueFixed || '?') 
    : (filterValueField ? getFieldLabel(filterValueField) : '?');

  return (
    <div 
      className={`min-w-[200px] rounded-xl shadow-xl transition-all ${selected ? 'ring-2 ring-blue-400' : ''}`}
      style={{ background: '#0c0c0f' }}
    >
      {/* Entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
          width: 14, 
          height: 14, 
          background: '#3b82f6', 
          border: '2px solid #0c0c0f',
          top: -7
        }}
      />
      
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(59, 130, 246, 0.15)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-white"
          style={{ background: '#3b82f6' }}
        >
          <SearchIcon size="sm" />
        </div>
        <span className="text-sm font-semibold text-blue-400">{label || 'Consulta'}</span>
      </div>
      
      {/* Contenido */}
      <div className="p-4 space-y-2 text-center">
        <div>
          <span className="text-[10px] text-zinc-500">Buscar en</span>
          <p className="text-sm font-semibold text-blue-400">{targetTableName || 'Tabla'}</p>
        </div>
        
        {filterField && (
          <div 
            className="px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
          >
            <span className="text-blue-300">{getFieldLabel(filterField)}</span>
            <span className="text-amber-400 font-bold mx-1">=</span>
            <span className="text-amber-300">{valueDisplay}</span>
          </div>
        )}
      </div>
      
      {/* Salidas Sí / No */}
      <div className="flex" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-1 py-3 text-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
          <span className="text-xs text-emerald-400 font-medium">✓ Sí</span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 py-3 text-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
          <span className="text-xs text-red-400 font-medium">✗ No</span>
        </div>
      </div>
      
      {/* Handle Sí (izquierda) */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="yes"
        style={{ 
          width: 12, 
          height: 12, 
          background: '#10b981', 
          border: '2px solid #0c0c0f',
          left: '25%',
          bottom: -6
        }}
      />
      
      {/* Handle No (derecha) */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="no"
        style={{ 
          width: 12, 
          height: 12, 
          background: '#ef4444', 
          border: '2px solid #0c0c0f',
          left: '75%',
          bottom: -6
        }}
      />
    </div>
  );
}
