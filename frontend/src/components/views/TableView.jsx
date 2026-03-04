import { useState, useMemo, useRef, useEffect } from 'react';

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  sort: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>,
  sortAsc: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>,
  sortDesc: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" /></svg>,
  chevronLeft: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>,
  chevronRight: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>,
  expand: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  filter: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  download: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  rows: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
  columns: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  eye: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  eyeOff: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>,
  stats: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Detectar tipo de dato para mejor formateo
const detectType = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'email';
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^\+?\d{8,15}$/.test(value.replace(/[\s-]/g, ''))) return 'phone';
    if (value.length > 100) return 'text-long';
  }
  if (typeof value === 'object') return 'object';
  return 'string';
};

export default function TableView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedRow, setSelectedRow] = useState(null);
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const columnMenuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determinar columnas a mostrar
  const allColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sample = data[0];
    const excludedFields = ['_id', '_rev', 'createdAt', 'updatedAt', 'tableId', 'table_id', 'workspaceId', 'workspace_id'];
    const allKeys = Object.keys(sample).filter(key => 
      !key.startsWith('_') && !excludedFields.includes(key)
    );
    
    const fieldMap = meta?.fieldMap || view?.fieldMap || {};
    const mappedFields = Object.values(fieldMap).filter(Boolean);
    
    if (mappedFields.length > 0) {
      const orderedKeys = [...new Set([...mappedFields, ...allKeys])];
      return orderedKeys.filter(key => allKeys.includes(key));
    }
    
    return allKeys;
  }, [data, meta, view]);

  // Columnas visibles
  const columns = useMemo(() => {
    return allColumns.filter(col => !hiddenColumns.has(col));
  }, [allColumns, hiddenColumns]);

  // Valores únicos por columna (para filtros)
  const uniqueValues = useMemo(() => {
    if (!data) return {};
    const values = {};
    allColumns.forEach(col => {
      const set = new Set();
      data.forEach(row => {
        if (row[col] !== null && row[col] !== undefined) {
          set.add(String(row[col]));
        }
      });
      values[col] = Array.from(set).sort().slice(0, 50); // Max 50 valores
    });
    return values;
  }, [data, allColumns]);

  // Estadísticas por columna
  const columnStats = useMemo(() => {
    if (!data || data.length === 0) return {};
    const stats = {};
    allColumns.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
      const numericValues = values.filter(v => typeof v === 'number');
      
      stats[col] = {
        total: values.length,
        unique: new Set(values.map(String)).size,
        empty: data.length - values.length,
        type: values.length > 0 ? detectType(values[0]) : 'unknown',
      };
      
      if (numericValues.length > 0) {
        stats[col].sum = numericValues.reduce((a, b) => a + b, 0);
        stats[col].avg = stats[col].sum / numericValues.length;
        stats[col].min = Math.min(...numericValues);
        stats[col].max = Math.max(...numericValues);
      }
    });
    return stats;
  }, [data, allColumns]);

  // Filtrar y ordenar datos
  const processedData = useMemo(() => {
    if (!data) return [];
    
    let result = [...data];
    
    // Filtrar por búsqueda global
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        columns.some(col => {
          const value = row[col];
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }
    
    // Filtrar por filtros de columna
    Object.entries(columnFilters).forEach(([col, filterValue]) => {
      if (filterValue && filterValue.trim()) {
        result = result.filter(row => {
          const value = row[col];
          return value && String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });
    
    // Ordenar
    if (sortConfig.field) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data, searchTerm, sortConfig, columns, columnFilters]);

  // Paginación
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return processedData.slice(start, end);
  }, [processedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);

  // Handlers
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const toggleRowSelection = (rowId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map(r => r._id || JSON.stringify(r))));
    }
  };

  const toggleColumnVisibility = (col) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  const clearColumnFilter = (col) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchTerm('');
  };

  const activeFiltersCount = Object.values(columnFilters).filter(Boolean).length + (searchTerm ? 1 : 0);

  const exportToCSV = () => {
    const headers = columns.join(',');
    const rows = processedData.map(row => 
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabla-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (value, type) => {
    if (value === null || value === undefined) return <span className="text-slate-600 italic">—</span>;
    if (typeof value === 'boolean') {
      return value 
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">Sí</span>
        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium">No</span>;
    }
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleDateString('es-ES');
      return JSON.stringify(value);
    }
    
    // Formateo especial por tipo
    const detected = type || detectType(value);
    switch (detected) {
      case 'email':
        return <a href={`mailto:${value}`} className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">{value}</a>;
      case 'url':
        return <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors truncate max-w-[200px] inline-block">{value}</a>;
      case 'phone':
        return <a href={`tel:${value}`} className="text-emerald-400 hover:text-emerald-300 transition-colors">{value}</a>;
      case 'date':
        try {
          return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
          return value;
        }
      case 'number':
        return <span className="font-mono text-amber-400">{Number(value).toLocaleString('es-ES')}</span>;
      default:
        return String(value);
    }
  };

  const formatColumnName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Toolbar mejorado */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            {Icons.search}
          </span>
          <input
            type="text"
            placeholder="Buscar en todos los campos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 
              text-slate-200 placeholder-slate-500 text-sm 
              focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20
              transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {Icons.x}
            </button>
          )}
        </div>

        {/* Controles adicionales */}
        <div className="flex items-center gap-2">
          {/* Botón de filtros por columna */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
              ${showFilters 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                : 'bg-slate-700/30 text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/50'
              }
            `}
          >
            {Icons.filter}
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Menú de columnas */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                ${showColumnMenu 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                  : 'bg-slate-700/30 text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/50'
                }
              `}
            >
              {Icons.columns}
              <span>Columnas</span>
              {hiddenColumns.size > 0 && (
                <span className="text-xs text-slate-500">
                  ({allColumns.length - hiddenColumns.size}/{allColumns.length})
                </span>
              )}
            </button>
            
            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-auto 
                bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl z-30">
                <div className="p-3 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Columnas visibles</span>
                    <button 
                      onClick={() => setHiddenColumns(new Set())}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mostrar todas
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  {allColumns.map(col => (
                    <button
                      key={col}
                      onClick={() => toggleColumnVisibility(col)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all
                        ${hiddenColumns.has(col) 
                          ? 'text-slate-500 hover:bg-slate-700/30' 
                          : 'text-slate-200 bg-slate-700/20 hover:bg-slate-700/40'
                        }
                      `}
                    >
                      <span className={`flex-shrink-0 ${hiddenColumns.has(col) ? 'text-slate-600' : 'text-emerald-400'}`}>
                        {hiddenColumns.has(col) ? Icons.eyeOff : Icons.eye}
                      </span>
                      <span className="truncate">{formatColumnName(col)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón de estadísticas */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
              ${showStats 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-700/30 text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/50'
              }
            `}
            title="Ver estadísticas"
          >
            {Icons.stats}
          </button>

          {/* Exportar CSV */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30 text-slate-400 
              hover:text-slate-200 hover:bg-slate-700/50 text-sm transition-all border border-transparent"
            title="Exportar CSV"
          >
            {Icons.download}
          </button>
          
          {/* Separador */}
          <div className="w-px h-6 bg-slate-700/50" />
          
          {/* Contador de resultados */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30 text-sm">
            <span className="text-slate-500">{Icons.rows}</span>
            <span className="text-slate-400">
              <span className="text-white font-semibold">{processedData.length}</span>
            </span>
          </div>
          
          {/* Selector de filas por página */}
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 
              text-slate-300 text-sm cursor-pointer
              focus:outline-none focus:border-indigo-500/50 
              hover:bg-slate-700/50 transition-colors"
          >
            {ROWS_PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} filas</option>
            ))}
          </select>
        </div>
      </div>

      {/* Panel de estadísticas */}
      {showStats && (
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {columns.slice(0, 6).map(col => {
              const stats = columnStats[col];
              if (!stats) return null;
              return (
                <div key={col} className="p-3 rounded-xl bg-slate-700/20 border border-slate-700/30">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 truncate">
                    {formatColumnName(col)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Únicos:</span>
                      <span className="text-slate-300">{stats.unique}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Vacíos:</span>
                      <span className="text-slate-300">{stats.empty}</span>
                    </div>
                    {stats.avg !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Promedio:</span>
                        <span className="text-amber-400 font-mono">{stats.avg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel de filtros por columna */}
      {showFilters && (
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Filtros por columna</span>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
              >
                Limpiar todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {columns.slice(0, 12).map(col => (
              <div key={col} className="relative">
                <label className="block text-xs text-slate-500 mb-1.5 truncate">
                  {formatColumnName(col)}
                </label>
                <input
                  type="text"
                  value={columnFilters[col] || ''}
                  onChange={(e) => {
                    setColumnFilters(prev => ({ ...prev, [col]: e.target.value }));
                    setCurrentPage(1);
                  }}
                  placeholder={`Filtrar...`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 
                    text-slate-200 placeholder-slate-600 text-sm
                    focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                />
                {columnFilters[col] && (
                  <button
                    onClick={() => clearColumnFilter(col)}
                    className="absolute right-2 top-7 text-slate-500 hover:text-slate-300"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selección múltiple info */}
      {selectedRows.size > 0 && (
        <div className="px-5 py-3 border-b border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
              {selectedRows.size}
            </span>
            <span className="text-sm text-indigo-300">
              {selectedRows.size === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
            </span>
          </div>
          <button 
            onClick={() => setSelectedRows(new Set())}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20"
          >
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-700/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-300">No hay registros</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm || activeFiltersCount > 0 ? 'Intenta con otros filtros' : 'Agrega datos a la tabla para verlos aquí'}
            </p>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/30 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-slate-800 to-slate-800/90 backdrop-blur-sm">
                {/* Checkbox de selección */}
                <th className="px-3 py-4 w-12 border-b border-slate-700/50 bg-slate-800">
                  <button
                    onClick={toggleAllSelection}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                      ${selectedRows.size === paginatedData.length && paginatedData.length > 0
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : selectedRows.size > 0
                          ? 'bg-indigo-500/30 border-indigo-500/50'
                          : 'border-slate-600 hover:border-slate-500'
                      }
                    `}
                  >
                    {selectedRows.size === paginatedData.length && paginatedData.length > 0 && Icons.check}
                    {selectedRows.size > 0 && selectedRows.size < paginatedData.length && (
                      <div className="w-2.5 h-0.5 bg-indigo-400 rounded" />
                    )}
                  </button>
                </th>
                {columns.map((column, idx) => (
                  <th 
                    key={column}
                    onClick={() => handleSort(column)}
                    onMouseEnter={() => setHoveredColumn(idx)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    className={`
                      px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider 
                      cursor-pointer select-none transition-all border-b border-slate-700/50
                      ${sortConfig.field === column 
                        ? 'text-indigo-400 bg-indigo-500/5' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatColumnName(column)}</span>
                      <span className={`
                        transition-all duration-200
                        ${sortConfig.field === column 
                          ? 'opacity-100 text-indigo-400' 
                          : hoveredColumn === idx ? 'opacity-50' : 'opacity-0'
                        }
                      `}>
                        {sortConfig.field === column && sortConfig.direction === 'desc' 
                          ? Icons.sortDesc 
                          : sortConfig.field === column 
                            ? Icons.sortAsc 
                            : Icons.sort
                        }
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-4 w-14 border-b border-slate-700/50 bg-slate-800" />
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => {
                const rowId = row._id || JSON.stringify(row);
                const isSelected = selectedRows.has(rowId);
                return (
                <tr 
                  key={row._id || index}
                  className={`
                    group transition-all duration-150
                    ${isSelected 
                      ? 'bg-indigo-500/10' 
                      : index % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'
                    }
                    hover:bg-indigo-500/5
                  `}
                >
                  {/* Checkbox de selección */}
                  <td className="px-3 py-3.5 border-b border-slate-700/20">
                    <button
                      onClick={() => toggleRowSelection(rowId)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${isSelected
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-slate-600 hover:border-indigo-500/50 group-hover:border-slate-500'
                        }
                      `}
                    >
                      {isSelected && Icons.check}
                    </button>
                  </td>
                  {columns.map(column => (
                    <td 
                      key={column} 
                      className="px-5 py-3.5 text-sm text-slate-300 border-b border-slate-700/20"
                    >
                      <div className="line-clamp-2" title={String(row[column] ?? '')}>
                        {formatValue(row[column])}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-3.5 border-b border-slate-700/20">
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 
                        hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 
                        transition-all duration-150"
                      title="Ver detalle"
                    >
                      {Icons.expand}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación mejorada */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <p className="text-sm text-slate-400">
            Mostrando <span className="text-white font-semibold">{((currentPage - 1) * rowsPerPage) + 1}</span> - <span className="text-white font-semibold">{Math.min(currentPage * rowsPerPage, processedData.length)}</span> de <span className="text-white font-semibold">{processedData.length}</span>
          </p>
          
          <div className="flex items-center gap-1">
            {/* Botón anterior */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed 
                text-slate-400 hover:text-white transition-all"
            >
              {Icons.chevronLeft}
            </button>
            
            {/* Números de página */}
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`
                      w-9 h-9 rounded-lg text-sm font-medium transition-all
                      ${currentPage === pageNum
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Botón siguiente */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed 
                text-slate-400 hover:text-white transition-all"
            >
              {Icons.chevronRight}
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle mejorado */}
      {selectedRow && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedRow(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] bg-gradient-to-b from-slate-800 to-slate-900 
              rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Detalle del Registro
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {columns.length} campos
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                {Icons.x}
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {columns.map((column, idx) => {
                const value = selectedRow[column];
                const type = detectType(value);
                
                return (
                  <div 
                    key={column} 
                    className="group p-4 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {formatColumnName(column)}
                      </span>
                      <span className="text-[10px] text-slate-600 uppercase px-2 py-0.5 rounded-full bg-slate-700/50">
                        {type}
                      </span>
                    </div>
                    <div className="text-slate-200 break-words text-sm leading-relaxed">
                      {value === null || value === undefined ? (
                        <span className="text-slate-500 italic">Sin valor</span>
                      ) : typeof value === 'object' ? (
                        <pre className="text-xs bg-slate-800/50 p-2 rounded-lg overflow-auto font-mono">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : type === 'email' ? (
                        <a href={`mailto:${value}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
                          {value}
                        </a>
                      ) : type === 'url' ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline break-all">
                          {value}
                        </a>
                      ) : type === 'phone' ? (
                        <a href={`tel:${value}`} className="text-emerald-400 hover:text-emerald-300">
                          {value}
                        </a>
                      ) : type === 'boolean' ? (
                        value 
                          ? <span className="text-emerald-400 font-medium">Sí</span>
                          : <span className="text-slate-400">No</span>
                      ) : type === 'number' ? (
                        <span className="font-mono text-amber-400">{Number(value).toLocaleString('es-ES')}</span>
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer del modal */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <button
                onClick={() => setSelectedRow(null)}
                className="w-full py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 
                  text-slate-300 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
