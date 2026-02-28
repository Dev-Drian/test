/**
 * QueryNode - Nodo de consulta simplificado (Estilo n8n)
 * Dos salidas: Sí encuentra / No encuentra
 * Compatible con plantillas (tablePlaceholder) y sistema (targetTable)
 */
import { Handle, Position } from '@xyflow/react';
import { SearchIcon } from '../Icons';

export default function QueryNode({ data, selected }) {
  const { filterField, filterValueType, filterValueField, filterValueFixed, targetTableName, tables, targetTable, label, tablePlaceholder, filters, operation } = data || {};
  
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
    
  // Nombre de tabla (sistema o plantilla)
  const tableName = targetTableName || tablePlaceholder || 'Tabla';
  
  // Mostrar filtros de plantilla si existen
  const hasTemplateFilters = filters && filters.length > 0;

  return (
    <div 
      className={`min-w-[180px] max-w-[220px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-blue-400/60 shadow-2xl shadow-blue-500/20' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-blue-500/10'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}
    >
      {/* Handle de entrada - Estilo n8n */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !rounded-full !border-2 !-left-1.5"
        style={{ 
          background: '#3b82f6', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
        }}
      />
      
      {/* Header compacto estilo n8n */}
      <div 
        className="px-3 py-2.5 flex items-center gap-2.5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.05))',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
        >
          <SearchIcon size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-blue-300 block truncate">{label || 'Consulta'}</span>
          <span className="text-[10px] text-blue-500/70">Buscar datos</span>
        </div>
      </div>
      
      {/* Contenido */}
      <div className="p-3 space-y-2">
        <div 
          className="px-2.5 py-1.5 rounded-xl text-[11px] text-center"
          style={{ 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.15)',
            color: '#93c5fd'
          }}
        >
          En <span className="font-semibold text-blue-300">{tableName}</span>
        </div>
        
        {/* Filtros del sistema */}
        {filterField && (
          <div 
            className="px-2 py-1 rounded-lg text-[10px] flex items-center gap-1"
            style={{ background: 'rgba(59, 130, 246, 0.06)' }}
          >
            <span className="text-blue-300 truncate">{getFieldLabel(filterField)}</span>
            <span className="text-amber-400">=</span>
            <span className="text-amber-300 truncate">{valueDisplay}</span>
          </div>
        )}
        
        {/* Filtros de plantilla */}
        {hasTemplateFilters && (
          <div className="space-y-1">
            {filters.slice(0, 2).map((f, i) => (
              <div 
                key={i}
                className="px-2 py-1 rounded-lg text-[10px] flex items-center gap-1"
                style={{ background: 'rgba(59, 130, 246, 0.06)' }}
              >
                <span className="text-blue-300 truncate">{f.field}</span>
                <span className="text-slate-500">{f.operator}</span>
                <span className="text-amber-300 truncate">{f.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Salidas Sí / No */}
      <div className="flex rounded-b-2xl overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div 
          className="flex-1 py-2 text-center"
          style={{ background: 'rgba(16, 185, 129, 0.1)' }}
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
          background: '#10b981', 
          borderColor: '#1a1a24',
          left: '25%',
          bottom: -6,
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
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
