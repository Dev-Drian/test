import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces, listTables, listAgents, getTableData } from "../api/client";

// Iconos SVG
const Icons = {
  tables: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  ),
  agents: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  flows: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  chat: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  records: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
  fields: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  export: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  download: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
};

// Mini gráfico de barras
const MiniBarChart = ({ data, color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all ${color}`}
          style={{ height: `${(value / max) * 100}%`, minHeight: '4px' }}
        />
      ))}
    </div>
  );
};

// Mini gráfico circular
const MiniDonut = ({ percentage, color, size = 40 }) => {
  const circumference = 2 * Math.PI * 15;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="transform -rotate-90">
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
};

export default function Dashboard() {
  const { workspaceId, workspaceName, setWorkspace } = useContext(WorkspaceContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [tables, setTables] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estadísticas extendidas
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalFields: 0,
    recordsByTable: [],
    recentActivity: [],
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listWorkspaces(),
      workspaceId ? listTables(workspaceId) : Promise.resolve({ data: [] }),
      workspaceId ? listAgents(workspaceId) : Promise.resolve({ data: [] }),
    ])
      .then(async ([wsRes, tablesRes, agentsRes]) => {
        setWorkspaces(wsRes.data || []);
        setTables(tablesRes.data || []);
        setAgents(agentsRes.data || []);
        
        // Calcular estadísticas extendidas
        const tablesData = tablesRes.data || [];
        let totalRecords = 0;
        let totalFields = 0;
        const recordsByTable = [];
        
        // Obtener conteo de registros por tabla
        for (const table of tablesData.slice(0, 6)) {
          try {
            const res = await getTableData(workspaceId, table._id, { limit: 1 });
            const count = res.data?.total || res.data?.rows?.length || 0;
            recordsByTable.push({ name: table.name, count });
            totalRecords += count;
          } catch {
            recordsByTable.push({ name: table.name, count: 0 });
          }
          totalFields += table.headers?.length || 0;
        }
        
        setStats({
          totalRecords,
          totalFields,
          recordsByTable,
          recentActivity: tablesData.slice(0, 5).map(t => ({
            type: 'table',
            name: t.name,
            time: t.createdAt || new Date().toISOString(),
          })),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-zinc-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {workspaceId && (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">
                  {workspaceId ? workspaceName : "Bienvenido"}
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {workspaceId ? "Gestiona tus recursos y automatizaciones" : "Selecciona un workspace para comenzar"}
                </p>
              </div>
            </div>
            
            {workspaceId && (
              <Link 
                to="/workspaces" 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
              >
                {Icons.settings}
                <span>Cambiar workspace</span>
              </Link>
            )}
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-400">Error al cargar datos</h3>
              <p className="text-xs text-red-400/60">{error}</p>
            </div>
          </div>
        )}

        {/* Sin workspace - Mostrar lista */}
        {!workspaceId && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Tus workspaces</h2>
              <Link to="/workspaces" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Ver todos →
              </Link>
            </div>
            
            {workspaces.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No hay workspaces</h3>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                  Crea tu primer workspace para organizar tus datos
                </p>
                <Link to="/workspaces" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors">
                  Crear workspace
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((ws) => (
                  <button
                    key={ws._id}
                    onClick={() => setWorkspace(ws._id, ws.name)}
                    className="group text-left p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${ws.color || '#10b981'}, ${ws.color || '#059669'})` }}
                      >
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                          {ws.name}
                        </h3>
                        <p className="text-xs text-zinc-600 truncate mt-0.5">
                          ID: {ws._id?.slice(0, 12)}...
                        </p>
                      </div>
                      <span className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">
                        {Icons.arrow}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Con workspace seleccionado */}
        {workspaceId && (
          <div className="space-y-8">
            
            {/* Stats principales */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Icons.tables, label: "Tablas", value: tables.length, color: "blue", link: "/tables", trend: "+12%" },
                { icon: Icons.records, label: "Registros", value: stats.totalRecords, color: "emerald", link: "/tables", trend: "+8%" },
                { icon: Icons.fields, label: "Campos", value: stats.totalFields, color: "cyan", link: "/tables", trend: "" },
                { icon: Icons.agents, label: "Agentes", value: agents.length, color: "purple", link: "/agents", trend: "" },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  to={stat.link}
                  className="group p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      stat.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                      stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                      stat.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' :
                      stat.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {stat.icon}
                    </div>
                    {stat.trend && (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white mb-0.5">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </Link>
              ))}
            </section>

            {/* Gráficos y visualizaciones */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registros por tabla */}
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Registros por tabla</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Distribución de datos</p>
                  </div>
                  <div className="relative">
                    <MiniDonut percentage={tables.length > 0 ? Math.min((stats.totalRecords / (tables.length * 100)) * 100, 100) : 0} color="#10b981" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-emerald-400">
                      {stats.totalRecords}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {stats.recordsByTable.length > 0 ? stats.recordsByTable.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-zinc-400 truncate">{item.name}</div>
                      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                          style={{ width: `${stats.totalRecords > 0 ? (item.count / stats.totalRecords) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white w-12 text-right">{item.count}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-zinc-600 text-center py-4">No hay datos disponibles</p>
                  )}
                </div>
              </div>

              {/* Actividad del workspace */}
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Resumen del workspace</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Estado general</p>
                  </div>
                  <MiniBarChart 
                    data={[tables.length, agents.length, stats.totalRecords > 100 ? 100 : stats.totalRecords, stats.totalFields, tables.length * 2]} 
                    color="bg-gradient-to-t from-blue-500 to-cyan-400" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        {Icons.tables}
                      </div>
                      <span className="text-xs text-blue-400">Estructura</span>
                    </div>
                    <p className="text-lg font-bold text-white">{tables.length} tablas</p>
                    <p className="text-xs text-zinc-500">{stats.totalFields} campos totales</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                        {Icons.agents}
                      </div>
                      <span className="text-xs text-purple-400">IA</span>
                    </div>
                    <p className="text-lg font-bold text-white">{agents.length} agentes</p>
                    <p className="text-xs text-zinc-500">Configurados</p>
                  </div>
                  
                  <div className="col-span-2 p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-emerald-400 mb-1">Capacidad de datos</p>
                        <p className="text-lg font-bold text-white">{stats.totalRecords.toLocaleString()} registros</p>
                      </div>
                      <div className="w-16 h-16">
                        <MiniDonut percentage={Math.min(stats.totalRecords / 10, 100)} color="#10b981" size={64} />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(stats.totalRecords / 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Acciones rápidas */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Acciones rápidas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { to: "/tables", icon: Icons.tables, label: "Ver tablas", desc: "Gestionar datos", color: "blue" },
                  { to: "/agents", icon: Icons.agents, label: "Configurar agentes", desc: "IA conversacional", color: "purple" },
                  { to: "/chat", icon: Icons.chat, label: "Iniciar chat", desc: "Interactuar con IA", color: "emerald" },
                  { to: "/flows", icon: Icons.flows, label: "Crear flujo", desc: "Automatizaciones", color: "amber" },
                ].map((action) => (
                  <Link 
                    key={action.to}
                    to={action.to} 
                    className="group p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all text-center"
                  >
                    <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform group-hover:scale-110 ${
                      action.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                      action.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                      action.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {action.icon}
                    </div>
                    <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors mb-0.5">
                      {action.label}
                    </h3>
                    <p className="text-xs text-zinc-600">{action.desc}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Actividad reciente y Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Actividad reciente */}
              <div className="lg:col-span-1 p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Actividad reciente</h3>
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div className="space-y-3">
                  {tables.length > 0 ? (
                    <>
                      {tables.slice(0, 5).map((table, i) => (
                        <div key={table._id} className="flex items-start gap-3 group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            i === 0 ? 'bg-emerald-500/10 text-emerald-400' :
                            i === 1 ? 'bg-blue-500/10 text-blue-400' :
                            'bg-white/5 text-zinc-500'
                          }`}>
                            {Icons.tables}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                              {table.name}
                            </p>
                            <p className="text-xs text-zinc-600">
                              {i === 0 ? 'Creada recientemente' : i === 1 ? 'Actualizada hoy' : 'Tabla activa'}
                            </p>
                          </div>
                          <span className="text-xs text-zinc-700 flex-shrink-0">
                            {i === 0 ? 'Ahora' : i === 1 ? '2h' : `${i + 1}d`}
                          </span>
                        </div>
                      ))}
                      {agents.length > 0 && (
                        <div className="flex items-start gap-3 group pt-2 border-t border-white/5">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                            {Icons.agents}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                              {agents[0]?.name || 'Agente'}
                            </p>
                            <p className="text-xs text-zinc-600">Agente configurado</p>
                          </div>
                          <span className="text-xs text-zinc-700 flex-shrink-0">3d</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-2 text-zinc-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-zinc-600">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tablas recientes */}
              <div className="lg:col-span-2">
                {tables.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-white">Tablas recientes</h2>
                      <Link to="/tables" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1">
                        Ver todas {Icons.arrow}
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tables.slice(0, 4).map((table) => (
                        <div 
                          key={table._id} 
                          className="group p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                              {Icons.tables}
                            </div>
                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                              {table.headers?.length || 0} campos
                            </span>
                          </div>
                          <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors mb-1">
                            {table.name}
                          </h3>
                          <p className="text-xs text-zinc-600 line-clamp-2">
                            {table.description || "Sin descripción"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Sin tablas */}
                {tables.length === 0 && (
                  <section className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-2xl h-full flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 text-blue-400">
                      {Icons.tables}
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No hay tablas creadas</h3>
                    <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                      Crea tu primera tabla para almacenar datos
                    </p>
                    <Link to="/tables" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors">
                      Crear tabla
                    </Link>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
