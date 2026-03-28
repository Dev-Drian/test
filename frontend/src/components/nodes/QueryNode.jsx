/**
 * QueryNode - Nodo de búsqueda de datos
 * Diseño intuitivo para usuarios sin conocimientos técnicos
 */
import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { SearchIcon } from '../Icons';

export default function QueryNode({ data, selected }) {
  const [showHelp, setShowHelp] = useState(false);
  const { filterField, filterValueType, filterValueField, filterValueFixed, targetTableName, tables, targetTable, label, tablePlaceholder, filters } = data || {};
  
  const getFieldLabel = (fieldName) => {
    if (!fieldName) return '';
    const table = tables?.find(t => t._id === targetTable);
    const header = table?.headers?.find(h => h.key === fieldName);
    return header?.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  const valueDisplay = filterValueType === 'fixed' 
    ? (filterValueFixed || '?') 
    : (filterValueField ? getFieldLabel(filterValueField) : '?');
    
  const tableName = targetTableName || tablePlaceholder || 'Tabla';
  const hasTemplateFilters = filters && filters.length > 0;
  const hasFilter = filterField || hasTemplateFilters;

  return (
    <div 
      className={`min-w-[200px] max-w-[250px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-blue-400/60 shadow-2xl shadow-blue-500/30 scale-[1.02]' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-blue-500/15 hover:scale-[1.01]'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1f2e, #141820)',
        border: `1px solid ${selected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}`
      }}
    >
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !rounded-full !border-2 !-left-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
          borderColor: '#1a1f2e',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
        }}
      />
      
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
          borderBottom: '1px solid rgba(59, 130, 246, 0.12)' 
        }}
      >
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
            }}
          >
            <SearchIcon size="md" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-300 truncate">{label || 'Buscar'}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
              className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center hover:bg-blue-500/30 transition-colors"
            >
              ?
            </button>
          </div>
          <span className="text-[11px] text-blue-500/70">Consulta datos</span>
        </div>
      </div>

      {/* Tooltip */}
      {showHelp && (
        <div 
          className="absolute left-full ml-2 top-0 w-56 p-3 rounded-xl text-xs z-50"
          style={{ background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          <p className="text-blue-300 font-medium mb-1">Consulta</p>
          <p className="text-slate-400 leading-relaxed">
            Busca registros en una tabla. Si <strong className="text-white">encuentra datos</strong> sigue por Si, si <strong className="text-white">no encuentra</strong> sigue por No.
          </p>
        </div>
      )}
      
      {/* Contenido */}
      <div className="p-4 space-y-3">
        {/* Tabla donde buscar */}
        <div 
          className="px-3 py-2.5 rounded-xl text-center"
          style={{ 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.15)'
          }}
        >
          <span className="text-[10px] text-slate-500 block mb-0.5">Buscar en</span>
          <span className="text-sm font-semibold text-blue-300">{tableName}</span>
        </div>
        
        {/* Filtros */}
        {hasFilter && (
          <div 
            className="px-3 py-2 rounded-xl space-y-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(59, 130, 246, 0.2)' }}
          >
            <span className="text-[10px] text-slate-500 block">Donde:</span>
            
            {filterField && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium">
                  {getFieldLabel(filterField)}
                </span>
                <span className="text-amber-400 font-bold">=</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                  {valueDisplay}
                </span>
              </div>
            )}
            
            {hasTemplateFilters && filters.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-blue-300">{f.field}</span>
                <span className="text-amber-400">{f.operator}</span>
                <span className="text-amber-300">{f.value}</span>
              </div>
            ))}
          </div>
        )}
        
        {!hasFilter && (
          <p className="text-[11px] text-slate-500 text-center py-2">
            Configura los filtros en el panel lateral →
          </p>
        )}
      </div>
      
      {/* Indicadores de resultado */}
      <div className="flex rounded-b-2xl overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div 
          className="flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 group cursor-default"
          style={{ background: 'rgba(16, 185, 129, 0.08)' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
          <span className="text-[11px] text-emerald-400 font-medium">Encontró</span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.04)' }} />
        <div 
          className="flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 group cursor-default"
          style={{ background: 'rgba(239, 68, 68, 0.08)' }}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 group-hover:scale-125 transition-transform" />
          <span className="text-[11px] text-red-400 font-medium">No encontró</span>
        </div>
      </div>
      
      {/* Handles de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="true"
        className="!w-4 !h-4 !rounded-full !border-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #10b981, #059669)', 
          borderColor: '#1a1f2e',
          left: '25%',
          bottom: -8,
          boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="false"
        className="!w-4 !h-4 !rounded-full !border-2 hover:!scale-125 transition-transform"
        style={{ 
          background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
          borderColor: '#1a1f2e',
          left: '75%',
          bottom: -8,
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)'
        }}
      />
    </div>
  );
}
