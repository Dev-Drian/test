import { useState, useMemo } from 'react';

// Colores para tipos de eventos
const TYPE_COLORS = {
  default: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366F1', dot: '#6366F1', text: '#A5B4FC', glow: 'rgba(99, 102, 241, 0.3)' },
  success: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22C55E', dot: '#22C55E', text: '#86EFAC', glow: 'rgba(34, 197, 94, 0.3)' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', dot: '#F59E0B', text: '#FCD34D', glow: 'rgba(245, 158, 11, 0.3)' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', dot: '#EF4444', text: '#FCA5A5', glow: 'rgba(239, 68, 68, 0.3)' },
  info: { bg: 'rgba(14, 165, 233, 0.15)', border: '#0EA5E9', dot: '#0EA5E9', text: '#7DD3FC', glow: 'rgba(14, 165, 233, 0.3)' },
};

const getColorForType = (type, title = '') => {
  if (!type && !title) return TYPE_COLORS.default;
  const search = `${type} ${title}`.toLowerCase();
  if (search.includes('error') || search.includes('fail') || search.includes('cancel')) return TYPE_COLORS.error;
  if (search.includes('success') || search.includes('complete') || search.includes('done') || search.includes('ok')) return TYPE_COLORS.success;
  if (search.includes('warning') || search.includes('pending') || search.includes('wait')) return TYPE_COLORS.warning;
  if (search.includes('info') || search.includes('note') || search.includes('update')) return TYPE_COLORS.info;
  return TYPE_COLORS.default;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const formatShortDate = (date) => {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return formatShortDate(date);
  } catch { return ''; }
};

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  stats: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  calendar: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  clock: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  compact: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" /></svg>,
  expand: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
};

