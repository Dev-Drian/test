import { useState, useMemo } from 'react';

const DEFAULT_COLUMNS = ['Pendiente', 'En Progreso', 'Completado'];
const COLUMN_COLORS = {
  'pendiente': '#EAB308',
  'en progreso': '#3B82F6',
  'completado': '#22C55E',
  'cancelado': '#EF4444',
  'default': '#6366F1',
};

const getColumnColor = (columnName) => {
  const normalized = columnName.toLowerCase();
  return COLUMN_COLORS[normalized] || COLUMN_COLORS['default'];
};

export default function KanbanView({ view, data, meta, onRefresh }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Procesar columnas y tarjetas
  const { columns, cardsByColumn } = useMemo(() => {
    if (!data) return { columns: DEFAULT_COLUMNS, cardsByColumn: {} };
    
    // Obtener columnas únicas del campo status
    const statusSet = new Set();
    data.forEach(item => {
      if (item.status) {
        statusSet.add(item.status);
      }
    });
    
    let cols = view?.viewConfig?.columns;
    if (!cols || cols.length === 0) {
      cols = statusSet.size > 0 ? Array.from(statusSet) : DEFAULT_COLUMNS;
    }
    
    // Agrupar tarjetas por columna
    const grouped = {};
    cols.forEach(col => {
      grouped[col] = [];
    });
    
    // Agregar columna "Sin estado" si hay items sin status
    const itemsWithoutStatus = data.filter(item => !item.status);
    if (itemsWithoutStatus.length > 0 && !cols.includes('Sin estado')) {
      cols = ['Sin estado', ...cols];
      grouped['Sin estado'] = [];
    }
    
    data.forEach(item => {
      const status = item.status || 'Sin estado';
      if (grouped[status]) {
        grouped[status].push({
          ...item,
          displayTitle: item.title || 'Sin título',
        });
      } else {
        // Si el status no está en las columnas, crear una nueva
        if (!grouped[status]) {
          cols.push(status);
          grouped[status] = [];
        }
        grouped[status].push({
          ...item,
          displayTitle: item.title || 'Sin título',
        });
      }
    });
    
    return { columns: cols, cardsByColumn: grouped };
  }, [data, view?.viewConfig?.columns]);
  
  // Drag handlers (UI only, no persistence for now)
  const handleDragStart = (card, e) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (column, e) => {
    e.preventDefault();
    setDragOverColumn(column);
  };
  
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };
  
  const handleDrop = (column, e) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedCard) {
      // TODO: Implementar actualización en backend
      console.log(`Moving card ${draggedCard._id} to column ${column}`);
    }
    
    setDraggedCard(null);
  };
  
  return (
    <div className="h-full flex flex-col bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {data?.length || 0} elementos en {columns.length} columnas
          </span>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(column => {
            const cards = cardsByColumn[column] || [];
            const columnColor = getColumnColor(column);
            const isDragOver = dragOverColumn === column;
            
            return (
              <div
                key={column}
                className={`flex flex-col w-72 shrink-0 rounded-xl bg-slate-800/50 border transition-colors ${
                  isDragOver 
                    ? 'border-indigo-500/50 bg-indigo-500/5' 
                    : 'border-slate-700/50'
                }`}
                onDragOver={(e) => handleDragOver(column, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(column, e)}
              >
                {/* Column Header */}
                <div className="px-3 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: columnColor }}
                    />
                    <h3 className="font-medium text-slate-200">{column}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-slate-400">
                    {cards.length}
                  </span>
                </div>
                
                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {cards.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-slate-500 text-sm">
                      Sin elementos
                    </div>
                  ) : (
                    cards.map((card, idx) => (
                      <div
                        key={card._id || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(card, e)}
                        onClick={() => setSelectedCard(card)}
                        className={`p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 cursor-pointer transition-all hover:border-slate-500/50 hover:shadow-lg ${
                          draggedCard?._id === card._id ? 'opacity-50' : ''
                        }`}
                      >
                        <h4 className="font-medium text-slate-200 mb-1">
                          {card.displayTitle}
                        </h4>
                        
                        {card.description && (
                          <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                            {card.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {card.priority && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              card.priority.toLowerCase() === 'alta' 
                                ? 'bg-red-500/20 text-red-400' 
                                : card.priority.toLowerCase() === 'media'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-slate-600/50 text-slate-400'
                            }`}>
                              {card.priority}
                            </span>
                          )}
                          
                          {card.assignee && (
                            <span className="px-2 py-0.5 rounded bg-slate-600/50 text-xs text-slate-300">
                              {card.assignee}
                            </span>
                          )}
                          
                          {card.dueDate && (
                            <span className="text-xs text-slate-500">
                              📅 {card.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Card Detail Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="h-2"
              style={{ backgroundColor: getColumnColor(selectedCard.status || 'default') }}
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-100">
                  {selectedCard.displayTitle}
                </h3>
                {selectedCard.status && (
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${getColumnColor(selectedCard.status)}20`,
                      color: getColumnColor(selectedCard.status),
                    }}
                  >
                    {selectedCard.status}
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                {selectedCard.description && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                    <p className="text-slate-300">{selectedCard.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedCard.assignee && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Asignado</p>
                      <p className="text-slate-300">{selectedCard.assignee}</p>
                    </div>
                  )}
                  {selectedCard.priority && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prioridad</p>
                      <p className="text-slate-300">{selectedCard.priority}</p>
                    </div>
                  )}
                  {selectedCard.dueDate && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fecha límite</p>
                      <p className="text-slate-300">{selectedCard.dueDate}</p>
                    </div>
                  )}
                </div>
                
                {/* Datos originales */}
                {selectedCard._raw && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Datos originales</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(selectedCard._raw)
                        .filter(([k]) => !k.startsWith('_'))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500">{key}</span>
                            <span className="text-slate-300 truncate ml-4">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
