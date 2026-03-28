/**
 * Landing.jsx — Página pública FlowAI
 * Diseño: dark premium, violet/indigo, SVG icons, scroll animations
 * v2.0 - UI mejorada con mejor distribución y profesionalismo
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Hook: Intersection Observer para animaciones de entrada ─────────────────

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icons = {
  Bot: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3" /><path d="M9 12h.01M15 12h.01M9 16h6M12 8V4" /><circle cx="12" cy="3" r="1" />
    </svg>
  ),
  Table: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 9v12M3 14h6M15 9v12M3 19h6" />
    </svg>
  ),
  Flow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h4a2 2 0 012 2v1a2 2 0 002 2h4a2 2 0 012 2v1a2 2 0 01-2 2H3" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="18" r="2" />
    </svg>
  ),
  Payment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4M16 15h2" />
    </svg>
  ),
  Import: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M3 15v2a4 4 0 004 4h10a4 4 0 004-4v-2" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Wand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2m0 2v2m0-2h-2m2 0h2M4 15l9-9 6 6-9 9-6-6zm5-5l1.5 1.5M20 18v2m0-2v-2m0 2h2m-2 0h-2" />
    </svg>
  ),
  Rocket: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Quote: () => (
    <svg viewBox="0 0 32 32" fill="currentColor">
      <path d="M10 8C6.134 8 3 11.134 3 15s3.134 7 7 7c1.247 0 2.42-.328 3.428-.9C12.794 23.67 11.5 26 8 27h3c4.5 0 8-3.5 8-10 0-5-3.5-9-9-9zm14 0c-3.866 0-7 3.134-7 7s3.134 7 7 7c1.247 0 2.42-.328 3.428-.9C26.794 23.67 25.5 26 22 27h3c4.5 0 8-3.5 8-10 0-5-3.5-9-9-9z" />
    </svg>
  ),
  Lightning: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Analytics: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M7 16l4-4 4 4 4-6" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
    </svg>
  ),
};

// ─── Logo (mejorado) ──────────────────────────────────────────────────────────

function Logo({ size = "md" }) {
  const isLg = size === "lg";
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className={`${isLg ? "w-12 h-12" : "w-10 h-10"} rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3`}>
        <svg className={`${isLg ? "w-6 h-6" : "w-5 h-5"} text-white`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </div>
      <span className={`${isLg ? "text-2xl" : "text-xl"} font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight`}>FlowAI</span>
    </div>
  );
}

// ─── Animated Demo Chat (v2 - más interactivo y sin bugs) ────────────────────

const DEMO_MESSAGES = [
  { from: "user", text: "Hola, ¿tienen mesa para 2 el sábado a las 8pm?" },
  { from: "bot",  text: "¡Hola! Sí tenemos disponibilidad para el sábado. ¿A qué nombre hago la reserva?" },
  { from: "user", text: "Para Juan García" },
  { from: "bot",  text: "Listo, Juan! Reserva confirmada: sabado 8pm, mesa para 2. Te esperamos!" },
];

function DemoChat() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll SOLO dentro del contenedor de mensajes (no afecta la página)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Animación del chat con ciclos
  useEffect(() => {
    let currentIndex = 0;
    setMessages([]);
    setIsTyping(false);

    const showNextMessage = () => {
      if (currentIndex >= DEMO_MESSAGES.length) {
        // Esperar y reiniciar el ciclo
        timeoutRef.current = setTimeout(() => {
          setCycleKey(k => k + 1);
        }, 3000);
        return;
      }

      const nextMsg = DEMO_MESSAGES[currentIndex];
      
      if (nextMsg.from === "bot") {
        // Mostrar typing indicator antes de mensaje del bot
        setIsTyping(true);
        timeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, { ...nextMsg, id: `${cycleKey}-${currentIndex}` }]);
          currentIndex++;
          timeoutRef.current = setTimeout(showNextMessage, 1200);
        }, 1500);
      } else {
        // Mensajes del usuario aparecen inmediatamente
        setMessages(prev => [...prev, { ...nextMsg, id: `${cycleKey}-${currentIndex}` }]);
        currentIndex++;
        timeoutRef.current = setTimeout(showNextMessage, 1000);
      }
    };

    // Iniciar después de un pequeño delay
    timeoutRef.current = setTimeout(showNextMessage, 800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cycleKey]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-5 w-full max-w-sm"
      style={{ boxShadow: "0 0 60px rgba(124,58,237,0.2), 0 25px 80px rgba(0,0,0,0.6)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="12" rx="3" /><path d="M9 12h.01M15 12h.01M9 16h6M12 8V4" /><circle cx="12" cy="3" r="1" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white leading-none mb-1">Asistente Virtual</div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">en línea</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors cursor-pointer" />
        </div>
      </div>
      {/* Messages */}
      <div ref={containerRef} className="space-y-3 min-h-[180px] max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-fadeSlideUp`}>
            {msg.from === "bot" && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            )}
            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
              msg.from === "user"
                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-md shadow-lg shadow-violet-900/40"
                : "bg-white/10 text-slate-200 rounded-tl-md border border-white/10 backdrop-blur-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 animate-fadeSlideUp">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/10 border border-white/10">
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-2 h-2 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Input simulado */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm text-slate-500 flex-1">Escribe un mensaje...</span>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/30">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card (mejorada) ──────────────────────────────────────────────────

