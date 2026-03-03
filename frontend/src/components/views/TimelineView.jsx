import { useState, useMemo } from 'react';

// Colores para tipos de eventos
const TYPE_COLORS = {
  default: { bg: 'bg-indigo-500/20', border: 'border-indigo-500', dot: 'bg-indigo-500', text: 'text-indigo-400' },
  success: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  warning: { bg: 'bg-amber-500/20', border: 'border-amber-500', dot: 'bg-amber-500', text: 'text-amber-400' },
  error: { bg: 'bg-red-500/20', border: 'border-red-500', dot: 'bg-red-500', text: 'text-red-400' },
  info: { bg: 'bg-sky-500/20', border: 'border-sky-500', dot: 'bg-sky-500', text: 'text-sky-400' },
};

// Auto-detectar color basado en tipo o keywords
const getColorForType = (type, title = '') => {
  if (!type && !title) return TYPE_COLORS.default;
  
  const search = `${type} ${title}`.toLowerCase();
  
  if (search.includes('error') || search.includes('fail') || search.includes('cancel')) {
    return TYPE_COLORS.error;
  }
  if (search.includes('success') || search.includes('complete') || search.includes('done') || search.includes('ok')) {
    return TYPE_COLORS.success;
  }
  if (search.includes('warning') || search.includes('pending') || search.includes('wait')) {
    return TYPE_COLORS.warning;
  }
  if (search.includes('info') || search.includes('note') || search.includes('update')) {
    return TYPE_COLORS.info;
  }
  
  return TYPE_COLORS.default;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(dateStr);
  } catch {
    return '';
  }
};

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  filter: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  chevronDown: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

export default function TimelineView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = más reciente primero
  
  const fieldMap = meta?.fieldMap || view?.fieldMap || {};
  
  // Procesar eventos
  const { events, types } = useMemo(() => {
    if (!data) return { events: [], types: [] };
    
    const typeSet = new Set();
    
    const processed = data.map((item, index) => {
      const date = item.date || item[fieldMap.date] || item.createdAt || item.fecha;
      const title = item.title || item[fieldMap.title] || item.nombre || item.titulo || `Evento ${index + 1}`;
      const description = item.description || item[fieldMap.description] || item.descripcion || '';
      const type = item.type || item[fieldMap.type] || item.tipo || item.categoria || '';
      const icon = item.icon || item[fieldMap.icon] || '';
      
      if (type) typeSet.add(type);
      
      return {
        ...item,
        _date: date,
        _parsedDate: date ? new Date(date) : new Date(),
        _title: title,
        _description: description,
        _type: type,
        _icon: icon,
        _colors: getColorForType(type, title),
      };
    });
    
    return {
      events: processed,
      types: Array.from(typeSet),
    };
  }, [data, fieldMap]);
  
  // Filtrar y ordenar
  const filteredEvents = useMemo(() => {
    let result = [...events];
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      result = result.filter(e => e._type === filterType);
    }
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e._title.toLowerCase().includes(term) ||
        e._description.toLowerCase().includes(term) ||
        e._type.toLowerCase().includes(term)
      );
    }
    
    // Ordenar por fecha
    result.sort((a, b) => {
      const diff = a._parsedDate - b._parsedDate;
      return sortOrder === 'desc' ? -diff : diff;
    });
    
    return result;
  }, [events, filterType, searchTerm, sortOrder]);
  
  // Agrupar por fecha
  const groupedEvents = useMemo(() => {
    const groups = {};
    
    filteredEvents.forEach(event => {
      const dateKey = event._parsedDate.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: event._parsedDate,
          label: formatDate(event._date),
          events: [],
        };
      }
      groups[dateKey].events.push(event);
    });
    
    return Object.values(groups).sort((a, b) => {
      const diff = a.date - b.date;
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [filteredEvents, sortOrder]);
  
  return (
    <div className="h-full flex flex-col bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {Icons.search}
          </span>
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          {types.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">Todos los tipos</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-700/50 transition-colors"
          >
            {sortOrder === 'desc' ? 'Más reciente' : 'Más antiguo'}
            <svg className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
        
        <span className="text-sm text-slate-400">
          {filteredEvents.length} eventos
        </span>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <svg className="w-16 h-16 mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-slate-300">No hay eventos</p>
            <p className="text-sm">Intenta ajustar los filtros</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700/50"></div>
            
            {/* Grupos por fecha */}
            {groupedEvents.map((group, groupIdx) => (
              <div key={group.date.toISOString()} className="mb-8 last:mb-0">
                {/* Fecha header */}
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center z-10">
                    <span className="text-xs font-medium text-slate-300">
                      {group.date.getDate()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                
                {/* Eventos del día */}
                <div className="ml-12 space-y-3">
                  {group.events.map((event, eventIdx) => (
                    <div
                      key={event._id || `${groupIdx}-${eventIdx}`}
                      onClick={() => setSelectedEvent(event)}
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${event._colors.bg} ${event._colors.border} border-l-4`}
                    >
                      {/* Dot en timeline */}
                      <div className={`absolute -left-[3.25rem] top-5 w-3 h-3 rounded-full ${event._colors.dot} ring-4 ring-slate-900`}></div>
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {event._icon && (
                              <span className="text-lg">{event._icon}</span>
                            )}
                            <h4 className="font-medium text-slate-100 truncate">
                              {event._title}
                            </h4>
                          </div>
                          
                          {event._description && (
                            <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                              {event._description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs">
                            {event._type && (
                              <span className={`px-2 py-0.5 rounded ${event._colors.bg} ${event._colors.text}`}>
                                {event._type}
                              </span>
                            )}
                            <span className="text-slate-500">
                              {formatTime(event._date)}
                            </span>
                          </div>
                        </div>
                        
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {getRelativeTime(event._date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className={`h-2 ${selectedEvent._colors.dot}`} />
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {selectedEvent._icon && (
                    <span className="text-2xl">{selectedEvent._icon}</span>
                  )}
                  <h3 className="text-xl font-semibold text-slate-100">
                    {selectedEvent._title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {Icons.x}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fecha</p>
                    <p className="text-slate-200">{formatDate(selectedEvent._date)}</p>
                  </div>
                  {formatTime(selectedEvent._date) && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hora</p>
                      <p className="text-slate-200">{formatTime(selectedEvent._date)}</p>
                    </div>
                  )}
                  {selectedEvent._type && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tipo</p>
                      <span className={`px-2 py-0.5 rounded text-sm ${selectedEvent._colors.bg} ${selectedEvent._colors.text}`}>
                        {selectedEvent._type}
                      </span>
                    </div>
                  )}
                </div>
                
                {selectedEvent._description && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                    <p className="text-slate-300">{selectedEvent._description}</p>
                  </div>
                )}
                
                {/* Datos adicionales */}
                {selectedEvent._raw && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Datos adicionales</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(selectedEvent._raw)
                        .filter(([k]) => !k.startsWith('_') && !['date', 'title', 'description', 'type', 'icon'].includes(k))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500">{key}</span>
                            <span className="text-slate-300 truncate ml-4 max-w-[60%]">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
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
