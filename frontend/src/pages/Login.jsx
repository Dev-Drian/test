import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      badge: "🆓 FREE",
      desc: "Probar onboarding completo",
      color: "slate"
    },
    { 
      email: "starter@migracion.ai", 
      password: "starter123", 
      label: "Starter", 
      badge: "⭐ STARTER",
      desc: "Workspace básico",
      color: "blue"
    },
    { 
      email: "demo@migracion.ai", 
      password: "demo123", 
      label: "Demo Premium", 
      badge: "💎 PREMIUM",
      desc: "CRM completo",
      color: "violet"
    },
    { 
      email: "admin@migracion.ai", 
      password: "admin123", 
      label: "Administrador", 
      badge: "👑 ENTERPRISE",
      desc: "Super Admin",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Migración AI</h1>
            <p className="text-slate-400 mt-1">
              {isRegister ? "Crea tu cuenta" : "Inicia sesión para continuar"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required={isRegister}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Tu nombre"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required={isRegister}
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
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
              className="text-sm text-slate-400 hover:text-white transition"
            >
              {isRegister ? (
                <>¿Ya tienes cuenta? <span className="text-blue-400">Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span className="text-blue-400">Regístrate</span></>
              )}
            </button>
          </div>

          {/* Demo credentials button */}
          {!isRegister && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 text-center mb-3">
                Usuarios de prueba disponibles:
              </p>
              <div className="space-y-2">
                {TEST_USERS.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => fillCredentials(user)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedUser === user.email
                        ? 'bg-violet-500/20 border-violet-500/50'
                        : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium text-sm">{user.label}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-600/50">{user.badge}</span>
                      </div>
                      {selectedUser === user.email && (
                        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{user.desc}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {user.email} / {user.password}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Sistema de gestión impulsado por IA
        </p>
      </div>
    </div>
  );
}