export default function TimelineView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [showStats, setShowStats] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  
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
    return { events: processed, types: Array.from(typeSet) };
  }, [data, fieldMap]);
  
  // Estadísticas
  const stats = useMemo(() => {
    if (!events.length) return null;
    const typeCounts = {};
    let earliest = events[0]?._parsedDate;
    let latest = events[0]?._parsedDate;
    events.forEach(e => {
      typeCounts[e._type || 'Sin tipo'] = (typeCounts[e._type || 'Sin tipo'] || 0) + 1;
      if (e._parsedDate < earliest) earliest = e._parsedDate;
      if (e._parsedDate > latest) latest = e._parsedDate;
    });
    const daysDiff = Math.max(1, Math.ceil((latest - earliest) / 86400000));
    return {
      total: events.length,
      typeCounts,
      earliest,
      latest,
      avgPerDay: (events.length / daysDiff).toFixed(1),
      uniqueDays: new Set(events.map(e => e._parsedDate.toDateString())).size,
    };
  }, [events]);
  
  // Filtrar y ordenar
  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (filterType !== 'all') result = result.filter(e => e._type === filterType);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e._title.toLowerCase().includes(term) ||
        e._description.toLowerCase().includes(term) ||
        e._type.toLowerCase().includes(term)
      );
    }
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
        groups[dateKey] = { date: event._parsedDate, label: formatDate(event._date), events: [] };
      }
      groups[dateKey].events.push(event);
    });
    return Object.values(groups).sort((a, b) => {
      const diff = a.date - b.date;
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [filteredEvents, sortOrder]);
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {types.length > 0 && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="all">Todos los tipos</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
            
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-500/50 transition-all"
            >
              {sortOrder === 'desc' ? 'Reciente' : 'Antiguo'}
              <svg className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`p-2 rounded-lg border transition-all ${compactMode ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-400' : 'bg-slate-800/60 border-slate-600/50 text-slate-400 hover:bg-slate-700/50'}`}
              title={compactMode ? 'Vista expandida' : 'Vista compacta'}
            >
              {compactMode ? Icons.compact : Icons.expand}
            </button>
            
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg border transition-all ${showStats ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-400' : 'bg-slate-800/60 border-slate-600/50 text-slate-400 hover:bg-slate-700/50'}`}
              title="Estadísticas"
            >
              {Icons.stats}
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-indigo-400 font-medium">{filteredEvents.length}</span> eventos
          </div>
        </div>
      </div>
      
      {/* Stats Panel */}
      {showStats && stats && (
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <p className="text-xs text-slate-500 mb-1">Total eventos</p>
              <p className="text-lg font-semibold text-slate-200">{stats.total}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <p className="text-xs text-slate-500 mb-1">Días únicos</p>
              <p className="text-lg font-semibold text-slate-200">{stats.uniqueDays}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <p className="text-xs text-slate-500 mb-1">Promedio/día</p>
              <p className="text-lg font-semibold text-slate-200">{stats.avgPerDay}</p>
            </div>
            {Object.entries(stats.typeCounts).slice(0, 3).map(([type, count]) => {
              const colors = getColorForType(type, type);
              return (
                <div key={type} className="px-3 py-2 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.border + '40' }}>
                  <p className="text-xs mb-1" style={{ color: colors.text }}>{type || 'Sin tipo'}</p>
                  <p className="text-lg font-semibold" style={{ color: colors.text }}>{count} <span className="text-sm font-normal opacity-70">({((count/stats.total)*100).toFixed(0)}%)</span></p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="w-20 h-20 mb-4 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
              {Icons.clock}
            </div>
            <p className="text-lg font-medium text-slate-300">No hay eventos</p>
            <p className="text-sm">Intenta ajustar los filtros</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical con gradiente */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/50 via-slate-600/50 to-transparent"></div>
            
            {/* Grupos por fecha */}
            {groupedEvents.map((group, groupIdx) => (
              <div key={group.date.toISOString()} className="mb-8 last:mb-0 animate-fadeIn" style={{ animationDelay: `${groupIdx * 50}ms` }}>
                {/* Fecha header */}
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-indigo-400/50 flex items-center justify-center z-10 shadow-lg shadow-indigo-500/20">
                    <span className="text-xs font-bold text-white">{group.date.getDate()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-300">{group.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-slate-400">{group.events.length} eventos</span>
                  </div>
                </div>
                
                {/* Eventos del día */}
                <div className="ml-12 space-y-2">
                  {group.events.map((event, eventIdx) => (
                    <div
                      key={event._id || `${groupIdx}-${eventIdx}`}
                      onClick={() => setSelectedEvent(event)}
                      className={`relative rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg group ${compactMode ? 'p-2' : 'p-4'}`}
                      style={{
                        backgroundColor: event._colors.bg,
                        borderLeftColor: event._colors.border,
                        boxShadow: `inset 0 0 20px ${event._colors.glow}`,
                      }}
                    >
                      {/* Dot en timeline */}
                      <div 
                        className="absolute -left-[3.25rem] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-4 ring-slate-900 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: event._colors.dot, boxShadow: `0 0 10px ${event._colors.dot}` }}
                      />
                      
                      {compactMode ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {event._icon && <span className="text-sm">{event._icon}</span>}
                            <span className="font-medium text-slate-200 truncate">{event._title}</span>
                            {event._type && (
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: event._colors.bg, color: event._colors.text }}>
                                {event._type}
                              </span>
                            )}
                          </div>
                          <span className="text-xs whitespace-nowrap" style={{ color: event._colors.text }}>{getRelativeTime(event._date)}</span>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {event._icon && <span className="text-lg">{event._icon}</span>}
                              <h4 className="font-medium text-slate-100 truncate">{event._title}</h4>
                            </div>
                            {event._description && (
                              <p className="text-sm text-slate-400 line-clamp-2 mb-2">{event._description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs">
                              {event._type && (
                                <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: event._colors.bg, color: event._colors.text, border: `1px solid ${event._colors.border}40` }}>
                                  {event._type}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-slate-500">
                                {Icons.clock} {formatTime(event._date)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: event._colors.bg, color: event._colors.text }}>
                            {getRelativeTime(event._date)}
                          </span>
                        </div>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedEvent(null)}>
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-slate-700/50 animate-scaleIn" onClick={e => e.stopPropagation()}>
            {/* Header con gradiente */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${selectedEvent._colors.bg} 0%, rgba(30, 41, 59, 0.9) 100%)`, borderBottom: `2px solid ${selectedEvent._colors.border}` }}
            >
              <div className="flex items-center gap-3">
                {selectedEvent._icon && <span className="text-3xl">{selectedEvent._icon}</span>}
                <h3 className="text-xl font-semibold text-slate-100">{selectedEvent._title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {Icons.x}
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Info cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">{Icons.calendar} Fecha</p>
                  <p className="text-sm font-medium text-slate-200">{formatDate(selectedEvent._date)}</p>
                </div>
                {formatTime(selectedEvent._date) && (
                  <div className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">{Icons.clock} Hora</p>
                    <p className="text-sm font-medium text-slate-200">{formatTime(selectedEvent._date)}</p>
                  </div>
                )}
                {selectedEvent._type && (
                  <div className="px-3 py-2 rounded-lg border" style={{ backgroundColor: selectedEvent._colors.bg, borderColor: selectedEvent._colors.border + '40' }}>
                    <p className="text-xs mb-1" style={{ color: selectedEvent._colors.text }}>Tipo</p>
                    <p className="text-sm font-medium" style={{ color: selectedEvent._colors.text }}>{selectedEvent._type}</p>
                  </div>
                )}
              </div>
              
              {selectedEvent._description && (
                <div className="px-4 py-3 rounded-lg bg-slate-700/20 border border-slate-600/30">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Descripción</p>
                  <p className="text-slate-300 leading-relaxed">{selectedEvent._description}</p>
                </div>
              )}
              
              {/* Datos adicionales */}
              {Object.keys(selectedEvent).filter(k => !k.startsWith('_')).length > 0 && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Datos adicionales</p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {Object.entries(selectedEvent)
                      .filter(([k]) => !k.startsWith('_') && !['date', 'title', 'description', 'type', 'icon', 'id'].includes(k.toLowerCase()))
                      .map(([key, value]) => (
                        <div key={key} className="px-3 py-2 rounded-lg bg-slate-700/20 border border-slate-600/20">
                          <span className="text-xs text-slate-500 block mb-1">{key}</span>
                          <span className="text-sm text-slate-300 truncate block">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-800/50">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}
