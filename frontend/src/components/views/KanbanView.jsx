import { useState, useMemo, useRef } from 'react';
import { updateViewItemStatus } from '../../api/client';

const DEFAULT_COLUMNS = ['Pendiente', 'En Progreso', 'Completado'];
const COLUMN_COLORS = {
  'pendiente': { bg: '#EAB308', light: 'rgba(234, 179, 8, 0.15)', text: '#FDE047' },
  'en progreso': { bg: '#3B82F6', light: 'rgba(59, 130, 246, 0.15)', text: '#93C5FD' },
  'completado': { bg: '#22C55E', light: 'rgba(34, 197, 94, 0.15)', text: '#86EFAC' },
  'cancelado': { bg: '#EF4444', light: 'rgba(239, 68, 68, 0.15)', text: '#FCA5A5' },
  'sin estado': { bg: '#6B7280', light: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
  'default': { bg: '#6366F1', light: 'rgba(99, 102, 241, 0.15)', text: '#A5B4FC' },
};

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  filter: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  chevronDown: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  drag: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>,
  calendar: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  user: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  stats: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
};

const getColumnColor = (columnName) => {
  const normalized = columnName.toLowerCase();
  return COLUMN_COLORS[normalized] || COLUMN_COLORS['default'];
};

const PRIORITY_STYLES = {
  'alta': { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🔴' },
  'media': { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '🟡' },
  'baja': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '🟢' },
  'default': { bg: 'bg-slate-600/20', text: 'text-slate-400', icon: '⚪' },
};

const getPriorityStyle = (priority) => {
  if (!priority) return PRIORITY_STYLES['default'];
  return PRIORITY_STYLES[priority.toLowerCase()] || PRIORITY_STYLES['default'];
};