const FEATURE_GRADIENTS = {
  violet: { bg: "from-violet-600/15 to-violet-600/0", icon: "text-violet-400", iconBg: "from-violet-500/20 to-purple-500/10", border: "group-hover:border-violet-500/40", glow: "group-hover:shadow-violet-900/25" },
  blue:   { bg: "from-blue-600/15 to-blue-600/0",     icon: "text-blue-400",   iconBg: "from-blue-500/20 to-cyan-500/10",     border: "group-hover:border-blue-500/40",   glow: "group-hover:shadow-blue-900/25" },
  amber:  { bg: "from-amber-500/15 to-amber-500/0",   icon: "text-amber-400",  iconBg: "from-amber-500/20 to-orange-500/10", border: "group-hover:border-amber-500/40",  glow: "group-hover:shadow-amber-900/25" },
  emerald:{ bg: "from-emerald-500/15 to-emerald-500/0",icon:"text-emerald-400",iconBg: "from-emerald-500/20 to-teal-500/10", border: "group-hover:border-emerald-500/40",glow: "group-hover:shadow-emerald-900/25" },
  rose:   { bg: "from-rose-500/15 to-rose-500/0",     icon: "text-rose-400",   iconBg: "from-rose-500/20 to-pink-500/10",    border: "group-hover:border-rose-500/40",   glow: "group-hover:shadow-rose-900/25" },
  slate:  { bg: "from-slate-500/15 to-slate-500/0",   icon: "text-slate-400",  iconBg: "from-slate-500/20 to-gray-500/10",   border: "group-hover:border-slate-500/40",  glow: "group-hover:shadow-slate-900/25" },
};

function FeatureCard({ IconComp, title, description, color = "violet", delay = 0 }) {
  const g = FEATURE_GRADIENTS[color];
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref}
      className={`group relative p-7 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 ${g.border} hover:shadow-2xl ${g.glow} cursor-default overflow-hidden`}
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, background 0.3s, border-color 0.3s, box-shadow 0.3s` }}>
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${g.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.iconBg} border border-white/10 flex items-center justify-center mb-5 ${g.icon} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-lg`}>
          <div className="w-6 h-6"><IconComp /></div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, IconComp, title, description, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  const grads = ["from-violet-500 to-indigo-500", "from-indigo-500 to-cyan-500", "from-cyan-500 to-emerald-500"];
  const grad = grads[(step - 1) % grads.length];
  return (
    <div ref={ref} className="flex flex-col items-center text-center"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)", transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      <div className="relative mb-6">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${grad} p-px shadow-2xl`}>
          <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
            <div className={`w-10 h-10 bg-gradient-to-br ${grad} rounded-xl flex items-center justify-center`}>
              <div className="w-5 h-5 text-white"><IconComp /></div>
            </div>
          </div>
        </div>
        <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
          {step}
        </div>
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed max-w-[220px]">{description}</p>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

