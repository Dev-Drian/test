import { useState, useMemo } from 'react';

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Si ya tiene formato HH:mm, convertir a 12h
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
  start.setDate(start.getDate() - start.getDay()); // Domingo
  
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
  
  // Días del mes anterior para completar la primera semana
  const startOffset = firstDay.getDay();
  const days = [];
  
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = new Date(year, month, -i);
    days.push({ date: day, currentMonth: false });
  }
  
  // Días del mes actual
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), currentMonth: true });
  }
  
  // Días del mes siguiente para completar la última semana
  const remaining = 42 - days.length; // 6 semanas * 7 días
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
};

export default function CalendarView({ view, data, meta, onRefresh }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(view?.viewConfig?.defaultView || 'month');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Procesar eventos
  const events = useMemo(() => {
    if (!data) return [];
    return data.map(item => {
      // Parsear fecha
      let startDate = null;
      if (item.start) {
        // Puede ser fecha completa o solo hora
        if (item.start.includes('T') || item.start.includes('-')) {
          startDate = new Date(item.start);
        } else if (item._raw?.fecha) {
          // Si start es hora y tenemos fecha en raw
          startDate = new Date(`${item._raw.fecha}T${item.start}`);
        }
      }
      
      return {
        ...item,
        startDate,
        displayTitle: item.title || 'Sin título',
        displayTime: formatTime(item.start),
      };
    }).filter(e => e.startDate && !isNaN(e.startDate));
  }, [data]);
  
  // Obtener eventos de un día
  const getEventsForDay = (date) => {
    return events.filter(e => isSameDay(e.startDate, date));
  };
  
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
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    return (
      <div className="flex flex-col h-full">
        {/* Header de días */}
        <div className="grid grid-cols-7 border-b border-slate-700/50">
          {weekDays.map(day => (
            <div key={day} className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {monthDays.map(({ date, currentMonth }, idx) => {
            const dayEvents = getEventsForDay(date);
            const isToday = isSameDay(date, new Date());
            
            return (
              <div 
                key={idx}
                className={`min-h-[100px] border-b border-r border-slate-700/30 p-1 ${
                  !currentMonth ? 'bg-slate-800/30' : ''
                } ${isToday ? 'bg-indigo-500/10' : ''}`}
              >
                <div className={`text-sm mb-1 ${
                  isToday 
                    ? 'w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center mx-auto' 
                    : currentMonth 
                      ? 'text-slate-300 text-center' 
                      : 'text-slate-600 text-center'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedEvent(event)}
                      className="px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: `${event.color || view?.color || '#4F46E5'}20`,
                        color: event.color || view?.color || '#818CF8',
                      }}
                    >
                      {event.displayTime && <span className="font-medium">{event.displayTime} </span>}
                      {event.displayTitle}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-slate-500 px-1">
                      +{dayEvents.length - 3} más
                    </div>
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
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am - 7pm
    
    return (
      <div className="flex flex-col h-full overflow-auto">
        {/* Header de días */}
        <div className="grid grid-cols-8 border-b border-slate-700/50 sticky top-0 bg-slate-900 z-10">
          <div className="w-16 shrink-0"></div>
          {weekDays.map((date, i) => {
            const isToday = isSameDay(date, new Date());
            return (
              <div key={i} className="px-2 py-3 text-center border-l border-slate-700/30">
                <div className="text-xs text-slate-400 uppercase">
                  {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-medium ${isToday ? 'text-indigo-400' : 'text-slate-200'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Grid de horas */}
        <div className="flex-1">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-700/20 min-h-[60px]">
              <div className="w-16 shrink-0 px-2 py-1 text-xs text-slate-500 text-right">
                {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
              </div>
              {weekDays.map((date, i) => {
                const dayEvents = getEventsForDay(date).filter(e => {
                  const eventHour = e.startDate.getHours();
                  return eventHour === hour;
                });
                
                return (
                  <div key={i} className="border-l border-slate-700/30 p-1 relative">
                    {dayEvents.map((event, j) => (
                      <div
                        key={j}
                        onClick={() => setSelectedEvent(event)}
                        className="px-2 py-1 rounded text-xs cursor-pointer mb-1"
                        style={{ 
                          backgroundColor: `${event.color || view?.color || '#4F46E5'}30`,
                          borderLeft: `3px solid ${event.color || view?.color || '#4F46E5'}`,
                        }}
                      >
                        <div className="font-medium text-slate-200">{event.displayTitle}</div>
                        <div className="text-slate-400">{event.displayTime}</div>
                      </div>
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
    <div className="h-full flex flex-col bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {Icons.chevronLeft}
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {Icons.chevronRight}
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            Hoy
          </button>
          <h2 className="text-lg font-medium text-slate-200 capitalize ml-2">
            {monthName}
          </h2>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-700/40 rounded-lg p-1">
          {['month', 'week'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode 
                  ? 'bg-slate-600 text-slate-100' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'month' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Calendar */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedEvent(null)}>
          <div 
            className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="h-2"
              style={{ backgroundColor: selectedEvent.color || view?.color || '#4F46E5' }}
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">
                {selectedEvent.displayTitle}
              </h3>
              
              <div className="space-y-3">
                {selectedEvent.startDate && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    <span>{formatDate(selectedEvent.startDate)} {selectedEvent.displayTime}</span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div className="text-slate-400 text-sm">
                    {selectedEvent.description}
                  </div>
                )}
                
                {/* Mostrar datos originales */}
                {selectedEvent._raw && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Datos originales</p>
                    <div className="space-y-1">
                      {Object.entries(selectedEvent._raw)
                        .filter(([k]) => !k.startsWith('_'))
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500">{key}</span>
                            <span className="text-slate-300">{String(value)}</span>
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
