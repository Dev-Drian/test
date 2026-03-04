import { useState, useMemo } from 'react';

// Colores predefinidos para eventos
const EVENT_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#a5b4fc' },   // Indigo
  { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#6ee7b7' },   // Emerald
  { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fcd34d' },   // Amber
  { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },    // Red
  { bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', text: '#c4b5fd' },   // Violet
  { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', text: '#67e8f9' },    // Cyan
  { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#f9a8d4' },   // Pink
];

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
};

const getWeekDays = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
};

const getMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startOffset = firstDay.getDay();
  const days = [];
  
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = new Date(year, month, -i);
    days.push({ date: day, currentMonth: false });
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), currentMonth: true });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), currentMonth: false });
  }
  
  return days;
};

const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
};

const Icons = {
  chevronLeft: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>,
  chevronRight: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>,
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  clock: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  info: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
};

export default function CalendarView({ view, data, meta, onRefresh }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(view?.viewConfig?.defaultView || 'month');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Procesar eventos
  const events = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => {
      let startDate = null;
      const startValue = item.start;
      
      if (startValue) {
        const startStr = typeof startValue === 'string' 
          ? startValue 
          : (startValue instanceof Date 
              ? startValue.toISOString() 
              : String(startValue));
        
        if (startStr.includes('T') || startStr.includes('-')) {
          startDate = new Date(startStr);
        } else if (item._raw?.fecha) {
          startDate = new Date(`${item._raw.fecha}T${startStr}`);
        }
      }
      
      // Asignar color basado en índice o categoría
      const colorIndex = index % EVENT_COLORS.length;
      const color = EVENT_COLORS[colorIndex];
      
      return {
        ...item,
        startDate,
        displayTitle: item.title || 'Sin título',
        displayTime: formatTime(item.start),
        colorScheme: color,
      };
    }).filter(e => e.startDate && !isNaN(e.startDate));
  }, [data]);
  
  // Obtener eventos de un día
  const getEventsForDay = (date) => {
    return events.filter(e => isSameDay(e.startDate, date));
  };
  
  // Contar eventos del mes actual
  const monthEventCount = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return events.filter(e => {
      return e.startDate.getFullYear() === year && e.startDate.getMonth() === month;
    }).length;
  }, [events, currentDate]);
  
  // Navegación
  const goToPrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };
  
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Renderizar vista de mes
  const renderMonthView = () => {
    const monthDays = getMonthDays(currentDate);
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    return (
      <div className="flex flex-col h-full">
        {/* Header de días de la semana */}
        <div className="grid grid-cols-7 bg-gradient-to-r from-slate-800/80 to-slate-800/40 border-b border-slate-700/40">
          {weekDays.map((day, i) => (
            <div 
              key={day} 
              className={`px-3 py-4 text-center ${
                i === 0 || i === 6 ? 'text-indigo-400/80' : 'text-slate-400'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                {day.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {monthDays.map(({ date, currentMonth }, idx) => {
            const dayEvents = getEventsForDay(date);
            const isToday = isSameDay(date, new Date());
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const hasEvents = dayEvents.length > 0;
            
            return (
              <div 
                key={idx}
                className={`
                  relative min-h-[110px] border-b border-r border-slate-700/20 p-2
                  transition-all duration-200
                  ${!currentMonth ? 'bg-slate-900/40' : isWeekend ? 'bg-slate-800/20' : 'bg-transparent'}
                  ${isToday ? 'ring-2 ring-inset ring-indigo-500/50 bg-indigo-500/5' : ''}
                  hover:bg-slate-700/20
                `}
              >
                {/* Número del día */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    transition-all
                    ${isToday 
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : currentMonth 
                        ? 'text-slate-200 hover:bg-slate-700/50' 
                        : 'text-slate-600'
                    }
                  `}>
                    {date.getDate()}
                  </div>
                  {hasEvents && currentMonth && (
                    <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                
                {/* Eventos del día */}
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left px-2 py-1 rounded-md text-xs truncate 
                        transition-all duration-150 hover:scale-[1.02] hover:shadow-md
                        cursor-pointer group"
                      style={{ 
                        backgroundColor: event.colorScheme.bg,
                        borderLeft: `3px solid ${event.colorScheme.border}`,
                      }}
                    >
                      <span 
                        className="font-medium group-hover:underline"
                        style={{ color: event.colorScheme.text }}
                      >
                        {event.displayTime && (
                          <span className="opacity-80">{event.displayTime} · </span>
                        )}
                        {event.displayTitle}
                      </span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={() => {
                        setSelectedEvent({ 
                          isMultiple: true, 
                          events: dayEvents,
                          date 
                        });
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 
                        hover:bg-indigo-500/10 rounded transition-colors w-full text-left"
                    >
                      +{dayEvents.length - 3} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Renderizar vista de semana
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm
    
    return (
      <div className="flex flex-col h-full overflow-auto">
        {/* Header de días */}
        <div className="grid grid-cols-8 border-b border-slate-700/50 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="w-20 shrink-0 border-r border-slate-700/30"></div>
          {weekDays.map((date, i) => {
            const isToday = isSameDay(date, new Date());
            const dayEvents = getEventsForDay(date);
            
            return (
              <div 
                key={i} 
                className={`
                  px-2 py-4 text-center border-r border-slate-700/30
                  ${isToday ? 'bg-indigo-500/10' : ''}
                `}
              >
                <div className={`text-xs uppercase tracking-wider ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
                <div className={`
                  text-2xl font-semibold mt-1
                  ${isToday ? 'text-indigo-400' : 'text-slate-200'}
                `}>
                  {date.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-1">
                    <span className={`
                      text-[10px] font-medium px-2 py-0.5 rounded-full
                      ${isToday ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700/50 text-slate-400'}
                    `}>
                      {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Grid de horas */}
        <div className="flex-1">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-700/20 min-h-[70px] group">
              <div className="w-20 shrink-0 px-3 py-2 text-right border-r border-slate-700/30 bg-slate-800/30">
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                  {hour > 12 ? hour - 12 : hour}:00
                </span>
                <span className="text-[10px] text-slate-600 ml-1">
                  {hour >= 12 ? 'PM' : 'AM'}
                </span>
              </div>
              {weekDays.map((date, i) => {
                const dayEvents = getEventsForDay(date).filter(e => {
                  const eventHour = e.startDate.getHours();
                  return eventHour === hour;
                });
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div 
                    key={i} 
                    className={`
                      border-r border-slate-700/20 p-1.5 relative
                      hover:bg-slate-700/10 transition-colors
                      ${isToday ? 'bg-indigo-500/5' : ''}
                    `}
                  >
                    {dayEvents.map((event, j) => (
                      <button
                        key={j}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left px-3 py-2 rounded-lg mb-1 
                          cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                        style={{ 
                          backgroundColor: event.colorScheme.bg,
                          borderLeft: `4px solid ${event.colorScheme.border}`,
                        }}
                      >
                        <div 
                          className="font-medium text-sm truncate"
                          style={{ color: event.colorScheme.text }}
                        >
                          {event.displayTitle}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {event.displayTime}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Toolbar mejorado */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          {/* Navegación */}
          <div className="flex items-center gap-1 bg-slate-700/30 rounded-lg p-1">
            <button
              onClick={goToPrev}
              className="p-2 rounded-md hover:bg-slate-600/50 text-slate-400 hover:text-white transition-all"
              title="Anterior"
            >
              {Icons.chevronLeft}
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 rounded-md hover:bg-slate-600/50 text-slate-400 hover:text-white text-sm font-medium transition-all"
            >
              Hoy
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-md hover:bg-slate-600/50 text-slate-400 hover:text-white transition-all"
              title="Siguiente"
            >
              {Icons.chevronRight}
            </button>
          </div>
          
          {/* Título del mes/semana */}
          <h2 className="text-xl font-semibold text-white capitalize flex items-center gap-3">
            {monthName}
            {monthEventCount > 0 && (
              <span className="text-sm font-normal text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
                {monthEventCount} evento{monthEventCount > 1 ? 's' : ''}
              </span>
            )}
          </h2>
        </div>
        
        {/* Selector de vista */}
        <div className="flex items-center gap-1 bg-slate-700/30 rounded-lg p-1">
          {[
            { mode: 'month', label: 'Mes' },
            { mode: 'week', label: 'Semana' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all
                ${viewMode === mode 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Calendario */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
      
      {/* Leyenda de eventos (footer) */}
      {events.length > 0 && viewMode === 'month' && (
        <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                {Icons.info}
                Click en un evento para ver detalles
              </span>
            </div>
            <div className="text-sm text-slate-500">
              Total: <span className="text-indigo-400 font-medium">{events.length}</span> eventos
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de detalle de evento */}
      {selectedEvent && !selectedEvent.isMultiple && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header con gradiente */}
            <div 
              className="h-2"
              style={{ 
                background: `linear-gradient(90deg, ${selectedEvent.colorScheme?.border || '#6366f1'}, ${selectedEvent.colorScheme?.border || '#6366f1'}88)`
              }}
            />
            
            <div className="p-6">
              {/* Título */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-white leading-tight">
                  {selectedEvent.displayTitle}
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  {Icons.x}
                </button>
              </div>
              
              {/* Fecha y hora */}
              <div className="space-y-4 mb-6">
                {selectedEvent.startDate && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      {Icons.calendar}
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Fecha</div>
                      <div className="text-white font-medium capitalize">
                        {formatDate(selectedEvent.startDate)}
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedEvent.displayTime && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      {Icons.clock}
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Hora</div>
                      <div className="text-white font-medium">
                        {selectedEvent.displayTime}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descripción */}
              {selectedEvent.description && (
                <div className="mb-6 p-4 rounded-xl bg-slate-700/20">
                  <div className="text-sm text-slate-400 mb-2">Descripción</div>
                  <p className="text-slate-200">{selectedEvent.description}</p>
                </div>
              )}
              
              {/* Datos originales */}
              {selectedEvent._raw && (
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-700"></span>
                    Información adicional
                    <span className="flex-1 h-px bg-slate-700"></span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedEvent._raw)
                      .filter(([k]) => !k.startsWith('_'))
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key} className="bg-slate-700/20 rounded-lg p-2">
                          <div className="text-[10px] text-slate-500 uppercase truncate">{key}</div>
                          <div className="text-sm text-slate-200 truncate" title={String(value)}>
                            {String(value)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para múltiples eventos de un día */}
      {selectedEvent?.isMultiple && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="w-full max-w-md max-h-[80vh] bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white capitalize">
                {selectedEvent.date.toLocaleDateString('es-ES', { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                {Icons.x}
              </button>
            </div>
            
            {/* Lista de eventos */}
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {selectedEvent.events.map((event, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-4 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ 
                    backgroundColor: event.colorScheme.bg,
                    borderLeft: `4px solid ${event.colorScheme.border}`,
                  }}
                >
                  <div 
                    className="font-medium"
                    style={{ color: event.colorScheme.text }}
                  >
                    {event.displayTitle}
                  </div>
                  {event.displayTime && (
                    <div className="text-sm text-slate-400 mt-1">
                      {event.displayTime}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
