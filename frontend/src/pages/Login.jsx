import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Configuración: mostrar usuarios de demo solo en desarrollo
const SHOW_DEMO_USERS = import.meta.env.VITE_SHOW_DEMO_USERS !== 'false';

// Iconos SVG optimizados
const Icons = {
  logo: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" className="fill-violet-600"/>
      <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" fillOpacity="0.9"/>
      <path d="M18 14L24 20L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 26L24 20L30 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
    </svg>
  ),
  mail: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  lock: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  spinner: (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  eyeOff: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ),
  arrowRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
};

// Features para mostrar en el lado izquierdo
const features = [
  { icon: Icons.sparkles, title: "IA Conversacional", desc: "Agentes inteligentes que entienden a tus clientes" },
  { icon: Icons.bolt, title: "Automatización", desc: "Flujos visuales sin código para tu negocio" },
  { icon: Icons.chart, title: "Analítica", desc: "Métricas en tiempo real de tu operación" },
  { icon: Icons.shield, title: "Seguridad", desc: "Datos protegidos y encriptados" },
];

// Credenciales de prueba
const TEST_USERS = [
  { email: "nuevo@migracion.ai", password: "nuevo123", label: "Free", color: "slate" },
  { email: "starter@migracion.ai", password: "starter123", label: "Starter", color: "blue" },
  { email: "demo@migracion.ai", password: "demo123", label: "Premium", color: "violet" },
  { email: "admin@migracion.ai", password: "admin123", label: "Enterprise", color: "amber" },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fillCredentials = (user) => {
    setForm(prev => ({ ...prev, email: user.email, password: user.password }));
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
    <div className="min-h-screen flex bg-slate-950">
      {/* Lado izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradiente de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900" />
        
        {/* Patrón de grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Círculos decorativos */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className={`flex items-center gap-3 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="w-10 h-10">{Icons.logo}</div>
            <span className="text-2xl font-bold text-white">FlowAI</span>
          </div>

          {/* Hero Content */}
          <div className="space-y-8">
            <div className={`transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Automatiza tu negocio con
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white">
                  Inteligencia Artificial
                </span>
              </h1>
              <p className="mt-4 text-lg text-white/70 max-w-md">
                Crea agentes conversacionales, gestiona datos y automatiza flujos de trabajo desde una sola plataforma.
              </p>
            </div>

            {/* Features */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-white/10 text-white/90">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="text-xs text-white/60 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className={`text-sm text-white/40 transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            © 2025 FlowAI. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Lado derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10">{Icons.logo}</div>
            <span className="text-2xl font-bold text-white">FlowAI</span>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              {isRegister ? "Crear cuenta" : "Bienvenido"}
            </h2>
            <p className="mt-2 text-slate-400">
              {isRegister 
                ? "Completa el formulario para comenzar" 
                : "Ingresa tus credenciales para continuar"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {Icons.user}
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required={isRegister}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  {Icons.mail}
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  {Icons.lock}
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? Icons.eyeOff : Icons.eye}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {Icons.lock}
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required={isRegister}
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/50" />
                  <span className="text-sm text-slate-400">Recordarme</span>
                </label>
                <button type="button" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  {Icons.spinner}
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</span>
                  {Icons.arrowRight}
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="mt-6 text-center text-slate-400">
            {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
            >
              {isRegister ? "Inicia sesión" : "Regístrate gratis"}
            </button>
          </p>

          {/* Demo users - Solo en desarrollo */}
          {!isRegister && SHOW_DEMO_USERS && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-500 text-center mb-4">
                Cuentas de demostración
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {TEST_USERS.map((user) => {
                  const colorClasses = {
                    slate: "bg-slate-800 hover:bg-slate-700 text-slate-300",
                    blue: "bg-blue-900/30 hover:bg-blue-900/50 text-blue-400",
                    violet: "bg-violet-900/30 hover:bg-violet-900/50 text-violet-400",
                    amber: "bg-amber-900/30 hover:bg-amber-900/50 text-amber-400",
                  };
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => fillCredentials(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${colorClasses[user.color]}`}
                    >
                      {user.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
