import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces, listTables, listAgents, getTableData } from "../api/client";

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
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
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

// Stat Card Component
const StatCard = ({ icon, label, value, color, link, trend }) => (
  <Link
    to={link}
    className="group p-5 rounded-xl transition-all duration-200 hover:bg-white/5"
    style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)'
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
        color === 'blue' ? 'bg-violet-500' :
        color === 'green' ? 'bg-emerald-500' :
        color === 'purple' ? 'bg-pink-500' :
        'bg-amber-500'
      }`}>
        {icon}
      </div>
      {trend && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-semibold text-white mb-0.5">{value.toLocaleString()}</p>
    <p className="text-sm text-white/50">{label}</p>
  </Link>
);

// Quick Action Card
const QuickAction = ({ to, icon, label, desc, color }) => (
  <Link 
    to={to} 
    className="group p-5 rounded-xl transition-all duration-200 text-center hover:bg-white/5"
    style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)'
    }}
  >
    <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 text-white ${
      color === 'blue' ? 'bg-violet-500' :
      color === 'purple' ? 'bg-pink-500' :
      color === 'green' ? 'bg-emerald-500' :
      'bg-amber-500'
    }`}>
      {icon}
    </div>
    <h3 className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors mb-0.5">
      {label}
    </h3>
    <p className="text-xs text-white/40">{desc}</p>
  </Link>
);

// Guía paso a paso para nuevos usuarios
const GettingStartedGuide = ({ tables, agents }) => {
  const steps = [
    { 
      id: 1, 
      title: "Crear tu primera tabla", 
      desc: "Define qué información quieres almacenar (clientes, productos, citas...)",
      done: tables.length > 0,
      link: "/tables",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16M9 4v16" /></svg>
    },
    { 
      id: 2, 
      title: "Configurar tu asistente", 
      desc: "Tu asistente de IA aprenderá a usar tus datos",
      done: agents.length > 0,
      link: "/agents",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    },
    { 
      id: 3, 
      title: "¡Empieza a chatear!", 
      desc: "Habla con tu asistente para gestionar tus datos",
      done: tables.length > 0 && agents.length > 0,
      link: "/chat",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    },
  ];
  
  const completedSteps = steps.filter(s => s.done).length;
  const progress = (completedSteps / steps.length) * 100;
  
  return (
    <div className="p-6 rounded-2xl mb-8" style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05))',
      border: '1px solid rgba(139, 92, 246, 0.2)'
    }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Primeros pasos
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Completa estos pasos para empezar a usar tu asistente
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-violet-400">{completedSteps}/{steps.length}</span>
          <p className="text-xs text-white/40">completados</p>
        </div>
      </div>
      
      {/* Barra de progreso */}
      <div className="h-2 bg-white/5 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isCurrent = !step.done && (idx === 0 || steps[idx - 1].done);
          
          return (
            <Link
              key={step.id}
              to={step.link}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                step.done 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : isCurrent
                    ? 'bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/15'
                    : 'bg-white/5 border border-white/10 opacity-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                step.done 
                  ? 'bg-emerald-500 text-white' 
                  : isCurrent
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/10 text-white/40'
              }`}>
                {step.done ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${step.done ? 'text-emerald-400' : 'text-white'}`}>
                  {step.title}
                </h3>
                <p className="text-xs text-white/40">{step.desc}</p>
              </div>
              {isCurrent && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-violet-500 text-white">
                  Siguiente →
                </span>
              )}
              {step.done && (
                <span className="text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </Link>
          );
        })}
      </div>
      
      {completedSteps === steps.length && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-emerald-400 font-medium">🎉 ¡Todo listo! Ya puedes empezar a chatear con tu asistente</p>
          <Link to="/chat" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors">
            Ir al chat
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      )}
    </div>
  );
};

