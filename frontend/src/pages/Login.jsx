import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Credenciales de prueba por tipo de usuario
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #12121a 50%, #0a0a12 100%)' }}>
      <div className="w-full max-w-md p-6">
        {/* Card principal */}
        <div className="rounded-2xl p-8" style={{ 
          background: 'rgba(18, 18, 26, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500 text-white mb-4">
              {Icons.bolt}
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">FlowAI</h1>
            <p className="text-white/50 text-sm mt-1">
              {isRegister ? "Crea tu cuenta para comenzar" : "Inicia sesión para continuar"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Nombre</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{Icons.user}</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required={isRegister}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{Icons.mail}</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{Icons.lock}</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Confirmar Contraseña</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{Icons.lock}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required={isRegister}
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Repite tu contraseña"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
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
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm text-white/50 hover:text-white transition"
            >
              {isRegister ? (
                <>¿Ya tienes cuenta? <span className="text-violet-400 font-medium">Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span className="text-violet-400 font-medium">Regístrate</span></>
              )}
            </button>
          </div>

          {/* Demo credentials */}
          {!isRegister && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <p className="text-xs text-white/40 text-center mb-4 uppercase tracking-wider font-medium">
                Cuentas de demostración
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEST_USERS.map((user) => {
                  const isSelected = selectedUser === user.email;
                  const colorMap = {
                    slate: { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#94a3b8' },
                    blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
                    violet: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa' },
                    amber: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
                  };
                  const colors = colorMap[user.color];
                  
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => fillCredentials(user)}
                      className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                      style={{ 
                        background: isSelected ? colors.bg : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? colors.border : 'rgba(255, 255, 255, 0.06)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: colors.text }}>{user.icon}</span>
                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.text }}>
                          {user.plan}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-violet-400">{Icons.check}</span>
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
        <p className="text-center text-white/30 text-xs mt-6">
          Plataforma de automatización impulsada por IA
        </p>
      </div>
    </div>
  );
}