export default function KanbanView({ view, data, meta, onRefresh, workspaceId }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null); // Para reordenar dentro de columna
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [collapsedColumns, setCollapsedColumns] = useState(new Set());
  const [showStats, setShowStats] = useState(false);
  const [localOrder, setLocalOrder] = useState({}); // Orden local por columna
  const dragCounter = useRef(0);
  
  // Procesar columnas y tarjetas
  const { columns, cardsByColumn, totalCards, stats } = useMemo(() => {
    if (!data) return { columns: DEFAULT_COLUMNS, cardsByColumn: {}, totalCards: 0, stats: {} };
    
    // Filtrar por búsqueda y prioridad
    let filteredData = data;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item => 
        (item.title?.toLowerCase().includes(term)) ||
        (item.description?.toLowerCase().includes(term)) ||
        (item.assignee?.toLowerCase().includes(term))
      );
    }
    if (priorityFilter !== 'all') {
      filteredData = filteredData.filter(item => 
        item.priority?.toLowerCase() === priorityFilter.toLowerCase()
      );
    }
    
    // Obtener columnas únicas del campo status
    const statusSet = new Set();
    data.forEach(item => {
      if (item.status) statusSet.add(item.status);
    });
    
    let cols = view?.viewConfig?.columns;
    if (!cols || cols.length === 0) {
      cols = statusSet.size > 0 ? Array.from(statusSet) : DEFAULT_COLUMNS;
    }
    
    // Agrupar tarjetas por columna
    const grouped = {};
    cols.forEach(col => { grouped[col] = []; });
    
    // Agregar columna "Sin estado" si hay items sin status
    const itemsWithoutStatus = filteredData.filter(item => !item.status);
    if (itemsWithoutStatus.length > 0 && !cols.includes('Sin estado')) {
      cols = ['Sin estado', ...cols];
      grouped['Sin estado'] = [];
    }
    
    filteredData.forEach(item => {
      const status = item.status || 'Sin estado';
      if (!grouped[status]) {
        cols.push(status);
        grouped[status] = [];
      }
      grouped[status].push({ ...item, displayTitle: item.title || 'Sin título' });
    });
    
    // Aplicar orden local si existe
    cols.forEach(col => {
      if (localOrder[col] && grouped[col]) {
        const orderMap = new Map(localOrder[col].map((id, idx) => [id, idx]));
        grouped[col].sort((a, b) => {
          const aOrder = orderMap.get(a._id) ?? 999;
          const bOrder = orderMap.get(b._id) ?? 999;
          return aOrder - bOrder;
        });
      }
    });
    
    // Calcular estadísticas
    const columnStats = {};
    let totalHighPriority = 0;
    let totalWithDueDate = 0;
    
    cols.forEach(col => {
      const cards = grouped[col] || [];
      const highPriority = cards.filter(c => c.priority?.toLowerCase() === 'alta').length;
      const withDueDate = cards.filter(c => c.dueDate).length;
      totalHighPriority += highPriority;
      totalWithDueDate += withDueDate;
      columnStats[col] = {
        total: cards.length,
        highPriority,
        withDueDate,
        percentage: filteredData.length > 0 ? Math.round((cards.length / filteredData.length) * 100) : 0,
      };
    });
    
    return { columns: cols, cardsByColumn: grouped, totalCards: filteredData.length, stats: { columns: columnStats, totalHighPriority, totalWithDueDate } };
  }, [data, view?.viewConfig?.columns, searchTerm, priorityFilter, localOrder]);
  
  const toggleColumn = (col) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };
  
  // Drag handlers
  const handleDragStart = (card, e) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnter = (column) => {
    dragCounter.current++;
    setDragOverColumn(column);
  };
  
  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverColumn(null);
      setDragOverCard(null);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleCardDragOver = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCard && draggedCard._id !== card._id) {
      setDragOverCard(card._id);
    }
  };
  
  const handleDrop = async (column, e, targetCardId = null) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverColumn(null);
    setDragOverCard(null);
    
    if (!draggedCard) {
      return;
    }
    
    const draggedId = draggedCard._id || draggedCard._raw?._id;
    const sourceColumn = draggedCard.status || 'Sin estado';
    
    // Reordenar dentro de la misma columna
    if (sourceColumn === column) {
      const columnCards = cardsByColumn[column] || [];
      const currentIds = columnCards.map(c => c._id);
      
      // Si hay targetCardId, insertar antes de esa tarjeta
      if (targetCardId && targetCardId !== draggedId) {
        const newOrder = currentIds.filter(id => id !== draggedId);
        const targetIndex = newOrder.indexOf(targetCardId);
        if (targetIndex !== -1) {
          newOrder.splice(targetIndex, 0, draggedId);
        } else {
          newOrder.push(draggedId);
        }
        setLocalOrder(prev => ({ ...prev, [column]: newOrder }));
      }
      setDraggedCard(null);
      return;
    }
    
    // Mover a otra columna
    if (!draggedId || !workspaceId) {
      setDraggedCard(null);
      return;
    }
    
    setUpdating(draggedId);
    
    try {
      await updateViewItemStatus(view._id, draggedId, { workspaceId, fieldName: 'status', newValue: column });
      
      // Actualizar orden local en la nueva columna si hay targetCardId
      if (targetCardId) {
        const targetColumnCards = cardsByColumn[column] || [];
        const currentIds = targetColumnCards.map(c => c._id);
        const targetIndex = currentIds.indexOf(targetCardId);
        if (targetIndex !== -1) {
          currentIds.splice(targetIndex, 0, draggedId);
        } else {
          currentIds.push(draggedId);
        }
        setLocalOrder(prev => ({ ...prev, [column]: currentIds }));
      }
      
      onRefresh?.();
    } catch (err) {
      console.error('Error updating item status:', err);
    } finally {
      setUpdating(null);
    }
    setDraggedCard(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverColumn(null);
    setDragOverCard(null);
    dragCounter.current = 0;
  };
  
  const priorityOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Media' },
    { value: 'baja', label: 'Baja' },
  ];
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Header mejorado */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{Icons.search}</span>
            <input
              type="text"
              placeholder="Buscar tarjetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          
          {/* Controles */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{Icons.filter}</span>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 text-slate-300 text-sm cursor-pointer focus:outline-none focus:border-indigo-500/50 hover:bg-slate-700/50 transition-colors">
                {priorityOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            
            <button onClick={() => setShowStats(!showStats)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${showStats ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/30 text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/50'}`}>
              {Icons.stats}
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30 text-sm">
              <span className="text-white font-semibold">{totalCards}</span>
              <span className="text-slate-400">tarjetas</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panel de estadísticas */}
      {showStats && (
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/20">
          <div className="flex items-center gap-6 overflow-x-auto pb-2">
            {columns.map(col => {
              const colStats = stats.columns[col];
              const color = getColumnColor(col);
              return (
                <div key={col} className="flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.bg }} />
                    <span className="text-xs text-slate-400">{col}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{colStats?.total || 0}</div>
                  <div className="text-xs text-slate-500">{colStats?.percentage || 0}%</div>
                </div>
              );
            })}
            <div className="w-px h-12 bg-slate-700/50 flex-shrink-0" />
            <div className="flex-shrink-0">
              <div className="text-xs text-red-400 mb-1">Alta prioridad</div>
              <div className="text-2xl font-bold text-red-400">{stats.totalHighPriority}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(column => {
            const cards = cardsByColumn[column] || [];
            const color = getColumnColor(column);
            const isDragOver = dragOverColumn === column;
            const isCollapsed = collapsedColumns.has(column);
            
            return (
              <div
                key={column}
                className={`flex flex-col shrink-0 rounded-xl transition-all duration-300 ${isCollapsed ? 'w-14' : 'w-80'} ${isDragOver ? 'ring-2 ring-indigo-500/50 bg-indigo-500/5' : 'bg-slate-800/40'} border ${isDragOver ? 'border-indigo-500/50' : 'border-slate-700/30'}`}
                onDragEnter={() => handleDragEnter(column)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(column, e)}
              >
                {/* Column Header */}
                <div className={`px-3 py-3 border-b border-slate-700/30 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} cursor-pointer hover:bg-slate-700/20 transition-colors`} onClick={() => toggleColumn(column)}>
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color.bg }} />
                      <div className="flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-white uppercase tracking-[0.25em]" style={{ writingMode: 'vertical-lr' }}>{column}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: color.light, color: color.text }}>{cards.length}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: color.bg, boxShadow: `0 0 8px ${color.bg}40` }} />
                        <h3 className="font-semibold text-slate-200">{column}</h3>
                        <span className="text-slate-500">{Icons.chevronDown}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: color.light, color: color.text }}>{cards.length}</span>
                    </>
                  )}
                </div>
                
                {/* Cards */}
                {!isCollapsed && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {cards.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed transition-colors ${isDragOver ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700/30'}`}>
                        <span className="text-sm text-slate-500">{isDragOver ? 'Soltar aquí' : 'Sin elementos'}</span>
                      </div>
                    ) : (
                      cards.map((card, idx) => {
                        const priorityStyle = getPriorityStyle(card.priority);
                        const isUpdating = updating === (card._id || card._raw?._id);
                        const isDragging = draggedCard?._id === card._id;
                        const isDropTarget = dragOverCard === card._id && draggedCard?._id !== card._id;
                        
                        return (
                          <div
                            key={card._id || idx}
                            draggable={!updating}
                            onDragStart={(e) => handleDragStart(card, e)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(card, e)}
                            onDrop={(e) => handleDrop(column, e, card._id)}
                            onClick={() => setSelectedCard(card)}
                            className={`relative group p-4 rounded-xl border transition-all duration-200 cursor-pointer ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-xl'} ${isUpdating ? 'opacity-70 pointer-events-none' : ''} ${isDropTarget ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''} bg-gradient-to-br from-slate-700/60 to-slate-800/60 border-slate-600/30 hover:border-slate-500/50`}
                          >
                            {/* Indicador de posición de drop */}
                            {isDropTarget && (
                              <div className="absolute -top-1.5 left-0 right-0 h-1 bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50" />
                            )}
                            
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 text-slate-500 transition-opacity">{Icons.drag}</div>
                            
                            {isUpdating && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-800/60 rounded-xl backdrop-blur-sm">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                            
                            <h4 className="font-medium text-slate-100 mb-2 pr-6 line-clamp-2">{card.displayTitle}</h4>
                            
                            {card.description && <p className="text-sm text-slate-400 mb-3 line-clamp-2">{card.description}</p>}
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {card.priority && (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                                  <span>{priorityStyle.icon}</span>{card.priority}
                                </span>
                              )}
                              {card.assignee && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-600/30 text-xs text-slate-300">{Icons.user} {card.assignee}</span>
                              )}
                              {card.dueDate && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-xs text-amber-400">{Icons.calendar} {card.dueDate}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Zona de drop al final para mover tarjetas al último lugar */}
                    {draggedCard && cards.length > 0 && (
                      <div 
                        className="h-16 rounded-xl border-2 border-dashed border-slate-600/30 flex items-center justify-center text-sm text-slate-500 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5"
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Mover al final - usar null como targetCardId
                          const columnCards = cardsByColumn[column] || [];
                          const currentIds = columnCards.map(c => c._id).filter(id => id !== draggedCard._id);
                          currentIds.push(draggedCard._id);
                          const sourceColumn = draggedCard.status || 'Sin estado';
                          
                          if (sourceColumn === column) {
                            setLocalOrder(prev => ({ ...prev, [column]: currentIds }));
                            setDraggedCard(null);
                            setDragOverColumn(null);
                            setDragOverCard(null);
                          } else {
                            handleDrop(column, e, null);
                          }
                        }}
                      >
                        Soltar aquí (al final)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Card Detail Modal mejorado */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCard(null)}>
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-700/50" onClick={e => e.stopPropagation()}>
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${getColumnColor(selectedCard.status || 'default').bg}, ${getColumnColor(selectedCard.status || 'default').bg}80)` }} />
            
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-bold text-white flex-1">{selectedCard.displayTitle}</h3>
                <button onClick={() => setSelectedCard(null)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">{Icons.x}</button>
              </div>
              
              {selectedCard.status && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mt-3" style={{ backgroundColor: getColumnColor(selectedCard.status).light, color: getColumnColor(selectedCard.status).text }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColumnColor(selectedCard.status).bg }} />
                  {selectedCard.status}
                </span>
              )}
            </div>
            
            <div className="px-6 pb-6 space-y-5">
              {selectedCard.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Descripción</p>
                  <p className="text-slate-300 leading-relaxed">{selectedCard.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {selectedCard.assignee && (
                  <div className="p-3 rounded-xl bg-slate-700/20">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Asignado</p>
                    <div className="flex items-center gap-2 text-slate-200">{Icons.user} <span>{selectedCard.assignee}</span></div>
                  </div>
                )}
                {selectedCard.priority && (
                  <div className="p-3 rounded-xl bg-slate-700/20">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prioridad</p>
                    <span className={`px-2 py-0.5 rounded text-sm font-medium ${getPriorityStyle(selectedCard.priority).bg} ${getPriorityStyle(selectedCard.priority).text}`}>{selectedCard.priority}</span>
                  </div>
                )}
                {selectedCard.dueDate && (
                  <div className="p-3 rounded-xl bg-slate-700/20">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fecha límite</p>
                    <div className="flex items-center gap-2 text-amber-400">{Icons.calendar} <span>{selectedCard.dueDate}</span></div>
                  </div>
                )}
              </div>
              
              {selectedCard._raw && Object.keys(selectedCard._raw).filter(k => !k.startsWith('_')).length > 0 && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Todos los campos</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(selectedCard._raw).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm p-2 rounded-lg hover:bg-slate-700/20">
                        <span className="text-slate-500">{key.replace(/_/g, ' ')}</span>
                        <span className="text-slate-300 truncate ml-4 max-w-[200px]">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <button onClick={() => setSelectedCard(null)} className="w-full py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
