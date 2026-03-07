/**
 * OnboardingWizard.jsx — v2
 * Flujo de bienvenida orientado a conversión.
 * 4 pasos: tipo de negocio → qué gestionar → nombre del bot → creando...
 */

import React, { useState, useEffect } from "react";
import { 
  Users, Calendar, CalendarDays, Bell, Package, ShoppingCart, ClipboardList,
  Scissors, UtensilsCrossed, Building2, Dumbbell, Store, GraduationCap, Wrench, Sparkles,
  Smile, Briefcase, Brain, Zap, Bot, AlertCircle, Building, BarChart, Loader2,
  PartyPopper, Check, Table
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  createWorkspace,
  createTable,
  createAgent,
  updateProfile,
} from "../api/client";

// ─── Datos ───────────────────────────────────────────────────────────────────

const TABLE_TEMPLATES = {
  clientes: {
    name: "Clientes",
    icon: "Users",
    description: "Contactos y datos de tus clientes",
    type: "customers",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "telefono", label: "Teléfono", type: "phone", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "notas", label: "Notas", type: "text" },
      { key: "fechaRegistro", label: "Fecha Registro", type: "date", defaultValue: "today" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  reservas: {
    name: "Reservas",
    icon: "CalendarDays",
    description: "Reservaciones y disponibilidad",
    type: "bookings",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente", type: "text", required: true },
      { key: "telefono", label: "Teléfono", type: "phone", required: true },
      { key: "fecha", label: "Fecha", type: "date", required: true },
      { key: "hora", label: "Hora", type: "text", required: true },
      { key: "personas", label: "Personas", type: "number", defaultValue: "2" },
      { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Confirmada", "Cancelada"], defaultValue: "Pendiente" },
      { key: "notas", label: "Notas", type: "text" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  citas: {
    name: "Citas",
    icon: "Calendar",
    description: "Agenda de citas y turnos",
    type: "appointments",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente", type: "text", required: true },
      { key: "telefono", label: "Teléfono", type: "phone", required: true },
      { key: "fecha", label: "Fecha", type: "date", required: true },
      { key: "hora", label: "Hora", type: "text", required: true },
      { key: "motivo", label: "Motivo", type: "text" },
      { key: "duracion", label: "Duración (min)", type: "number", defaultValue: "30" },
      { key: "estado", label: "Estado", type: "select", options: ["Programada", "Confirmada", "Cancelada", "Completada"], defaultValue: "Programada" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  servicios: {
    name: "Servicios",
    icon: "Bell",
    description: "Catálogo de servicios y precios",
    type: "services",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre del Servicio", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
      { key: "precio", label: "Precio", type: "number", required: true },
      { key: "duracion", label: "Duración (min)", type: "number" },
      { key: "disponible", label: "Disponible", type: "select", options: ["Sí", "No"], defaultValue: "Sí" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  productos: {
    name: "Productos",
    icon: "Package",
    description: "Inventario y catálogo",
    type: "products",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "precio", label: "Precio", type: "number", required: true },
      { key: "stock", label: "Stock", type: "number", required: true },
      { key: "categoria", label: "Categoría", type: "text" },
      { key: "descripcion", label: "Descripción", type: "text" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  pedidos: {
    name: "Pedidos",
    icon: "ShoppingCart",
    description: "Gestión de órdenes y entregas",
    type: "orders",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente", type: "text", required: true },
      { key: "telefono", label: "Teléfono", type: "phone" },
      { key: "productos", label: "Productos", type: "text", required: true },
      { key: "total", label: "Total", type: "number" },
      { key: "fecha", label: "Fecha", type: "date", defaultValue: "today" },
      { key: "estado", label: "Estado", type: "select", options: ["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"], defaultValue: "Nuevo" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  inventario: {
    name: "Inventario",
    icon: "ClipboardList",
    description: "Control de stock y materiales",
    type: "inventory",
    displayField: "item",
    headers: [
      { key: "item", label: "Item", type: "text", required: true },
      { key: "cantidad", label: "Cantidad", type: "number", required: true },
      { key: "minimo", label: "Stock Mínimo", type: "number" },
      { key: "ubicacion", label: "Ubicación", type: "text" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
};

const BUSINESS_TYPES = [
  { id: "salon", icon: "Scissors", name: "Salón / Barbería / Spa", description: "Citas, clientes, servicios", color: "#ec4899", workspace: { name: "Mi Salón", color: "#ec4899" }, suggestedTables: ["clientes", "citas", "servicios"], agentName: "Asistente de Citas", agentDescription: "Soy el asistente virtual del salón. Puedo agendar citas, consultar disponibilidad y responder sobre servicios y precios." },
  { id: "restaurant", icon: "UtensilsCrossed", name: "Restaurante / Cafetería", description: "Reservas, pedidos, menú", color: "#f59e0b", workspace: { name: "Mi Restaurante", color: "#f59e0b" }, suggestedTables: ["clientes", "reservas", "pedidos"], agentName: "Asistente de Reservas", agentDescription: "Soy el asistente del restaurante. Gestiono reservas, tomo pedidos y respondo sobre el menú y horarios." },
  { id: "clinic", icon: "Building2", name: "Consultorio / Clínica", description: "Pacientes, citas, historial", color: "#10b981", workspace: { name: "Mi Consultorio", color: "#10b981" }, suggestedTables: ["clientes", "citas", "servicios"], agentName: "Asistente Médico", agentDescription: "Soy el asistente del consultorio. Agendo citas, consulto disponibilidad y oriento a los pacientes." },
  { id: "gym", icon: "Dumbbell", name: "Gimnasio / Fitness", description: "Miembros, clases, horarios", color: "#ef4444", workspace: { name: "Mi Gimnasio", color: "#ef4444" }, suggestedTables: ["clientes", "servicios", "reservas"], agentName: "Asistente Fitness", agentDescription: "Soy el asistente del gimnasio. Informo sobre clases, horarios y gestiono inscripciones." },
  { id: "store", icon: "Store", name: "Tienda / E-commerce", description: "Productos, pedidos, inventario", color: "#3b82f6", workspace: { name: "Mi Tienda", color: "#3b82f6" }, suggestedTables: ["productos", "pedidos", "clientes"], agentName: "Asistente de Ventas", agentDescription: "Soy el asistente de la tienda. Consulto productos, precios, stock y ayudo a procesar pedidos." },
  { id: "education", icon: "GraduationCap", name: "Academia / Educación", description: "Alumnos, clases, pagos", color: "#8b5cf6", workspace: { name: "Mi Academia", color: "#8b5cf6" }, suggestedTables: ["clientes", "servicios", "reservas"], agentName: "Asistente Académico", agentDescription: "Soy el asistente de la academia. Informo sobre cursos, horarios e inscripciones." },
  { id: "services", icon: "Wrench", name: "Servicios / Profesional", description: "Clientes, proyectos, cotizaciones", color: "#06b6d4", workspace: { name: "Mis Servicios", color: "#06b6d4" }, suggestedTables: ["clientes", "servicios", "pedidos"], agentName: "Asistente de Servicio", agentDescription: "Soy el asistente de atención al cliente. Oriento sobre servicios, precios y coordino citas." },
  { id: "custom", icon: "Sparkles", name: "Otro tipo de negocio", description: "Configura a tu medida", color: "#6b7280", workspace: { name: "Mi Negocio", color: "#6b7280" }, suggestedTables: ["clientes"], agentName: "Asistente Virtual", agentDescription: "Soy tu asistente virtual. Atiendo clientes, respondo preguntas y gestiono información." },
];

const BOT_PERSONALITIES = [
  { id: "amigable", icon: "Smile", name: "Amigable", description: "Cálido, cercano y empático", preview: "¡Hola! ¿En qué puedo ayudarte hoy?", style: "Usa un tono amigable y cercano. Tutea al cliente, usa emojis ocasionalmente y muéstrate siempre dispuesto a ayudar." },
  { id: "profesional", icon: "Briefcase", name: "Profesional", description: "Formal, preciso y confiable", preview: "Buenos días. ¿En qué puedo asistirle?", style: "Usa un tono profesional y formal. Responde con precisión y cortesía, evita los emojis excesivos." },
  { id: "experto", icon: "Brain", name: "Experto", description: "Conocedor, detallado y técnico", preview: "Estoy listo para atenderte. ¿Qué necesitas?", style: "Presenta el conocimiento con autoridad. Ofrece detalles relevantes y muéstrate como experto en el área." },
];

// ─── Icon Helpers ─────────────────────────────────────────────────────────────

const IconMap = {
  // Tables
  Users, Calendar, CalendarDays, Bell, Package, ShoppingCart, ClipboardList,
  // Business types
  Scissors, UtensilsCrossed, Building2, Dumbbell, Store, GraduationCap, Wrench, Sparkles,
  // Personalities
  Smile, Briefcase, Brain,
  // UI
  Zap, Bot, AlertCircle, Building, BarChart, Loader2
};

const Icon = ({ name, className = "w-5 h-5", ...props }) => {
  const LucideIcon = IconMap[name];
  return LucideIcon ? <LucideIcon className={className} {...props} /> : null;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onSkip }) {
  const { setWorkspace } = useWorkspace();

  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(1);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedTables, setSelectedTables] = useState([]);
  const [botName, setBotName] = useState("");
  const [botPersonality, setBotPersonality] = useState("amigable");

  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("Iniciando...");
  const [error, setError] = useState(null);
  const [createdSummary, setCreatedSummary] = useState(null);

  const TOTAL_STEPS = 3;

  const goTo = (nextStep) => {
    if (animating) return;
    setDirection(nextStep > step ? 1 : -1);
    setAnimating(true);
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 220);
  };

  const handleSelectBusiness = (biz) => {
    setSelectedBusiness(biz);
    setSelectedTables(biz.suggestedTables.slice(0, 3));
    setBotName(biz.agentName);
    goTo(1);
  };

  const handleTableToggle = (key) => {
    setSelectedTables((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length < 3 ? [...prev, key] : prev
    );
  };

  const handleCreate = async () => {
    if (!selectedBusiness) return;
    setStep(3);
    setError(null);
    setProgress(0);

    try {
      setProgressMsg("Creando tu espacio de trabajo...");
      setProgress(15);
      const wsRes = await createWorkspace({
        name: selectedBusiness.workspace.name,
        color: selectedBusiness.workspace.color,
      });
      const workspaceId = wsRes.data?._id || wsRes.data?.id;
      if (!workspaceId) throw new Error("No se pudo crear el workspace");

      if (typeof setWorkspace === "function") {
        setWorkspace(workspaceId, selectedBusiness.workspace.name);
      }

      const tableNames = [];
      for (let i = 0; i < selectedTables.length; i++) {
        const key = selectedTables[i];
        const tmpl = TABLE_TEMPLATES[key];
        if (!tmpl) continue;
        setProgressMsg(`Configurando tabla: ${tmpl.name}...`);
        setProgress(20 + (i / Math.max(selectedTables.length, 1)) * 40);
        await createTable({ workspaceId, name: tmpl.name, type: tmpl.type, icon: tmpl.icon, displayField: tmpl.displayField, permissions: tmpl.permissions, headers: tmpl.headers });
        tableNames.push(tmpl.name);
      }

      setProgressMsg("Entrenando tu asistente de IA...");
      setProgress(70);

      const personality = BOT_PERSONALITIES.find((p) => p.id === botPersonality);
      const systemPrompt = `${selectedBusiness.agentDescription}\n\n${personality?.style || ""}\n\nTablas disponibles: ${tableNames.join(", ")}.`;

      await createAgent({
        workspaceId,
        agent: {
          name: botName || selectedBusiness.agentName,
          description: selectedBusiness.agentDescription,
          systemPrompt,
          aiModel: ["gpt-4o-mini"],
          tables: selectedTables,
          isActive: true,
        },
      });

      setProgressMsg("Guardando configuración...");
      setProgress(90);
      await updateProfile({ onboardingCompleted: true, businessType: selectedBusiness.id }).catch(() => {});

      setProgress(100);
      setProgressMsg("¡Todo listo!");
      setCreatedSummary({ workspaceName: selectedBusiness.workspace.name, tables: tableNames, agentName: botName || selectedBusiness.agentName });
      setTimeout(() => setStep(4), 600);
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setError(err.response?.data?.error || err.message || "Error inesperado");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-2xl">
        {step < 3 && (
          <div className="mb-6 px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Paso {step + 1} de {TOTAL_STEPS}</span>
              {step === 0 && (
                <button onClick={onSkip} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Saltar configuración
                </button>
              )}
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
            </div>
          </div>
        )}

        <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-220 ${animating ? (direction > 0 ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4") : "opacity-100 translate-x-0"}`} style={{ transition: "opacity 0.22s, transform 0.22s" }}>
          {step === 0 && <StepBusiness onSelect={handleSelectBusiness} />}
          {step === 1 && selectedBusiness && <StepTables business={selectedBusiness} selected={selectedTables} onToggle={handleTableToggle} onBack={() => goTo(0)} onNext={() => goTo(2)} />}
          {step === 2 && selectedBusiness && <StepBot botName={botName} setBotName={setBotName} personality={botPersonality} setPersonality={setBotPersonality} onBack={() => goTo(1)} onCreate={handleCreate} />}
          {step === 3 && <StepCreating progress={progress} message={progressMsg} error={error} onRetry={() => { setStep(2); setError(null); }} />}
          {step === 4 && createdSummary && <StepDone summary={createdSummary} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: Tipo de negocio ──────────────────────────────────────────────────

function StepBusiness({ onSelect }) {
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-4 shadow-lg shadow-violet-900/40"><Zap className="w-7 h-7 text-white" /></div>
        <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido a FlowAI!</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">En menos de 2 minutos tu negocio tendrá un asistente de IA.<br />¿Qué tipo de negocio tienes?</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BUSINESS_TYPES.map((biz) => (
          <button key={biz.id} onClick={() => onSelect(biz)}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 cursor-pointer text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110" style={{ background: biz.color + "22" }}><Icon name={biz.icon} className="w-6 h-6" style={{ color: biz.color }} /></div>
            <div>
              <div className="text-xs font-semibold text-white leading-tight">{biz.name}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">{biz.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Tablas ───────────────────────────────────────────────────────────

function StepTables({ business, selected, onToggle, onBack, onNext }) {
  const allKeys = Object.keys(TABLE_TEMPLATES);
  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-6 transition-colors">← Volver</button>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: business.color + "22" }}><Icon name={business.icon} className="w-6 h-6" style={{ color: business.color }} /></div>
          <div>
            <h2 className="text-xl font-bold text-white">{business.name}</h2>
            <p className="text-slate-400 text-sm">¿Qué quieres gestionar?</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">Selecciona hasta 3 tablas • Seleccionadas: {selected.length}/3</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {allKeys.map((key) => {
          const tmpl = TABLE_TEMPLATES[key];
          const isSelected = selected.includes(key);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button key={key} onClick={() => !isDisabled && onToggle(key)} disabled={isDisabled}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 text-center ${isSelected ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-900/20" : isDisabled ? "border-slate-800 bg-slate-800/30 opacity-40 cursor-not-allowed" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800 cursor-pointer"}`}>
              <Icon name={tmpl.icon} className={`w-6 h-6 ${isSelected ? "text-violet-400" : "text-slate-400"}`} />
              <div className={`text-xs font-semibold ${isSelected ? "text-violet-300" : "text-white"}`}>{tmpl.name}</div>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{selected.length === 0 ? "Selecciona al menos 1 tabla" : `${selected.length} tabla${selected.length > 1 ? "s" : ""} seleccionada${selected.length > 1 ? "s" : ""}`}</p>
        <button onClick={onNext} disabled={selected.length === 0}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30">
          Continuar →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Bot ──────────────────────────────────────────────────────────────

function StepBot({ botName, setBotName, personality, setPersonality, onBack, onCreate }) {
  const currentPersonality = BOT_PERSONALITIES.find(p => p.id === personality);
  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-6 transition-colors">← Volver</button>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Bot className="w-5 h-5 text-violet-400" /> Tu asistente de IA</h2>
        <p className="text-slate-400 text-sm">Dale nombre y personalidad. Podrás cambiarlo después.</p>
      </div>
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre del asistente</label>
        <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="Ej: Asistente de Citas" maxLength={40}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm transition-all" />
      </div>
      <div className="mb-8">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Personalidad</label>
        <div className="grid grid-cols-3 gap-3">
          {BOT_PERSONALITIES.map((p) => (
            <button key={p.id} onClick={() => setPersonality(p.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 text-center cursor-pointer ${personality === p.id ? "border-violet-500 bg-violet-500/10 shadow shadow-violet-900/20" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"}`}>
              <Icon name={p.icon} className={`w-6 h-6 ${personality === p.id ? "text-violet-400" : "text-slate-400"}`} />
              <div className={`text-xs font-semibold ${personality === p.id ? "text-violet-300" : "text-slate-300"}`}>{p.name}</div>
              <div className="text-xs text-slate-500 leading-tight">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-500 mb-3 font-medium">Vista previa</div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-white" /></div>
          <div className="flex-1">
            <div className="text-xs font-medium text-violet-300 mb-1">{botName || "Tu asistente"}</div>
            <div className="bg-slate-700/60 rounded-xl rounded-tl-none px-3 py-2 text-sm text-slate-300 inline-block">{currentPersonality?.preview}</div>
          </div>
        </div>
      </div>
      <button onClick={onCreate} disabled={!botName.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30 text-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" /> Crear mi negocio
      </button>
    </div>
  );
}

// ─── Step 3: Creando ──────────────────────────────────────────────────────────

function StepCreating({ progress, message, error, onRetry }) {
  return (
    <div className="p-8 text-center">
      {error ? (
        <>
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center"><AlertCircle className="w-6 h-6 text-red-400" /></div>
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button onClick={onRetry} className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors">Intentar de nuevo</button>
        </>
      ) : (
        <>
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-900/50">
              {progress < 40 ? <Building className="w-8 h-8 text-white" /> : progress < 70 ? <BarChart className="w-8 h-8 text-white" /> : progress < 90 ? <Bot className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-white" />}
            </div>
            <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80" style={{ animationDuration: "2s" }}>
              <circle cx="40" cy="40" r="37" fill="none" stroke="#7c3aed" strokeWidth="3" strokeDasharray="70 160" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Configurando tu negocio</h2>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-slate-600">{Math.round(progress)}%</p>
          <div className="mt-6 flex justify-center gap-8 text-xs text-slate-600">
            <span className={progress >= 15 ? "text-violet-400" : ""}>① Workspace</span>
            <span className={progress >= 40 ? "text-violet-400" : ""}>② Tablas</span>
            <span className={progress >= 70 ? "text-violet-400" : ""}>③ Asistente IA</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step 4: Listo ────────────────────────────────────────────────────────────

function StepDone({ summary, onComplete }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div className={`p-8 text-center transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center" style={{ filter: "drop-shadow(0 0 16px #7c3aed88)" }}><PartyPopper className="w-8 h-8 text-white" /></div>
      <h2 className="text-2xl font-bold text-white mb-2">¡Tu negocio está listo!</h2>
      <p className="text-slate-400 text-sm mb-8">Todo quedó configurado. Ya puedes empezar a usar FlowAI.</p>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-6 text-left space-y-3">
        <SummaryItem icon={<Building2 className="w-4 h-4 text-violet-400" />} label="Proyecto creado" value={summary.workspaceName} />
        {summary.tables.length > 0 && <SummaryItem icon={<Table className="w-4 h-4 text-violet-400" />} label={`${summary.tables.length} tabla${summary.tables.length > 1 ? "s" : ""} creada${summary.tables.length > 1 ? "s" : ""}`} value={summary.tables.join(", ")} />}
        <SummaryItem icon={<Bot className="w-4 h-4 text-violet-400" />} label="Asistente IA" value={summary.agentName} highlight />
      </div>
      <button onClick={onComplete} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-900/30 text-sm">
        Ir al panel →
      </button>
      <p className="mt-3 text-xs text-slate-600">Puedes personalizar más desde el panel de configuración</p>
    </div>
  );
}

function SummaryItem({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-sm font-medium truncate ${highlight ? "text-violet-300" : "text-slate-300"}`}>{value}</div>
      </div>
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
      </div>
    </div>
  );
}
