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

// Stat Card Component - Rediseñado con glassmorphism y gradientes
const StatCard = ({ icon, label, value, color, link, trend, delay = 0 }) => (
  <Link
    to={link}
    className="group relative p-6 rounded-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      animation: 'fade-up 0.5s ease-out forwards',
      animationDelay: `${delay}ms`,
      opacity: 0
    }}
  >
    {/* Glow effect on hover */}
    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${
      color === 'blue' ? 'bg-indigo-500' :
      color === 'green' ? 'bg-emerald-500' :
      color === 'purple' ? 'bg-violet-500' :
      'bg-amber-500'
    }`} />
    
    <div className="relative flex items-start justify-between mb-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
        color === 'blue' ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30' :
        color === 'green' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30' :
        color === 'purple' ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30' :
        'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30'
      }`}>
        {icon}
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {trend}
        </span>
      )}
    </div>
    <p className="relative text-4xl font-bold text-white mb-1 tracking-tight">{value.toLocaleString()}</p>
    <p className="relative text-sm text-slate-400 font-medium">{label}</p>
    
    {/* Arrow indicator */}
    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </div>
  </Link>
);

// Quick Action Card - Rediseñado
const QuickAction = ({ to, icon, label, desc, color, delay = 0 }) => (
  <Link 
    to={to} 
    className="group relative p-6 rounded-2xl transition-all duration-500 hover:scale-[1.05] overflow-hidden"
    style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      animation: 'fade-up 0.5s ease-out forwards',
      animationDelay: `${delay}ms`,
      opacity: 0
    }}
  >
    {/* Animated gradient border on hover */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
      style={{
        background: color === 'blue' 
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent, rgba(59, 130, 246, 0.15))'
          : color === 'purple'
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), transparent, rgba(168, 85, 247, 0.15))'
          : color === 'green'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), transparent, rgba(20, 184, 166, 0.15))'
          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), transparent, rgba(249, 115, 22, 0.15))'
      }}
    />
    
    <div className={`relative w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 text-white ${
      color === 'blue' ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/25' :
      color === 'purple' ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-violet-500/25' :
      color === 'green' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/25' :
      'bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/25'
    }`}>
      {icon}
    </div>
    <h3 className="relative text-base font-semibold text-slate-100 text-center group-hover:text-white transition-colors duration-300 mb-1">
      {label}
    </h3>
    <p className="relative text-sm text-slate-500 text-center group-hover:text-slate-400 transition-colors">{desc}</p>
  </Link>
);

// Gráfico de área SVG para tendencias
const AreaChart = ({ data, color, height = 60 }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 200;
  
  // Crear puntos para el path
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10);
    return `${x},${y}`;
  }).join(' ');
  
  // Path para el área
  const areaPath = `M0,${height} L${points} L${width},${height} Z`;
  const linePath = `M${points}`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#gradient-${color})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Panel de métricas avanzadas
