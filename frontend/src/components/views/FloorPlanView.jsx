/**
 * FloorPlanView - Panel de Gestión de Mesas
 * Vista profesional para restaurantes con estado en tiempo real
 */
import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';

// Configuración de estados con diseño moderno
const STATUS_CONFIG = {
  available: { 
    label: 'Disponible', 
    color: '#10B981', 
    bgClass: 'from-emerald-500/20 to-emerald-600/10',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    glowClass: 'shadow-emerald-500/20',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
  },
  reserved: { 
    label: 'Reservada', 
    color: '#F59E0B',
    bgClass: 'from-amber-500/20 to-amber-600/10',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    glowClass: 'shadow-amber-500/20',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
  },
  occupied: { 
    label: 'Ocupada', 
    color: '#EF4444',
    bgClass: 'from-red-500/20 to-red-600/10',
    borderClass: 'border-red-500/40',
    textClass: 'text-red-400',
    glowClass: 'shadow-red-500/20',
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
  },
  blocked: { 
    label: 'Bloqueada', 
    color: '#6B7280',
    bgClass: 'from-slate-500/20 to-slate-600/10',
    borderClass: 'border-slate-500/40',
    textClass: 'text-slate-400',
    glowClass: 'shadow-slate-500/20',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/50',
    text: 'text-slate-400',
  },
};

const Icons = {
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  table: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  ),
  check: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Componente de tarjeta de mesa mejorado
