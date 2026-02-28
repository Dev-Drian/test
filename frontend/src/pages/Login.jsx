import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Configuración: mostrar usuarios de demo solo en desarrollo
const SHOW_DEMO_USERS = import.meta.env.VITE_SHOW_DEMO_USERS !== 'false';

// Iconos SVG
const Icons = {
  bolt: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  star: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  diamond: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  crown: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  ),
  userCircle: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  spinner: (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// Componente de partículas flotantes para el fondo
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full opacity-20"
        style={{
          width: Math.random() * 4 + 2 + 'px',
          height: Math.random() * 4 + 2 + 'px',
          background: `hsl(${260 + Math.random() * 40}, 70%, 60%)`,
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
          animationDelay: `-${Math.random() * 10}s`,
        }}
      />
    ))}
  </div>
);

// Componente de orbs de fondo
const BackgroundOrbs = () => (
  <>
    <div 
      className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
      style={{
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
        top: '-10%',
        right: '-10%',
        animation: 'pulse-slow 8s ease-in-out infinite',
      }}
    />
    <div 
      className="absolute w-80 h-80 rounded-full blur-3xl opacity-15"
      style={{
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, transparent 70%)',
        bottom: '-5%',
        left: '-10%',
        animation: 'pulse-slow 10s ease-in-out infinite reverse',
      }}
    />
    <div 
      className="absolute w-64 h-64 rounded-full blur-2xl opacity-10"
      style={{
        background: 'radial-gradient(circle, rgba(244, 114, 182, 0.4) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'pulse-slow 12s ease-in-out infinite',
      }}
    />
  </>
);

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Animación de entrada
  useEffect(() => {
    setMounted(true);
  }, []);

  // Credenciales de prueba por tipo de usuario (dinámico)
  const TEST_USERS = [
    { 
      email: "nuevo@migracion.ai", 
      password: "nuevo123", 
      label: "Usuario Nuevo", 
      plan: "FREE",
      desc: "Probar onboarding completo",
      icon: Icons.userCircle,
      color: "slate"
    },
    { 
      email: "starter@migracion.ai", 
      password: "starter123", 
      label: "Starter", 
      plan: "STARTER",
      desc: "Workspace básico",
      icon: Icons.star,
      color: "blue"
    },
    { 
      email: "demo@migracion.ai", 
      password: "demo123", 
      label: "Demo Premium", 
      plan: "PREMIUM",
      desc: "CRM completo",
      icon: Icons.diamond,
      color: "violet"
    },
    { 
      email: "admin@migracion.ai", 
      password: "admin123", 
      label: "Administrador", 
      plan: "ENTERPRISE",
      desc: "Super Admin",
      icon: Icons.crown,
      color: "amber"
    },
  ];

  const [selectedUser, setSelectedUser] = useState(null);

  const fillCredentials = (user) => {
    setForm(prev => ({
      ...prev,
      email: user.email,
      password: user.password
    }));
    setSelectedUser(user.email);
    setIsRegister(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister && form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const result = isRegister
        ? await register({ name: form.name, email: form.email, password: form.password })
        : await login(form.email, form.password);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #12121a 50%, #0a0a12 100%)' }}>
      {/* Efectos de fondo */}
      <BackgroundOrbs />
      <FloatingParticles />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <div className={`w-full max-w-md p-6 relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Card principal */}
        <div className="rounded-3xl p-8 login-card" style={{ 
          background: 'rgba(18, 18, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 60px rgba(139, 92, 246, 0.1)'
        }}>
          {/* Logo/Header */}
          <div className={`text-center mb-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white mb-4 shadow-lg shadow-violet-500/25 hover:scale-110 transition-transform duration-300">
              {Icons.bolt}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">FlowAI</h1>
            <p className="text-white/50 text-sm mt-2">
              {isRegister ? "Crea tu cuenta para comenzar" : "Inicia sesión para continuar"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl animate-shake" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className={`transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ animationDelay: '150ms' }}>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Nombre</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors">{Icons.user}</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required={isRegister}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 hover:border-white/20"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
            )}

            <div className={`transition-all duration-300 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors">{Icons.mail}</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 hover:border-white/20"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className={`transition-all duration-300 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Contraseña</label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors">{Icons.lock}</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 hover:border-white/20"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {isRegister && (
              <div className={`transition-all duration-300 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Confirmar Contraseña</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors">{Icons.lock}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required={isRegister}
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 hover:border-white/20"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Repite tu contraseña"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] ${mounted ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 translate-y-4'}`}
            >
              {loading ? (
                <>
                  {Icons.spinner}
                  <span>{isRegister ? "Creando cuenta..." : "Iniciando sesión..."}</span>
                </>
              ) : (
                <span>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</span>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className={`mt-6 text-center transition-all duration-300 delay-[600ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm text-white/50 hover:text-white transition-colors duration-300"
            >
              {isRegister ? (
                <>¿Ya tienes cuenta? <span className="text-violet-400 font-medium hover:text-violet-300 transition-colors">Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span className="text-violet-400 font-medium hover:text-violet-300 transition-colors">Regístrate</span></>
              )}
            </button>
          </div>

          {/* Demo credentials - Solo si SHOW_DEMO_USERS es true */}
          {!isRegister && SHOW_DEMO_USERS && (
            <div className={`mt-6 pt-6 transition-all duration-500 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <p className="text-xs text-white/40 text-center mb-4 uppercase tracking-wider font-medium flex items-center justify-center gap-2">
                <span className="w-8 h-px bg-white/10"></span>
                Cuentas de demostración
                <span className="w-8 h-px bg-white/10"></span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEST_USERS.map((user, index) => {
                  const isSelected = selectedUser === user.email;
                  const colorMap = {
                    slate: { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#94a3b8', glow: 'rgba(100, 116, 139, 0.2)' },
                    blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa', glow: 'rgba(59, 130, 246, 0.2)' },
                    violet: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa', glow: 'rgba(139, 92, 246, 0.2)' },
                    amber: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.2)' },
                  };
                  const colors = colorMap[user.color];
                  
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => fillCredentials(user)}
                      className={`p-3 rounded-xl text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                      style={{ 
                        background: isSelected ? colors.bg : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? colors.border : 'rgba(255, 255, 255, 0.06)'}`,
                        boxShadow: isSelected ? `0 4px 20px ${colors.glow}` : 'none',
                        transitionDelay: `${800 + index * 50}ms`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="transition-transform duration-300 group-hover:scale-110" style={{ color: colors.text }}>{user.icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
                          {user.plan}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-violet-400 animate-scale-in">{Icons.check}</span>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate">{user.label}</p>
                      <p className="text-white/40 text-[10px] mt-0.5 truncate">{user.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className={`text-center text-white/30 text-xs mt-6 transition-all duration-500 delay-[900ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Plataforma de automatización impulsada por IA
        </p>
      </div>
    </div>
  );
}