const MetricsPanel = ({ stats, tables }) => {
  // Generar datos simulados de tendencia basados en datos reales
  const generateTrend = (base) => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      trend.push(Math.max(0, base - Math.floor(Math.random() * (base * 0.3)) + Math.floor(Math.random() * base * 0.1 * (6 - i))));
    }
    trend.push(base);
    return trend;
  };
  
  const recordsTrend = generateTrend(stats.totalRecords);
  const fieldsTrend = generateTrend(stats.totalFields);
  
  const metrics = [
    {
      label: 'Registros totales',
      value: stats.totalRecords,
      trend: recordsTrend,
      change: stats.totalRecords > 0 ? '+12%' : '0%',
      color: '#8B5CF6',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>
    },
    {
      label: 'Campos definidos',
      value: stats.totalFields,
      trend: fieldsTrend,
      change: stats.totalFields > 0 ? '+5%' : '0%',
      color: '#06B6D4',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /></svg>
    },
    {
      label: 'Tablas activas',
      value: tables.length,
      trend: generateTrend(tables.length),
      change: tables.length > 0 ? '+8%' : '0%',
      color: '#10B981',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16M9 4v16" /></svg>
    },
  ];
  
  // Distribución de registros por tabla
  const distribution = stats.recordsByTable?.slice(0, 5) || [];
  const totalForPie = distribution.reduce((sum, t) => sum + t.count, 0) || 1;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
      {/* Métricas con tendencia */}
      {metrics.map((metric, i) => (
        <div 
          key={i}
          className="p-5 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${metric.color}20`, color: metric.color }}
            >
              {metric.icon}
            </div>
            {metric.value > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/20">
                {metric.change}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white mb-1">{metric.value.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mb-3">{metric.label}</p>
          <div className="h-12">
            <AreaChart data={metric.trend} color={metric.color} height={48} />
          </div>
        </div>
      ))}
      
      {/* Distribución por tabla */}
      <div 
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h4 className="text-sm font-medium text-slate-200 mb-4">Distribución de datos</h4>
        {distribution.length > 0 ? (
          <div className="space-y-3">
            {distribution.map((item, i) => {
              const percentage = Math.round((item.count / totalForPie) * 100);
              const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate max-w-[120px]">{item.name}</span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-24 text-slate-500">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
            <span className="text-xs">Sin datos aún</span>
          </div>
        )}
      </div>
    </div>
  );
};


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
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(14, 165, 233, 0.08))',
      border: '1px solid rgba(99, 102, 241, 0.3)'
    }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Primeros pasos
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Completa estos pasos para empezar a usar tu asistente
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-indigo-400">{completedSteps}/{steps.length}</span>
          <p className="text-xs text-slate-500">completados</p>
        </div>
      </div>
      
      {/* Barra de progreso */}
      <div className="h-2 bg-slate-700/50 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-500"
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
                  ? 'bg-emerald-500/15 border border-emerald-500/30' 
                  : isCurrent
                    ? 'bg-indigo-500/15 border border-indigo-500/40 hover:bg-indigo-500/20'
                    : 'bg-slate-700/30 border border-slate-600/40 opacity-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                step.done 
                  ? 'bg-emerald-500 text-white' 
                  : isCurrent
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-600/50 text-slate-400'
              }`}>
                {step.done ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${step.done ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </div>
              {isCurrent && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-500 text-white">
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
        <div className="mt-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
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
      <div className="flex items-center justify-center h-full" style={{ background: '#0f172a' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 rounded-full border-indigo-500/20" />
            <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-slate-400">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Header simple */}
      <header className="sticky top-0 z-10" style={{ 
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(100, 116, 139, 0.2)',
        backdropFilter: 'blur(20px)'
      }}>
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {workspaceId && (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white bg-indigo-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-100">
                  {workspaceId ? workspaceName : "Bienvenido"}
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {workspaceId ? "Gestiona tus datos con tu asistente de IA" : "Selecciona un proyecto para comenzar"}
                </p>
              </div>
            </div>
            
            {workspaceId && (
              <Link 
                to="/workspaces" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-slate-700/50 text-slate-400"
                style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
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
              <h2 className="text-lg font-semibold text-slate-100">Tus proyectos</h2>
              <Link to="/workspaces" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1">
                Ver todos {Icons.arrow}
              </Link>
            </div>
            
            {workspaces.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                  {Icons.empty}
                </div>
                <h3 className="text-lg font-medium text-slate-100 mb-2">Crea tu primer proyecto</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                  Un proyecto agrupa tus datos y tu asistente de IA personalizado
                </p>
                <Link to="/workspaces" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors">
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
                    className="group text-left p-5 rounded-xl hover:scale-[1.02] transition-all duration-200 animate-fade-up"
                    style={{ 
                      background: 'rgba(51, 65, 85, 0.4)', 
                      border: '1px solid rgba(100, 116, 139, 0.3)',
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${ws.color || '#3b82f6'}, ${ws.color || '#2563eb'})` }}
                      >
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                          {ws.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {ws._id?.slice(0, 16)}...
                        </p>
                      </div>
                      <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
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
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="stats-cards">
              <StatCard icon={Icons.tables} label="Tablas" value={tables.length} color="blue" link="/tables" trend={tables.length > 0 ? "+12%" : ""} delay={100} />
              <StatCard icon={Icons.records} label="Registros" value={stats.totalRecords} color="green" link="/tables" trend={stats.totalRecords > 0 ? "+8%" : ""} delay={150} />
              <StatCard icon={Icons.fields} label="Campos" value={stats.totalFields} color="purple" link="/tables" delay={200} />
              <StatCard icon={Icons.agents} label="Asistentes" value={agents.length} color="amber" link="/agents" delay={250} />
            </section>

            {/* Panel de métricas visuales */}
            {(tables.length > 0 || stats.totalRecords > 0) && (
              <MetricsPanel stats={stats} tables={tables} />
            )}

            {/* Gráficos y visualizaciones */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
              {/* Registros por tabla */}
              <div className="p-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Registros por tabla</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Distribución de datos</p>
                  </div>
                  <div className="relative">
                    <MiniDonut percentage={tables.length > 0 ? Math.min((stats.totalRecords / (tables.length * 100)) * 100, 100) : 0} color="#3b82f6" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-indigo-400">
                      {stats.totalRecords}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {stats.recordsByTable.length > 0 ? stats.recordsByTable.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-slate-400 truncate">{item.name}</div>
                      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                          style={{ width: `${stats.totalRecords > 0 ? (item.count / stats.totalRecords) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-100 w-12 text-right">{item.count}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">No hay datos disponibles</p>
                  )}
                </div>
              </div>

              {/* Resumen del workspace */}
              <div className="p-6 rounded-xl" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Resumen del workspace</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Estado general</p>
                  </div>
                  <MiniBarChart 
                    data={[tables.length, agents.length, stats.totalRecords > 100 ? 100 : stats.totalRecords, stats.totalFields, tables.length * 2]} 
                    color="bg-gradient-to-t from-indigo-500 to-indigo-400" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                        {Icons.tables}
                      </div>
                      <span className="text-xs text-indigo-400 font-medium">Estructura</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-100">{tables.length} tablas</p>
                    <p className="text-xs text-slate-400">{stats.totalFields} campos totales</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
                        {Icons.agents}
                      </div>
                      <span className="text-xs text-violet-400 font-medium">IA</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-100">{agents.length} agentes</p>
                    <p className="text-xs text-slate-400">Configurados</p>
                  </div>
                  
                  <div className="col-span-2 p-4 rounded-xl bg-sky-500/5 border border-sky-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-sky-400 mb-1 font-medium">Capacidad de datos</p>
                        <p className="text-lg font-semibold text-slate-100">{stats.totalRecords.toLocaleString()} registros</p>
                      </div>
                      <div className="w-14 h-14">
                        <MiniDonut percentage={Math.min(stats.totalRecords / 10, 100)} color="#22c55e" size={56} />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(stats.totalRecords / 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Acciones rápidas */}
            <section className="animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }} data-tour="quick-actions">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">¿Qué quieres hacer?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction to="/tables" icon={Icons.tables} label="Ver mis datos" desc="Tablas y registros" color="blue" delay={450} />
                <QuickAction to="/agents" icon={Icons.agents} label="Mi asistente" desc="Configuración de IA" color="purple" delay={500} />
                <QuickAction to="/chat" icon={Icons.chat} label="Chatear" desc="Hablar con tu asistente" color="green" delay={550} />
                <QuickAction to="/flows" icon={Icons.flows} label="Automatizar" desc="Tareas automáticas" color="amber" delay={600} />
              </div>
            </section>

            {/* Actividad reciente y Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '650ms', animationFillMode: 'backwards' }}>
              {/* Actividad reciente */}
              <div className="lg:col-span-1 p-6 rounded-xl transition-all duration-300 hover:shadow-lg" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-100">Actividad reciente</h3>
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
                              isRecent ? 'bg-sky-500/15 text-sky-400' :
                              i < 2 ? 'bg-indigo-500/15 text-indigo-400' :
                              'bg-slate-700/50 text-slate-400'
                            }`}>
                              {Icons.tables}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                                {table.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isRecent ? 'Creada recientemente' : table.updatedAt ? 'Actualizada' : 'Tabla activa'}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {timeAgo}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center mx-auto mb-2 text-slate-500">
                        {Icons.clock}
                      </div>
                      <p className="text-xs text-slate-500">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tablas recientes */}
              <div className="lg:col-span-2">
                {tables.length > 0 ? (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-slate-100">Tablas recientes</h2>
                      <Link to="/tables" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1">
                        Ver todas {Icons.arrow}
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tables.slice(0, 4).map((table) => (
                        <Link 
                          key={table._id} 
                          to="/tables"
                          className="group p-5 rounded-xl hover:scale-[1.02] transition-all"
                          style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                              {Icons.tables}
                            </div>
                            <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/20">
                              {table.headers?.length || 0} campos
                            </span>
                          </div>
                          <h3 className="font-medium text-slate-100 group-hover:text-indigo-400 transition-colors mb-1">
                            {table.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {table.description || "Sin descripción"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="text-center py-12 rounded-2xl h-full flex flex-col items-center justify-center" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                    <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 text-indigo-400">
                      {Icons.tables}
                    </div>
                    <h3 className="text-lg font-medium text-slate-100 mb-2">Aún no tienes datos</h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                      Crea una tabla para empezar a organizar tu información (clientes, productos, citas...)
                    </p>
                    <Link to="/tables" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors">
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