// Icons
const Icons = {
  tables: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16M9 4v16" /></svg>,
  agents: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  flows: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  chat: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  arrow: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>,
  records: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  fields: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
  clock: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  empty: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
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
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a12' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 rounded-full border-violet-500/20" />
            <div className="absolute inset-0 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-white/50">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a12' }}>
      {/* Header simple */}
      <header className="sticky top-0 z-10" style={{ 
        background: 'rgba(10, 10, 18, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)'
      }}>
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {workspaceId && (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white bg-violet-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {workspaceId ? workspaceName : "Bienvenido"}
                </h1>
                <p className="text-sm text-white/40 mt-0.5">
                  {workspaceId ? "Gestiona tus datos con tu asistente de IA" : "Selecciona un proyecto para comenzar"}
                </p>
              </div>
            </div>
            
            {workspaceId && (
              <Link 
                to="/workspaces" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5 text-white/60"
                style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
                <span>Cambiar proyecto</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-error-light border border-error-DEFAULT/20 rounded-xl flex items-center gap-3 animate-fade-up">
            <div className="w-10 h-10 rounded-lg bg-error-DEFAULT/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-error-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-error-DEFAULT">Error al cargar datos</h3>
              <p className="text-xs text-error-DEFAULT/70">{error}</p>
            </div>
          </div>
        )}

        {/* Sin workspace - Mostrar lista */}
        {!workspaceId && (
          <section className="animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-content-primary">Tus proyectos</h2>
              <Link to="/workspaces" className="text-sm text-primary-400 hover:text-primary-300 transition-colors font-medium flex items-center gap-1">
                Ver todos {Icons.arrow}
              </Link>
            </div>
            
            {workspaces.length === 0 ? (
              <div className="text-center py-16 bg-surface-100 border border-surface-300 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
                  {Icons.empty}
                </div>
                <h3 className="text-lg font-medium text-content-primary mb-2">Crea tu primer proyecto</h3>
                <p className="text-sm text-content-tertiary mb-6 max-w-sm mx-auto">
                  Un proyecto agrupa tus datos y tu asistente de IA personalizado
                </p>
                <Link to="/workspaces" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors">
                  {Icons.plus}
                  Crear proyecto
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((ws, index) => (
                  <button
                    key={ws._id}
                    onClick={() => setWorkspace(ws._id, ws.name)}
                    className="group text-left p-5 rounded-xl bg-surface-100 border border-surface-300/50 hover:bg-surface-200 hover:border-surface-400 transition-all duration-200 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${ws.color || '#3b82f6'}, ${ws.color || '#2563eb'})` }}
                      >
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-content-primary group-hover:text-primary-400 transition-colors truncate">
                          {ws.name}
                        </h3>
                        <p className="text-xs text-content-muted truncate mt-0.5">
                          {ws._id?.slice(0, 16)}...
                        </p>
                      </div>
                      <span className="text-content-muted group-hover:text-primary-400 group-hover:translate-x-1 transition-all">
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
          <div className="space-y-8 animate-fade-up">
            
            {/* Guía para nuevos usuarios - mostrar si no está todo configurado */}
            {(tables.length === 0 || agents.length === 0) && (
              <GettingStartedGuide tables={tables} agents={agents} />
            )}
            
            {/* Stats principales */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Icons.tables} label="Tablas" value={tables.length} color="blue" link="/tables" trend={tables.length > 0 ? "+12%" : ""} />
              <StatCard icon={Icons.records} label="Registros" value={stats.totalRecords} color="green" link="/tables" trend={stats.totalRecords > 0 ? "+8%" : ""} />
              <StatCard icon={Icons.fields} label="Campos" value={stats.totalFields} color="purple" link="/tables" />
              <StatCard icon={Icons.agents} label="Asistentes" value={agents.length} color="amber" link="/agents" />
            </section>

            {/* Gráficos y visualizaciones */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registros por tabla */}
              <div className="p-6 rounded-xl bg-surface-100 border border-surface-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-content-primary">Registros por tabla</h3>
                    <p className="text-xs text-content-tertiary mt-0.5">Distribución de datos</p>
                  </div>
                  <div className="relative">
                    <MiniDonut percentage={tables.length > 0 ? Math.min((stats.totalRecords / (tables.length * 100)) * 100, 100) : 0} color="#3b82f6" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-400">
                      {stats.totalRecords}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {stats.recordsByTable.length > 0 ? stats.recordsByTable.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-content-tertiary truncate">{item.name}</div>
                      <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
                          style={{ width: `${stats.totalRecords > 0 ? (item.count / stats.totalRecords) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-content-primary w-12 text-right">{item.count}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-content-muted text-center py-4">No hay datos disponibles</p>
                  )}
                </div>
              </div>

              {/* Resumen del workspace */}
              <div className="p-6 rounded-xl bg-surface-100 border border-surface-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-content-primary">Resumen del workspace</h3>
                    <p className="text-xs text-content-tertiary mt-0.5">Estado general</p>
                  </div>
                  <MiniBarChart 
                    data={[tables.length, agents.length, stats.totalRecords > 100 ? 100 : stats.totalRecords, stats.totalFields, tables.length * 2]} 
                    color="bg-gradient-to-t from-primary-500 to-primary-400" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-400">
                        {Icons.tables}
                      </div>
                      <span className="text-xs text-primary-400 font-medium">Estructura</span>
                    </div>
                    <p className="text-lg font-semibold text-content-primary">{tables.length} tablas</p>
                    <p className="text-xs text-content-tertiary">{stats.totalFields} campos totales</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
                        {Icons.agents}
                      </div>
                      <span className="text-xs text-violet-400 font-medium">IA</span>
                    </div>
                    <p className="text-lg font-semibold text-content-primary">{agents.length} agentes</p>
                    <p className="text-xs text-content-tertiary">Configurados</p>
                  </div>
                  
                  <div className="col-span-2 p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-accent-400 mb-1 font-medium">Capacidad de datos</p>
                        <p className="text-lg font-semibold text-content-primary">{stats.totalRecords.toLocaleString()} registros</p>
                      </div>
                      <div className="w-14 h-14">
                        <MiniDonut percentage={Math.min(stats.totalRecords / 10, 100)} color="#22c55e" size={56} />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(stats.totalRecords / 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Acciones rápidas */}
            <section>
              <h2 className="text-lg font-semibold text-content-primary mb-4">¿Qué quieres hacer?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction to="/tables" icon={Icons.tables} label="Ver mis datos" desc="Tablas y registros" color="blue" />
                <QuickAction to="/agents" icon={Icons.agents} label="Mi asistente" desc="Configuración de IA" color="purple" />
                <QuickAction to="/chat" icon={Icons.chat} label="Chatear" desc="Hablar con tu asistente" color="green" />
                <QuickAction to="/flows" icon={Icons.flows} label="Automatizar" desc="Tareas automáticas" color="amber" />
              </div>
            </section>

            {/* Actividad reciente y Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Actividad reciente */}
              <div className="lg:col-span-1 p-6 rounded-xl bg-surface-100 border border-surface-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-content-primary">Actividad reciente</h3>
                  {Icons.clock}
                </div>
                
                <div className="space-y-3">
                  {tables.length > 0 ? (
                    <>
                      {tables.slice(0, 5).map((table, i) => {
                        // Calcular tiempo relativo real
                        const getRelativeTime = (dateStr) => {
                          if (!dateStr) return 'Sin fecha';
                          const date = new Date(dateStr);
                          const now = new Date();
                          const diff = now - date;
                          const mins = Math.floor(diff / 60000);
                          const hours = Math.floor(diff / 3600000);
                          const days = Math.floor(diff / 86400000);
                          if (mins < 1) return 'Ahora';
                          if (mins < 60) return `${mins}m`;
                          if (hours < 24) return `${hours}h`;
                          return `${days}d`;
                        };
                        const timeAgo = getRelativeTime(table.updatedAt || table.createdAt);
                        const isRecent = timeAgo === 'Ahora' || timeAgo.endsWith('m');
                        
                        return (
                          <div key={table._id} className="flex items-start gap-3 group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isRecent ? 'bg-accent-500/15 text-accent-400' :
                              i < 2 ? 'bg-primary-500/15 text-primary-400' :
                              'bg-surface-200 text-content-tertiary'
                            }`}>
                              {Icons.tables}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-content-primary group-hover:text-primary-400 transition-colors truncate">
                                {table.name}
                              </p>
                              <p className="text-xs text-content-muted">
                                {isRecent ? 'Creada recientemente' : table.updatedAt ? 'Actualizada' : 'Tabla activa'}
                              </p>
                            </div>
                            <span className="text-xs text-content-muted flex-shrink-0">
                              {timeAgo}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-lg bg-surface-200 flex items-center justify-center mx-auto mb-2 text-content-muted">
                        {Icons.clock}
                      </div>
                      <p className="text-xs text-content-muted">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tablas recientes */}
              <div className="lg:col-span-2">
                {tables.length > 0 ? (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-content-primary">Tablas recientes</h2>
                      <Link to="/tables" className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium flex items-center gap-1">
                        Ver todas {Icons.arrow}
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tables.slice(0, 4).map((table) => (
                        <Link 
                          key={table._id} 
                          to="/tables"
                          className="group p-5 rounded-xl bg-surface-100 border border-surface-300/50 hover:bg-surface-200 hover:border-surface-400 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400">
                              {Icons.tables}
                            </div>
                            <span className="px-2 py-1 rounded-md bg-accent-500/10 text-accent-400 text-xs font-medium border border-accent-500/20">
                              {table.headers?.length || 0} campos
                            </span>
                          </div>
                          <h3 className="font-medium text-content-primary group-hover:text-primary-400 transition-colors mb-1">
                            {table.name}
                          </h3>
                          <p className="text-xs text-content-muted line-clamp-2">
                            {table.description || "Sin descripción"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="text-center py-12 bg-surface-100 border border-surface-300/50 rounded-2xl h-full flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4 text-primary-400">
                      {Icons.tables}
                    </div>
                    <h3 className="text-lg font-medium text-content-primary mb-2">Aún no tienes datos</h3>
                    <p className="text-sm text-content-tertiary mb-6 max-w-sm mx-auto">
                      Crea una tabla para empezar a organizar tu información (clientes, productos, citas...)
                    </p>
                    <Link to="/tables" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors">
                      {Icons.plus}
                      Crear mi primera tabla
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
