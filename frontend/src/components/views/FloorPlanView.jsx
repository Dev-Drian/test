import { useState, useMemo } from 'react';

const STATUS_CONFIG = {
  available: { label: 'Libre', color: '#10B981', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  reserved: { label: 'Reservada', color: '#F59E0B', bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
  occupied: { label: 'Ocupada', color: '#EF4444', bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  blocked: { label: 'No disponible', color: '#6B7280', bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400' },
};

const Icons = {
  users: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  clock: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  close: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
};

export default function FloorPlanView({ data, fieldMap, viewConfig, onRefresh }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Agrupar mesas por zona
  const { zones, tables, stats } = useMemo(() => {
    const zonesSet = new Set();
    let available = 0, reserved = 0, occupied = 0, blocked = 0;
    
    const processedTables = data.map(item => {
      const zone = item[fieldMap.zone] || item.zone || item.zona || 'Sin zona';
      const identifier = item[fieldMap.identifier] || item.identifier || item.numero || item.nombre || item._id;
      const capacity = item[fieldMap.capacity] || item.capacity || item.capacidad || 0;
      const status = item._computedStatus || item[fieldMap.status] || item.status || item.estado || 'available';
      
      zonesSet.add(zone);
      
      // Contar stats
      if (status === 'available') available++;
      else if (status === 'reserved') reserved++;
      else if (status === 'occupied') occupied++;
      else if (status === 'blocked') blocked++;
      
      return {
        ...item,
        _zone: zone,
        _identifier: identifier,
        _capacity: capacity,
        _status: status,
        _currentReservation: item._currentReservation,
        _nextReservation: item._nextReservation,
        _todayReservations: item._todayReservations || [],
      };
    });
    
    return {
      zones: ['all', ...Array.from(zonesSet)],
      tables: processedTables,
      stats: { available, reserved, occupied, blocked, total: data.length },
    };
  }, [data, fieldMap]);
  
  // Filtrar mesas
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      if (filterZone !== 'all' && table._zone !== filterZone) return false;
      if (filterStatus !== 'all' && table._status !== filterStatus) return false;
      return true;
    });
  }, [tables, filterZone, filterStatus]);
  
  // Formatear hora
  const formatTime = (reservation) => {
    if (!reservation) return '';
    const time = reservation.hora || reservation.time || reservation.hora_inicio;
    const client = reservation.cliente || reservation.nombre || reservation.client;
    if (time && client) return `${time} - ${client}`;
    if (time) return time;
    return '';
  };
  
  return (
    <div className="space-y-4">
      {/* Header con stats y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            <span className="text-sm text-slate-300">{stats.available} libres</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <span className="text-sm text-slate-300">{stats.reserved} reservadas</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <span className="text-sm text-slate-300">{stats.occupied} ocupadas</span>
          </div>
          {stats.blocked > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              <span className="text-sm text-slate-300">{stats.blocked} bloqueadas</span>
            </div>
          )}
        </div>
        
        {/* Filtros y refresh */}
        <div className="flex items-center gap-2">
          {/* Filtro por zona */}
          {zones.length > 2 && (
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-sm text-slate-300"
            >
              <option value="all">Todas las zonas</option>
              {zones.filter(z => z !== 'all').map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          )}
          
          {/* Filtro por estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-sm text-slate-300"
          >
            <option value="all">Todos los estados</option>
            <option value="available">Solo libres</option>
            <option value="reserved">Solo reservadas</option>
            <option value="occupied">Solo ocupadas</option>
          </select>
          
          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
              title="Actualizar"
            >
              {Icons.refresh}
            </button>
          )}
        </div>
      </div>
      
      {/* Grid de mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredTables.map((table, index) => {
          const statusConfig = STATUS_CONFIG[table._status] || STATUS_CONFIG.available;
          
          return (
            <button
              key={table._id || index}
              onClick={() => setSelectedTable(table)}
              className={`relative p-4 rounded-xl border-2 ${statusConfig.border} ${statusConfig.bg} hover:scale-105 transition-all duration-200 text-left`}
            >
              {/* Número de mesa */}
              <div className="text-2xl font-bold text-slate-100 mb-2">
                {table._identifier}
              </div>
              
              {/* Capacidad */}
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
                {Icons.users}
                <span>{table._capacity} personas</span>
              </div>
              
              {/* Estado */}
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig.color }}></div>
                {statusConfig.label}
              </div>
              
              {/* Info de reserva si aplica */}
              {(table._status === 'reserved' || table._status === 'occupied') && (
                <div className="mt-2 pt-2 border-t border-slate-600/30">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    {Icons.clock}
                    <span className="truncate">
                      {formatTime(table._currentReservation || table._nextReservation)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Badge de zona */}
              {table._zone && table._zone !== 'Sin zona' && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-600/50 text-slate-400">
                  {table._zone}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Empty state */}
      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">No hay mesas que mostrar</p>
          <p className="text-sm text-slate-500 mt-1">
            {filterZone !== 'all' || filterStatus !== 'all' 
              ? 'Prueba ajustando los filtros'
              : 'Agrega mesas a la tabla de datos'}
          </p>
        </div>
      )}
      
      {/* Modal de detalle de mesa */}
      {selectedTable && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedTable(null)}
        >
          <div 
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 ${STATUS_CONFIG[selectedTable._status]?.bg || 'bg-slate-700/50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">
                    Mesa {selectedTable._identifier}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      {Icons.users} {selectedTable._capacity} personas
                    </span>
                    {selectedTable._zone && selectedTable._zone !== 'Sin zona' && (
                      <span>• {selectedTable._zone}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400"
                >
                  {Icons.close}
                </button>
              </div>
              
              {/* Estado actual */}
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${STATUS_CONFIG[selectedTable._status]?.bg} ${STATUS_CONFIG[selectedTable._status]?.text}`}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[selectedTable._status]?.color }}></div>
                {STATUS_CONFIG[selectedTable._status]?.label || 'Desconocido'}
              </div>
            </div>
            
            {/* Contenido */}
            <div className="px-6 py-4 space-y-4">
              {/* Reserva actual */}
              {selectedTable._currentReservation && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Ocupada ahora</p>
                  <p className="text-slate-200">
                    {selectedTable._currentReservation.cliente || selectedTable._currentReservation.nombre}
                  </p>
                  <p className="text-sm text-slate-400">
                    {selectedTable._currentReservation.hora} - {selectedTable._currentReservation.personas || selectedTable._capacity} personas
                  </p>
                </div>
              )}
              
              {/* Próxima reserva */}
              {selectedTable._nextReservation && !selectedTable._currentReservation && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">Próxima reserva</p>
                  <p className="text-slate-200">
                    {selectedTable._nextReservation.cliente || selectedTable._nextReservation.nombre}
                  </p>
                  <p className="text-sm text-slate-400">
                    {selectedTable._nextReservation.hora} - {selectedTable._nextReservation.personas || selectedTable._capacity} personas
                  </p>
                </div>
              )}
              
              {/* Lista de reservas de hoy */}
              {selectedTable._todayReservations?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Reservas de hoy ({selectedTable._todayReservations.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTable._todayReservations.map((res, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                        <div>
                          <span className="text-slate-300">{res.cliente || res.nombre || '-'}</span>
                          <span className="text-slate-500 text-sm ml-2">
                            {res.personas || '?'} pers.
                          </span>
                        </div>
                        <span className="text-slate-400 text-sm">{res.hora}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sin reservas */}
              {selectedTable._status === 'available' && (!selectedTable._todayReservations || selectedTable._todayReservations.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-emerald-400">Mesa disponible</p>
                  <p className="text-sm text-slate-500">Sin reservas para hoy</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
