import { useState, useMemo } from 'react';

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  sort: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>,
  sortAsc: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>,
  sortDesc: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" /></svg>,
  chevronLeft: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>,
  chevronRight: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>,
  expand: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function TableView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedRow, setSelectedRow] = useState(null);

  // Determinar columnas a mostrar
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Obtener todas las keys del primer registro (excluyendo las internas)
    const sample = data[0];
    const allKeys = Object.keys(sample).filter(key => 
      !key.startsWith('_') && key !== 'createdAt' && key !== 'updatedAt'
    );
    
    // Si hay fieldMap, priorizar esos campos
    const fieldMap = meta?.fieldMap || view?.fieldMap || {};
    const mappedFields = Object.values(fieldMap).filter(Boolean);
    
    if (mappedFields.length > 0) {
      // Poner campos mapeados primero, luego el resto
      const orderedKeys = [...new Set([...mappedFields, ...allKeys])];
      return orderedKeys.filter(key => allKeys.includes(key));
    }
    
    return allKeys;
  }, [data, meta, view]);

  // Filtrar y ordenar datos
  const processedData = useMemo(() => {
    if (!data) return [];
    
    let result = [...data];
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        columns.some(col => {
          const value = row[col];
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }
    
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
  }, [data, searchTerm, sortConfig, columns]);

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

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleDateString();
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-700/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {Icons.search}
          </span>
          <input
            type="text"
            placeholder="Buscar en la tabla..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            {processedData.length} registro{processedData.length !== 1 ? 's' : ''}
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm focus:outline-none"
          >
            {ROWS_PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p className="text-lg">No hay registros</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Agrega datos a la tabla'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm">
              <tr>
                {columns.map(column => (
                  <th 
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-indigo-400 transition-colors border-b border-slate-700/50 group"
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.replace(/_/g, ' ')}</span>
                      <span className={`transition-opacity ${sortConfig.field === column ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
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
                <th className="px-4 py-3 w-12 border-b border-slate-700/50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {paginatedData.map((row, index) => (
                <tr 
                  key={row._id || index}
                  className="hover:bg-slate-700/30 transition-colors group"
                >
                  {columns.map(column => (
                    <td key={column} className="px-4 py-3 text-sm text-slate-300">
                      <span className="line-clamp-2" title={formatValue(row[column])}>
                        {formatValue(row[column])}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600 text-slate-400 hover:text-white transition-all"
                    >
                      {Icons.expand}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
          <p className="text-sm text-slate-400">
            Mostrando {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, processedData.length)} de {processedData.length}
          </p>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
            >
              {Icons.chevronLeft}
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
            >
              {Icons.chevronRight}
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRow && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedRow(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[80vh] overflow-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
              <h2 className="text-lg font-semibold text-white">
                Detalle del registro
              </h2>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {Icons.x}
              </button>
            </div>

            {/* Modal content */}
            <div className="p-4 space-y-4">
              {columns.map(column => (
                <div key={column} className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    {column.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-200 break-words">
                    {formatValue(selectedRow[column])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