function TableCard({ table, onClick, isSelected }) {
  const statusConfig = STATUS_CONFIG[table._status] || STATUS_CONFIG.available;
  const isNumericId = /^\d+$/.test(String(table._identifier));
  const displayName = table._displayName || table._identifier;
  const shortId = isNumericId ? table._identifier : (displayName?.charAt(0)?.toUpperCase() || '#');
  
  return (
    <button
      onClick={() => onClick(table)}
      className={`
        group relative w-full p-4 rounded-2xl border-2 transition-all duration-300
        bg-slate-800/40 ${statusConfig.borderClass}
        hover:scale-[1.02] hover:shadow-xl ${statusConfig.glowClass}
        ${isSelected ? 'ring-2 ring-white/30 scale-[1.02]' : ''}
        text-left overflow-hidden
      `}
    >
      {/* Header con identificador y nombre */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusConfig.bg} border ${statusConfig.border}`}>
          <span className="text-lg font-bold text-white">{shortId}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate">{displayName}</h3>
          {/* Capacidad con icono */}
          {table._capacity && (
            <div className="flex items-center gap-1.5 mt-1 text-slate-400">
              {Icons.users}
              <span className="text-xs">{table._capacity}</span>
            </div>
          )}
          {/* Fecha y Hora */}
          {table._fechaHora && (
            <div className="flex items-center gap-1.5 mt-0.5 text-slate-400">
              {Icons.calendar}
              <span className="text-xs">{table._fechaHora}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Estado */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/50 ${statusConfig.textClass}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusConfig.color }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: statusConfig.color }} />
        </span>
        <span className="text-xs font-semibold">{statusConfig.label}</span>
      </div>
      
      {/* Cliente si hay reserva */}
      {table._cliente && (
        <div className="mt-2 pt-2 border-t border-slate-700/30">
          <p className="text-xs text-slate-300 truncate font-medium">{table._cliente}</p>
        </div>
      )}
    </button>
  );
}

// Componente de estadísticas mejorado
function StatsBar({ stats }) {
  const statItems = [
    { key: 'available', label: 'Disponible', value: stats.available, ...STATUS_CONFIG.available },
    { key: 'reserved', label: 'Reservada', value: stats.reserved, ...STATUS_CONFIG.reserved },
    { key: 'occupied', label: 'Ocupada', value: stats.occupied, ...STATUS_CONFIG.occupied },
  ];
  
  if (stats.blocked > 0) {
    statItems.push({ key: 'blocked', label: 'Bloqueada', value: stats.blocked, ...STATUS_CONFIG.blocked });
  }
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      {statItems.map(stat => (
        <div
          key={stat.key}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${stat.bg} border ${stat.border}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: stat.color }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: stat.color }} />
          </span>
          <span className="text-sm font-bold text-white">{stat.value}</span>
          <span className={`text-xs ${stat.text}`}>{stat.label}</span>
        </div>
      ))}
      
      {/* Total */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <span className="text-sm font-bold text-white">{stats.total}</span>
        <span className="text-xs text-slate-400">Total</span>
      </div>
    </div>
  );
}

// Modal de detalle de mesa profesional
function TableDetailModal({ table, onClose }) {
  if (!table) return null;
  
  const statusConfig = STATUS_CONFIG[table._status] || STATUS_CONFIG.available;
  const isNumericId = /^\d+$/.test(String(table._identifier));
  const shortId = isNumericId ? table._identifier : (table._displayName?.charAt(0)?.toUpperCase() || '#');
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative px-6 py-5 ${statusConfig.bg}`}>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-900/30 border-2 ${statusConfig.border}`}>
                <span className="text-2xl font-bold text-white">{shortId}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{table._displayName}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-200">
                  {table._capacity && (
                    <span className="flex items-center gap-1.5">
                      {Icons.users}
                      {table._capacity}
                    </span>
                  )}
                  {table._zone && table._zone !== 'General' && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/30 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {table._zone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-900/30 text-slate-200 hover:text-white transition-colors"
            >
              {Icons.close}
            </button>
          </div>
          
          {/* Badge de estado */}
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 ${statusConfig.text}`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusConfig.color }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: statusConfig.color }} />
            </span>
            <span className="text-sm font-semibold">{statusConfig.label}</span>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="px-6 py-5 space-y-4">
          {/* Info de reserva actual si hay cliente/hora */}
          {(table._cliente || table._fechaHora) && (
            <div className={`p-4 rounded-2xl ${statusConfig.bg} border ${statusConfig.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.text}`}>
                  {table._status === 'occupied' ? Icons.users : Icons.calendar}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${statusConfig.text}`}>
                  {table._status === 'occupied' ? 'Ocupada por' : table._status === 'reserved' ? 'Reservada para' : 'Cliente'}
                </span>
              </div>
              {table._cliente && (
                <p className="text-lg font-semibold text-white mb-2">{table._cliente}</p>
              )}
              {table._fechaHora && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  {Icons.calendar}
                  <span>{table._fechaHora}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Reserva actual del sistema de reservas */}
          {table._currentReservation && !table._cliente && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                  {Icons.clock}
                </div>
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Ocupación Actual</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {table._currentReservation.cliente || table._currentReservation.nombre || 'Cliente'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span>{table._currentReservation.hora || table._currentReservation.time}</span>
                <span>•</span>
                <span>{table._currentReservation.personas || table._capacity} personas</span>
              </div>
            </div>
          )}
          
          {/* Próxima reserva */}
          {table._nextReservation && !table._currentReservation && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  {Icons.calendar}
                </div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Próxima Reserva</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {table._nextReservation.cliente || table._nextReservation.nombre || 'Cliente'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span>{table._nextReservation.hora || table._nextReservation.time}</span>
                <span>•</span>
                <span>{table._nextReservation.personas || table._capacity} personas</span>
              </div>
            </div>
          )}
          
          {/* Lista de reservas de hoy */}
          {table._todayReservations?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Reservas de Hoy
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400">
                  {table._todayReservations.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {table._todayReservations.map((res, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-200">
                          {res.cliente || res.nombre || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {res.personas || '?'} pers.
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-400">{res.hora}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Sin reservas */}
          {table._status === 'available' && (!table._todayReservations || table._todayReservations.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                {Icons.check}
              </div>
              <p className="text-lg font-semibold text-emerald-400">Mesa Disponible</p>
              <p className="text-sm text-slate-500 mt-1">Sin reservas programadas para hoy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FloorPlanView({ data, fieldMap, viewConfig, onRefresh }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Procesar y agrupar datos
  const { zones, tables, stats } = useMemo(() => {
    const zonesSet = new Set();
    let available = 0, reserved = 0, occupied = 0, blocked = 0;
    
    const processedTables = (data || []).map(item => {
      // Los datos originales están en _raw (después de la transformación del backend)
      const raw = item._raw || item;
      
      const zone = raw[fieldMap?.zone] || raw.zone || raw.zona || item.zone || 'General';
      
      // Obtener número de mesa desde los datos originales
      let numero = null;
      if (raw.numero !== undefined && raw.numero !== null && raw.numero !== '') numero = raw.numero;
      else if (raw.numero_mesa) numero = raw.numero_mesa;
      else if (raw.mesa) numero = raw.mesa;
      else if (raw.table_number) numero = raw.table_number;
      
      // Obtener nombre del cliente desde datos originales
      const cliente = raw.cliente || raw.customer || raw.reservado_por || raw.nombre_cliente || '';
      
      // Determinar el identificador para mostrar
      const identifier = numero !== null ? numero : item._id?.slice(-4);
      const isNumericId = numero !== null && /^\d+$/.test(String(numero));
      
      // Mostrar SOLO el nombre del cliente
      const displayName = cliente || `Mesa ${identifier}`;
      
      // Capacidad desde datos originales
      const capacityRaw = raw.capacidad || raw.capacity || raw.personas || item[fieldMap?.capacity];
      const capacity = capacityRaw ? `${capacityRaw} personas` : '';
      
      // Fecha y Hora desde datos originales
      const fechaHora = raw.fecha_hora || raw.hora || raw.hora_reserva || raw.time || raw.datetime || '';
      
      // Estado desde datos originales
      const rawStatus = item._computedStatus || raw.estado || raw.status || item[fieldMap?.status] || 'available';
      const STATUS_MAP = {
        'disponible': 'available',
        'reservada': 'reserved', 
        'reservado': 'reserved',
        'ocupada': 'occupied',
        'ocupado': 'occupied',
        'bloqueada': 'blocked',
        'bloqueado': 'blocked',
        'available': 'available',
        'reserved': 'reserved',
        'occupied': 'occupied',
        'blocked': 'blocked',
      };
      const status = STATUS_MAP[String(rawStatus).toLowerCase()] || 'available';
      
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
        _displayName: displayName,
        _capacity: capacity,
        _fechaHora: fechaHora,
        _cliente: cliente,
        _status: status,
        _currentReservation: item._currentReservation,
        _nextReservation: item._nextReservation,
        _todayReservations: item._todayReservations || [],
      };
    });
    
    return {
      zones: ['all', ...Array.from(zonesSet).sort()],
      tables: processedTables,
      stats: { available, reserved, occupied, blocked, total: data?.length || 0 },
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
  
  return (
    <div className="space-y-5">
      {/* Header con stats y filtros */}
      <div className="flex flex-col gap-4">
        {/* Stats */}
        <StatsBar stats={stats} />
        
        {/* Filtros como chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de zona */}
          {zones.length > 2 && (
            <>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Zona:</span>
              {zones.map(zone => (
                <button
                  key={zone}
                  onClick={() => setFilterZone(zone)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterZone === zone
                      ? 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {zone === 'all' ? 'Todas' : zone}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-700/50 mx-2" />
            </>
          )}
          
          {/* Filtro de estado */}
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Estado:</span>
          {[
            { value: 'all', label: 'Todos' },
            { value: 'available', label: 'Disponible', config: STATUS_CONFIG.available },
            { value: 'reserved', label: 'Reservada', config: STATUS_CONFIG.reserved },
            { value: 'occupied', label: 'Ocupada', config: STATUS_CONFIG.occupied },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setFilterStatus(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterStatus === item.value
                  ? item.config 
                    ? `${item.config.bg} border ${item.config.border} ${item.config.text}`
                    : 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {item.config && filterStatus === item.value && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.config.color }} />
              )}
              {item.label}
            </button>
          ))}
          
          {/* Botón refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="ml-auto p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              title="Actualizar"
            >
              {Icons.refresh}
            </button>
          )}
        </div>
      </div>
      
      {/* Grid de mesas agrupadas por zona */}
      {zones.length > 2 && filterZone === 'all' ? (
        // Vista agrupada por zonas
        <div className="space-y-6">
          {zones.filter(z => z !== 'all').map(zone => {
            const zoneTables = filteredTables.filter(t => t._zone === zone);
            if (zoneTables.length === 0) return null;
            
            return (
              <div key={zone} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{zone}</h3>
                  <span className="text-xs text-slate-500">({zoneTables.length})</span>
                  <div className="flex-1 h-px bg-slate-700/50" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {zoneTables.map((table, index) => (
                    <TableCard
                      key={table._id || index}
                      table={table}
                      onClick={setSelectedTable}
                      isSelected={selectedTable?._id === table._id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista plana (sin agrupar)
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredTables.map((table, index) => (
            <TableCard
              key={table._id || index}
              table={table}
              onClick={setSelectedTable}
              isSelected={selectedTable?._id === table._id}
            />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {filteredTables.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-500">
            {Icons.table}
          </div>
          <p className="text-lg font-semibold text-slate-300">No hay mesas que mostrar</p>
          <p className="text-sm text-slate-500 mt-1">
            {filterZone !== 'all' || filterStatus !== 'all' 
              ? 'Prueba ajustando los filtros'
              : 'Agrega mesas a tu tabla de datos'}
          </p>
        </div>
      )}
      
      {/* Modal de detalle */}
      <TableDetailModal 
        table={selectedTable} 
        onClose={() => setSelectedTable(null)} 
      />
    </div>
  );
}