const PLANS = [
  { id: "free",       name: "Gratis",      description: "Para explorar la plataforma",     price: 0,      priceLabel: "$0",        features: ["1 proyecto", "3 tablas", "100 registros", "1 asistente IA", "GPT-4o Mini"] },
  { id: "starter",    name: "Inicial",     description: "Para negocios pequeños",          price: 39000,  priceLabel: "$39.000",   features: ["3 proyectos", "10 tablas", "1.000 registros", "2 asistentes", "GPT-4o + Mini", "Exportar datos"] },
  { id: "premium",    name: "Premium",     description: "Para negocios en crecimiento",    price: 119000, priceLabel: "$119.000",  features: ["10 proyectos", "50 tablas", "10.000 registros", "5 asistentes", "Todos los modelos", "Webhooks + API", "Soporte prioritario"] },
  { id: "enterprise", name: "Empresarial", description: "Sin límites",                     price: 399000, priceLabel: "$399.000",  features: ["Todo ilimitado", "White label", "Dominio propio", "GPT-4 + Claude", "Onboarding dedicado", "SLA garantizado"] },
];

function PlanCard({ plan, onGetStarted, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  const isPop = plan.id === "premium";
  return (
    <div ref={ref}
      className={`relative flex flex-col rounded-2xl border transition-all duration-500 hover:-translate-y-1 ${isPop ? "border-violet-500/50 bg-gradient-to-b from-violet-600/10 to-transparent shadow-xl shadow-violet-900/30" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, border-color 0.3s, box-shadow 0.3s` }}>
      {isPop && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-900/40 whitespace-nowrap">
          Mas popular
        </div>
      )}
      <div className="p-6 flex-1">
        <div className="mb-5">
          <div className="text-base font-bold text-white mb-0.5">{plan.name}</div>
          <div className="text-xs text-slate-500">{plan.description}</div>
        </div>
        <div className="mb-6">
          <span className="text-3xl font-bold text-white">{plan.priceLabel}</span>
          <span className="text-slate-500 text-sm ml-1">{plan.price > 0 ? "COP/mes" : "para siempre"}</span>
        </div>
        <ul className="space-y-2.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <div className={`w-4 h-4 flex-shrink-0 ${isPop ? "text-violet-400" : "text-emerald-400"}`}><Icons.Check /></div>
              <span className="text-slate-300">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-6 pb-6">
        <button onClick={onGetStarted}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isPop ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-900/30" : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/8 hover:border-white/15"}`}>
          {plan.price === 0 ? "Empezar gratis" : "Comenzar ahora"}
        </button>
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: "María González", role: "Dueña de salón de belleza",    initials: "MG", color: "from-pink-500 to-rose-500",   text: "En 10 minutos ya tenía mi bot funcionando. Ahora los clientes agendan citas solos mientras duermo. Es increíble." },
  { name: "Carlos Mendoza", role: "Dueño de restaurante",         initials: "CM", color: "from-amber-500 to-orange-500",text: "Las reservas automáticas son una maravilla. Mi mesero virtual nunca se equivoca y trabaja 24/7 sin quejarse." },
  { name: "Ana Torres",     role: "Directora de clínica dental",  initials: "AT", color: "from-blue-500 to-cyan-500",   text: "FlowAI cambió cómo gestionamos pacientes. Ya no perdemos citas y el seguimiento es automático." },
];

function TestimonialCard({ t, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref}
      className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 flex flex-col gap-4"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, background 0.3s, border-color 0.3s` }}>
      <div className="w-8 h-8 text-violet-400/40"><Icons.Quote /></div>
      <p className="text-sm text-slate-300 leading-relaxed flex-1">"{t.text}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0`}>
          {t.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">{t.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{t.role}</div>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[...Array(5)].map((_, i) => <div key={i} className="w-3.5 h-3.5 text-amber-400"><Icons.Star /></div>)}
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref} className="text-center mb-14"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
      {label && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 text-violet-300 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          {label}
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">{title}</h2>
      {subtitle && <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = "FlowAI | Automatiza tu negocio con IA";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Crea un asistente de IA que atiende clientes, gestiona citas, lleva inventario y automatiza tu negocio. Sin código. Gratis para empezar.");
  }, []);

  const goToLogin = (register = false, planId = null) => {
    // Si seleccionó un plan de pago, guardarlo para después del registro
    if (planId && planId !== 'free') {
      localStorage.setItem('pending_plan', planId);
      navigate(`/login?register=1&plan=${planId}`);
    } else {
      localStorage.removeItem('pending_plan');
      navigate(`/login${register ? "?register=1" : ""}`);
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#060610" }}>

      {/* ── Global CSS animations ── */}
      <style>{`
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatA { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-28px) scale(1.04)} }
        @keyframes floatB { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(8deg)} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.4)} 50%{box-shadow:0 0 40px rgba(124,58,237,0.6)} }
        .grad-btn { background-size:200%; animation:gradShift 4s ease infinite; }
        .animate-fadeSlideUp { animation: fadeSlideUp 0.4s ease-out forwards; }
        .border-white\\/8 { border-color:rgba(255,255,255,0.08); }
        .bg-white\\/8 { background-color:rgba(255,255,255,0.08); }
        .border-white\\/\\[0\\.06\\] { border-color:rgba(255,255,255,0.06); }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .btn-premium { 
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%);
          background-size: 200% 200%;
          animation: gradShift 3s ease infinite;
        }
        .btn-premium:hover { 
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(139, 92, 246, 0.4);
        }
      `}</style>

      {/* ─── Background orbs ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[5%] w-[700px] h-[700px] rounded-full opacity-[0.08]" style={{ background:"radial-gradient(circle,#8b5cf6,transparent 70%)", animation:"floatA 14s ease-in-out infinite" }} />
        <div className="absolute top-[35%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background:"radial-gradient(circle,#6366f1,transparent 70%)", animation:"floatA 18s ease-in-out infinite reverse" }} />
        <div className="absolute bottom-[5%] left-[25%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background:"radial-gradient(circle,#06b6d4,transparent 70%)", animation:"floatB 20s ease-in-out infinite" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      {/* ─── Navbar (mejorada - distribuida a los lados) ─── */}
      <nav className="sticky top-0 z-50 border-b transition-all duration-300" style={{ borderColor:"rgba(255,255,255,0.08)", background:"rgba(6,6,16,0.9)", backdropFilter:"blur(24px)" }}>
        <div className="w-full px-8 lg:px-16 py-4 flex items-center justify-between">
          {/* Izquierda - Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>
          {/* Centro - Navegación */}
          <div className="hidden md:flex items-center gap-10 text-sm font-medium absolute left-1/2 transform -translate-x-1/2">
            {[["#features","Funciones"],["#how","Cómo funciona"],["#pricing","Precios"]].map(([href,label]) => (
              <a key={href} href={href} className="text-slate-400 hover:text-white transition-all duration-300 relative group py-2">
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 group-hover:w-full rounded-full" />
              </a>
            ))}
          </div>
          {/* Derecha - Auth buttons */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <button onClick={() => goToLogin()} 
              className="text-sm font-medium text-slate-400 hover:text-white transition-all duration-300 hidden sm:block px-4 py-2 rounded-lg hover:bg-white/5">
              Iniciar sesión
            </button>
            <button onClick={() => goToLogin(true)} 
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-300 btn-premium shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50">
              Empezar gratis
            </button>
            <button className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200" onClick={() => setMenuOpen(o=>!o)} aria-label="Menú">
              {menuOpen
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-2" style={{ borderColor:"rgba(255,255,255,0.08)", background:"rgba(6,6,16,0.98)" }}>
            {[["#features","Funciones"],["#how","¿Cómo funciona?"],["#pricing","Precios"]].map(([href,label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-sm text-slate-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/5 transition-all">{label}</a>
            ))}
            <div className="border-t pt-3 mt-2" style={{ borderColor:"rgba(255,255,255,0.08)" }}>
              <button onClick={() => { setMenuOpen(false); goToLogin(); }} className="text-sm text-slate-400 hover:text-white w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/5 transition-all">Iniciar sesión</button>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-28 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

            {/* Left */}
            <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium mb-8 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                Disponible ahora · Sin tarjeta de crédito
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-7">
                <span className="text-white">Tu negocio</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 mt-2">
                  con IA en 5 min
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
                Crea un asistente que <span className="text-white font-medium">atiende clientes</span>, gestiona citas, lleva inventario y automatiza tu negocio — <span className="text-white font-medium">sin código</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button onClick={() => goToLogin(true)}
                  className="group px-8 py-4 rounded-2xl text-white font-semibold transition-all duration-300 text-base btn-premium shadow-2xl shadow-violet-900/40 hover:shadow-violet-900/60 flex items-center justify-center gap-2">
                  Crear cuenta gratis 
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <a href="#how" className="group px-8 py-4 rounded-2xl text-slate-300 font-semibold hover:text-white transition-all duration-300 text-base text-center border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center gap-2 backdrop-blur-sm">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ver cómo funciona
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                {[
                  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Sin tarjeta" },
                  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "Setup en 2 min" },
                  { icon: "M6 18L18 6M6 6l12 12", text: "Cancela cuando quieras" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={i === 2 ? "M5 13l4 4L19 7" : item.icon} />
                    </svg>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Demo */}
            <div className={`flex justify-center lg:justify-end transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 blur-[80px] rounded-full scale-150" />
                <div className="relative z-10"><DemoChat /></div>
                {/* Floating badge: reserva */}
                <div className="absolute -left-10 top-6 rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md hidden lg:flex shadow-xl"
                  style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", animation:"floatB 6s ease-in-out infinite" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/20 shadow-inner">
                    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-300">Reserva confirmada</div>
                    <div className="text-xs text-emerald-500/80">Hace 2 segundos</div>
                  </div>
                </div>
                {/* Floating badge: analytics */}
                <div className="absolute -right-8 bottom-8 rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md hidden lg:flex shadow-xl"
                  style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)", animation:"floatA 8s ease-in-out infinite" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/20 shadow-inner">
                    <div className="w-5 h-5 text-violet-400"><Icons.Analytics /></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-violet-300">+127 mensajes hoy</div>
                    <div className="text-xs text-violet-500/80">Atendidos por IA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 pt-12 border-t transition-all duration-700 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`} style={{ borderColor:"rgba(255,255,255,0.08)" }}>
            {[
              { value: "< 5 min",  label: "Setup inicial",        sub: "De registro a bot listo", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { value: "24 / 7",   label: "Atención automática",  sub: "Sin intervención humana", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
              { value: "0 código", label: "Necesario",            sub: "100% visual", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
            ].map((s, i) => (
              <div key={s.label} className="text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-1">{s.value}</div>
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative z-10 py-28 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader label="Funcionalidades" title="Todo lo que necesita tu negocio"
            subtitle="Una plataforma completa para digitalizar y automatizar con inteligencia artificial — sin escribir una sola línea de código." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard IconComp={Icons.Bot}     color="violet"  delay={0}   title="Asistente IA"       description="Chat conversacional que entiende a tus clientes, responde preguntas y gestiona datos en tiempo real." />
            <FeatureCard IconComp={Icons.Table}   color="blue"    delay={80}  title="Tablas dinámicas"   description="Gestiona clientes, citas, ventas e inventario — todo configurable sin código." />
            <FeatureCard IconComp={Icons.Flow}    color="amber"   delay={160} title="Flujos automáticos" description="Editor visual de automatizaciones. Conecta acciones, condiciones y notificaciones fácilmente." />
            <FeatureCard IconComp={Icons.Payment} color="emerald" delay={240} title="Links de pago"      description="Genera links de Wompi desde el chat. Tu bot cobra por ti con PSE, Nequi y tarjeta." />
            <FeatureCard IconComp={Icons.Import}  color="rose"    delay={320} title="Import / Export"    description="Importa tu base de datos desde Excel o CSV. Exporta en cualquier momento con un clic." />
            <FeatureCard IconComp={Icons.Phone}   color="slate"   delay={400} title="WhatsApp (pronto)"  description="Conecta tu agente a WhatsApp Business y atiende por el canal favorito de tus clientes." />
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how" className="relative z-10 py-28 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader label="Proceso" title="En 3 pasos, estás listo"
            subtitle="Sin configuraciones complicadas. En menos de 5 minutos tu asistente estará atendiendo clientes." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="absolute top-10 left-[24%] right-[24%] h-px hidden md:block"
              style={{ background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.5),rgba(79,70,229,0.5),transparent)" }} />
            <StepCard step={1} IconComp={Icons.ClipboardCheck} delay={0}   title="Regístrate gratis"    description="Crea tu cuenta en 30 segundos. Sin tarjeta de crédito, sin compromisos." />
            <StepCard step={2} IconComp={Icons.Wand}           delay={150} title="Configura tu negocio" description="El asistente te guía para crear tablas, definir tu bot y personalizar tu negocio." />
            <StepCard step={3} IconComp={Icons.Rocket}         delay={300} title="¡Tu bot está listo!"  description="Comparte el link con tus clientes. Ellos interactúan, tú descansas y creces." />
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="relative z-10 py-28 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader label="Testimonios" title="Negocios reales, resultados reales"
            subtitle="Emprendedores de todo LATAM ya automatizan su operación con FlowAI." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={t.name} t={t} delay={i * 100} />)}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative z-10 py-28 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader label="Precios" title="Simples y transparentes"
            subtitle="Empieza gratis hoy. Escala cuando tu negocio crezca. Sin contratos ni sorpresas." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => <PlanCard key={plan.id} plan={plan} onGetStarted={() => goToLogin(true, plan.id)} delay={i * 80} />)}
          </div>
        </div>
      </section>

      {/* ─── Trust strip ─── */}
      <section className="relative z-10 py-20 border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { IconComp: Icons.Shield,    title: "Datos seguros",      sub: "Encriptación end-to-end" },
              { IconComp: Icons.Lightning, title: "Ultra rápido",       sub: "Respuestas en < 2s" },
              { IconComp: Icons.Analytics, title: "Analytics incluido", sub: "Métricas en tiempo real" },
              { IconComp: Icons.Phone,     title: "Multi-canal",        sub: "Web, WhatsApp y más" },
            ].map(({ IconComp, title, sub }, i) => {
              const [ref, inView] = useInView(0.1);
              return (
                <div key={title} ref={ref} className="flex items-center gap-4 group"
                  style={{ opacity: inView?1:0, transform: inView?"translateX(0)":"translateX(-16px)", transition: `opacity 0.5s ease ${i*80}ms, transform 0.5s ease ${i*80}ms` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-violet-400 flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.25)" }}>
                    <div className="w-6 h-6"><IconComp /></div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white leading-tight">{title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="relative z-10 py-32 border-t overflow-hidden" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full opacity-15"
            style={{ background:"radial-gradient(ellipse,#8b5cf6,transparent 70%)" }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-10 shadow-2xl shadow-violet-900/50 btn-premium">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight">
            ¿Listo para automatizar
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 mt-2">
              tu negocio?
            </span>
          </h2>
          <p className="text-slate-400 text-lg sm:text-xl mb-12 max-w-lg mx-auto leading-relaxed">
            Únete a los primeros emprendedores que automatizan con IA. <span className="text-white font-medium">Gratis para siempre</span> en el plan básico.
          </p>
          <button onClick={() => goToLogin(true)}
            className="group px-12 py-5 rounded-2xl text-white text-lg font-bold transition-all duration-300 shadow-2xl shadow-violet-900/50 hover:shadow-violet-900/70 btn-premium flex items-center gap-3 mx-auto">
            Crear mi cuenta gratis
            <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-5 text-sm text-slate-600">Sin tarjeta de crédito · Sin contratos · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t py-12" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Logo />
          <p className="text-sm text-slate-600 order-last sm:order-none">© {new Date().getFullYear()} FlowAI. Todos los derechos reservados.</p>
          <div className="flex gap-8 text-sm text-slate-500">
            {[["#","Privacidad"],["#","Términos"],["mailto:hola@flowai.app","Contacto"]].map(([href,label]) => (
              <a key={label} href={href} className="hover:text-white transition-colors duration-200">{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
