/**
 * OnboardingWizard - Guía inicial para usuarios nuevos
 * Configura workspace, tablas y asistente automáticamente
 * Incluye selección de plan y datos generales del negocio
 * 
 * Tablas organizadas por TIPO: Clientes, Servicios, Reservas, Productos, etc.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { createWorkspace, createTable, createAgent, listPlans, updateProfile, listWorkspaces, updateWorkspace } from "../api/client";
import { CheckIcon } from "./Icons";

// React Icons - Lucide (profesionales y modernos)
import { 
  LuScissors, 
  LuUtensilsCrossed, 
  LuStethoscope, 
  LuDumbbell, 
  LuShoppingBag, 
  LuGraduationCap, 
  LuBriefcase,
  LuSparkles,
  LuUsers,
  LuCalendarDays,
  LuCalendarClock,
  LuWrench,
  LuBox,
  LuShoppingCart,
  LuClipboardList,
  LuStore,
  LuMapPin,
  LuPhone,
  LuClock,
  LuBuilding2
} from "react-icons/lu";

// ============================================================================
// ICONOS PARA TIPOS DE NEGOCIO (componentes react-icons)
// ============================================================================
const BUSINESS_ICONS = {
  salon: LuScissors,
  restaurant: LuUtensilsCrossed,
  clinic: LuStethoscope,
  gym: LuDumbbell,
  store: LuShoppingBag,
  education: LuGraduationCap,
  services: LuBriefcase,
  custom: LuSparkles,
};

// ============================================================================
// ICONOS PARA TABLAS (componentes react-icons)
// ============================================================================
const TABLE_ICONS = {
  clientes: LuUsers,
  reservas: LuCalendarDays,
  citas: LuCalendarClock,
  servicios: LuWrench,
  productos: LuBox,
  pedidos: LuShoppingCart,
  inventario: LuClipboardList,
};

// ============================================================================
// PLANTILLAS DE TABLAS POR TIPO
// Organizadas para que el cliente elija fácilmente qué necesita
// ============================================================================

const TABLE_TEMPLATES = {
  clientes: {
    name: "Clientes",
    icon: "👥",
    description: "Base de datos de clientes",
    type: "customers",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre Completo", type: "text", required: true, emoji: "👤" },
      { key: "telefono", label: "Teléfono", type: "phone", required: true, emoji: "📱" },
      { key: "email", label: "Email", type: "email", emoji: "📧" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Nuevo", "Regular", "VIP"], defaultValue: "Nuevo", emoji: "⭐" },
      { key: "notas", label: "Notas", type: "text", emoji: "📝" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  reservas: {
    name: "Reservas",
    icon: "📅",
    description: "Sistema de reservaciones",
    type: "reservations",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente", type: "text", required: true, emoji: "👤" },
      { key: "telefono", label: "Teléfono", type: "phone", required: true, emoji: "📱" },
      { key: "fecha", label: "Fecha", type: "date", required: true, emoji: "📅" },
      { key: "hora", label: "Hora", type: "text", required: true, emoji: "🕐" },
      { key: "servicio", label: "Servicio", type: "text", emoji: "🛎️" },
      { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Confirmada", "Completada", "Cancelada"], defaultValue: "Pendiente", emoji: "📊" },
      { key: "notas", label: "Notas", type: "text", emoji: "📝" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  citas: {
    name: "Citas",
    icon: "🗓️",
    description: "Agenda de citas",
    type: "appointments",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente/Paciente", type: "text", required: true, emoji: "👤" },
      { key: "telefono", label: "Teléfono", type: "phone", required: true, emoji: "📱" },
      { key: "fecha", label: "Fecha", type: "date", required: true, emoji: "📅" },
      { key: "hora", label: "Hora", type: "text", required: true, emoji: "🕐" },
      { key: "motivo", label: "Motivo", type: "text", emoji: "📋" },
      { key: "duracion", label: "Duración (min)", type: "number", defaultValue: "30", emoji: "⏱️" },
      { key: "estado", label: "Estado", type: "select", options: ["Programada", "Confirmada", "En curso", "Completada", "Cancelada"], defaultValue: "Programada", emoji: "📊" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  servicios: {
    name: "Servicios",
    icon: "🛎️",
    description: "Catálogo de servicios",
    type: "services",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre del Servicio", type: "text", required: true, emoji: "🛎️" },
      { key: "descripcion", label: "Descripción", type: "text", emoji: "📝" },
      { key: "precio", label: "Precio", type: "number", required: true, emoji: "💰" },
      { key: "duracion", label: "Duración (min)", type: "number", emoji: "⏱️" },
      { key: "categoria", label: "Categoría", type: "text", emoji: "🏷️" },
      { key: "disponible", label: "Disponible", type: "select", options: ["Sí", "No"], defaultValue: "Sí", emoji: "✅" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  productos: {
    name: "Productos",
    icon: "📦",
    description: "Inventario de productos",
    type: "products",
    displayField: "nombre",
    headers: [
      { key: "nombre", label: "Nombre", type: "text", required: true, emoji: "📦" },
      { key: "precio", label: "Precio", type: "number", required: true, emoji: "💰" },
      { key: "stock", label: "Stock", type: "number", required: true, emoji: "📊" },
      { key: "categoria", label: "Categoría", type: "text", emoji: "🏷️" },
      { key: "descripcion", label: "Descripción", type: "text", emoji: "📝" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  pedidos: {
    name: "Pedidos",
    icon: "🛒",
    description: "Gestión de pedidos",
    type: "orders",
    displayField: "cliente",
    headers: [
      { key: "cliente", label: "Cliente", type: "text", required: true, emoji: "👤" },
      { key: "telefono", label: "Teléfono", type: "phone", emoji: "📱" },
      { key: "productos", label: "Productos", type: "text", required: true, emoji: "📦" },
      { key: "total", label: "Total", type: "number", emoji: "💰" },
      { key: "fecha", label: "Fecha", type: "date", defaultValue: "today", emoji: "📅" },
      { key: "estado", label: "Estado", type: "select", options: ["Nuevo", "Preparando", "Listo", "Entregado", "Cancelado"], defaultValue: "Nuevo", emoji: "📊" },
      { key: "direccion", label: "Dirección", type: "text", emoji: "📍" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
  inventario: {
    name: "Inventario",
    icon: "📋",
    description: "Control de inventario",
    type: "inventory",
    displayField: "item",
    headers: [
      { key: "item", label: "Item", type: "text", required: true, emoji: "📦" },
      { key: "cantidad", label: "Cantidad", type: "number", required: true, emoji: "🔢" },
      { key: "minimo", label: "Stock Mínimo", type: "number", emoji: "⚠️" },
      { key: "ubicacion", label: "Ubicación", type: "text", emoji: "📍" },
      { key: "ultimaActualizacion", label: "Última Actualización", type: "date", emoji: "📅" },
    ],
    permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
  },
};

// ============================================================================
// TIPOS DE NEGOCIO
// Cada uno sugiere tablas específicas según el tipo
// ============================================================================

const BUSINESS_TYPES = [
  {
    id: "salon",
    icon: "💇",
    name: "Salón / Barbería / Spa",
    description: "Citas, clientes, servicios",
    color: "#ec4899",
    workspace: { name: "Mi Salón", color: "#ec4899" },
    suggestedTables: ["clientes", "citas", "servicios"],
    agent: {
      name: "Asistente de Citas",
      description: "Ayudo a agendar citas, consultar horarios disponibles y gestionar información de clientes. Puedo crear, modificar y cancelar citas.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "restaurant",
    icon: "🍽️",
    name: "Restaurante / Cafetería",
    description: "Reservas, pedidos, menú",
    color: "#f59e0b",
    workspace: { name: "Mi Restaurante", color: "#f59e0b" },
    suggestedTables: ["clientes", "reservas", "productos", "pedidos"],
    agent: {
      name: "Asistente de Reservas",
      description: "Ayudo a gestionar reservaciones y pedidos. Puedo consultar disponibilidad, crear reservas y tomar pedidos.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "clinic",
    icon: "🏥",
    name: "Consultorio / Clínica",
    description: "Pacientes, citas, historial",
    color: "#10b981",
    workspace: { name: "Mi Consultorio", color: "#10b981" },
    suggestedTables: ["clientes", "citas", "servicios"],
    customLabels: { clientes: "Pacientes" },
    agent: {
      name: "Asistente Médico",
      description: "Ayudo a gestionar citas médicas y consultar información de pacientes. Puedo agendar, reagendar y consultar historial.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "gym",
    icon: "🏋️",
    name: "Gimnasio / Centro Fitness",
    description: "Miembros, clases, horarios",
    color: "#ef4444",
    workspace: { name: "Mi Gimnasio", color: "#ef4444" },
    suggestedTables: ["clientes", "servicios", "reservas"],
    customLabels: { clientes: "Miembros", servicios: "Clases" },
    agent: {
      name: "Asistente Fitness",
      description: "Ayudo a gestionar membresías, reservar clases y consultar horarios. Puedo informar sobre disponibilidad y servicios.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "store",
    icon: "🛍️",
    name: "Tienda / E-commerce",
    description: "Productos, pedidos, clientes",
    color: "#8b5cf6",
    workspace: { name: "Mi Tienda", color: "#8b5cf6" },
    suggestedTables: ["clientes", "productos", "pedidos", "inventario"],
    agent: {
      name: "Asistente de Ventas",
      description: "Ayudo a consultar productos, verificar stock y gestionar pedidos. Puedo informar precios y disponibilidad.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "education",
    icon: "📚",
    name: "Academia / Escuela",
    description: "Estudiantes, clases, horarios",
    color: "#3b82f6",
    workspace: { name: "Mi Academia", color: "#3b82f6" },
    suggestedTables: ["clientes", "servicios", "reservas"],
    customLabels: { clientes: "Estudiantes", servicios: "Cursos", reservas: "Inscripciones" },
    agent: {
      name: "Asistente Académico",
      description: "Ayudo a gestionar inscripciones, consultar horarios de clases y información de estudiantes.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "services",
    icon: "💼",
    name: "Servicios Profesionales",
    description: "Clientes, proyectos, citas",
    color: "#06b6d4",
    workspace: { name: "Mi Negocio", color: "#06b6d4" },
    suggestedTables: ["clientes", "citas", "servicios"],
    agent: {
      name: "Asistente de Negocios",
      description: "Ayudo a gestionar clientes y agendar citas. Puedo consultar información y dar seguimiento.",
      aiModel: ["gpt-4o-mini"],
    },
  },
  {
    id: "custom",
    icon: "✨",
    name: "Personalizado",
    description: "Configura tus propias tablas",
    color: "#6b7280",
    workspace: { name: "Mi Proyecto", color: "#6b7280" },
    suggestedTables: [],
    agent: null,
  },
];

// Pasos del wizard
const STEPS = [
  { id: 0, title: "Tu plan", desc: "Elige cómo quieres empezar" },
  { id: 1, title: "Tipo de negocio", desc: "¿Qué tipo de negocio tienes?" },
  { id: 2, title: "Tablas", desc: "Selecciona qué datos necesitas" },
  { id: 3, title: "Tu negocio", desc: "Datos generales de tu empresa" },
  { id: 4, title: "Resumen", desc: "Revisa lo que vamos a crear" },
  { id: 5, title: "Creando...", desc: "Configurando tu asistente" },
];

// Horarios por defecto
const DEFAULT_BUSINESS_INFO = {
  direccion: "",
  telefono: "",
  horarios: {
    lunesViernes: { abre: "09:00", cierra: "18:00", activo: true },
    sabado: { abre: "09:00", cierra: "14:00", activo: true },
    domingo: { abre: "", cierra: "", activo: false },
  }
};

// Helper para obtener tablas desde templates
const getTablesFromTemplates = (templateKeys, customLabels = {}) => {
  return templateKeys.map(key => {
    const template = TABLE_TEMPLATES[key];
    if (!template) return null;
    return {
      ...template,
      name: customLabels[key] || template.name,
      description: `${customLabels[key] || template.name} - ${template.description}`,
    };
  }).filter(Boolean);
};

export default function OnboardingWizard({ onComplete, onSkip, showPlanStep = true }) {
  const navigate = useNavigate();
  const { setWorkspace } = useWorkspace();
  const [step, setStep] = useState(showPlanStep ? 0 : 1);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedTables, setSelectedTables] = useState([]); // Nuevas tablas seleccionadas
  const [workspaceName, setWorkspaceName] = useState("");
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO); // Datos generales
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [existingWorkspace, setExistingWorkspace] = useState(null); // Workspace existente (si lo hay)

  // Cargar planes y verificar workspace existente al iniciar
  useEffect(() => {
    const init = async () => {
      try {
        // Verificar si ya existe un workspace
        const wsRes = await listWorkspaces();
        const workspaces = wsRes.data?.data || wsRes.data || [];
        if (workspaces.length > 0) {
          setExistingWorkspace(workspaces[0]);
          setWorkspaceName(workspaces[0].name || "");
          // Cargar businessInfo si existe
          if (workspaces[0].businessInfo) {
            setBusinessInfo(prev => ({
              ...prev,
              ...workspaces[0].businessInfo,
            }));
          }
        }

        // Cargar planes
        if (showPlanStep) {
          const plansRes = await listPlans();
          const activePlans = (plansRes.data?.data || []).filter(p => p.isActive);
          setPlans(activePlans);
          // Seleccionar plan free por defecto
          const freePlan = activePlans.find(p => p._id === 'free');
          if (freePlan) setSelectedPlan(freePlan);
        }
      } catch (err) {
        console.error('Error inicializando:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    init();
  }, [showPlanStep]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handlePlanContinue = () => {
    if (!selectedPlan) return;
    setStep(1);
  };

  // Obtener límite de tablas desde el plan (configurado en backend)
  const getTableLimit = () => {
    if (!selectedPlan?.limits?.tablesPerWorkspace) return 3; // Fallback al valor free
    const limit = selectedPlan.limits.tablesPerWorkspace;
    // -1 significa ilimitado, ponemos un máximo razonable para UI
    return limit === -1 ? 100 : limit;
  };

  const tableLimit = getTableLimit();

  const handleSelectBusiness = (business) => {
    setSelectedBusiness(business);
    setWorkspaceName(business.workspace.name);
    // Preseleccionar tablas sugeridas (respetando límite del plan)
    const suggested = business.suggestedTables || [];
    setSelectedTables(suggested.slice(0, tableLimit));
    // Si es personalizado, ir a selección de tablas; si no, también para que pueda ajustar
    setStep(2);
  };

  const handleTableToggle = (tableKey) => {
    setSelectedTables(prev => {
      if (prev.includes(tableKey)) {
        return prev.filter(k => k !== tableKey);
      }
      // Verificar límite del plan
      if (prev.length >= tableLimit) {
        return prev; // No agregar más
      }
      return [...prev, tableKey];
    });
  };

  const handleTablesSubmit = () => {
    setStep(3);
  };

  const handleBusinessInfoSubmit = (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setStep(4);
  };

  const updateHorario = (periodo, field, value) => {
    setBusinessInfo(prev => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [periodo]: {
          ...prev.horarios[periodo],
          [field]: value,
        }
      }
    }));
  };

  const handleCreate = async () => {
    if (!selectedBusiness) return;
    setStep(5);
    setCreating(true);
    setProgress(0);
    setError(null);

    try {
      let workspaceId;

      // 1. Usar workspace existente o crear uno nuevo
      setProgress(20);
      if (existingWorkspace) {
        // Actualizar el workspace existente
        await updateWorkspace(existingWorkspace._id, {
          name: workspaceName.trim(),
          color: selectedBusiness.workspace.color,
          businessInfo: {
            direccion: businessInfo.direccion,
            telefono: businessInfo.telefono,
            horarios: businessInfo.horarios,
          },
        });
        workspaceId = existingWorkspace._id;
      } else {
        // Crear nuevo workspace
        const wsRes = await createWorkspace({
          name: workspaceName.trim(),
          color: selectedBusiness.workspace.color,
          businessInfo: {
            direccion: businessInfo.direccion,
            telefono: businessInfo.telefono,
            horarios: businessInfo.horarios,
          },
        });
        workspaceId = wsRes.data._id;
      }
      
      setWorkspace(workspaceId, workspaceName.trim());

      // Si no hay tablas seleccionadas (personalizado sin tablas), terminar
      if (selectedTables.length === 0) {
        setProgress(100);
        setTimeout(() => {
          onComplete?.();
          navigate("/tables");
        }, 500);
        return;
      }

      // 2. Crear tablas desde templates
      setProgress(40);
      const tableIds = [];
      const tablesToCreate = getTablesFromTemplates(selectedTables, selectedBusiness.customLabels);
      
      for (const tableConfig of tablesToCreate) {
        const tableRes = await createTable({
          workspaceId,
          ...tableConfig,
        });
        tableIds.push({ tableId: tableRes.data._id, fullAccess: true });
        setProgress((prev) => Math.min(prev + 15, 70));
      }

      // 3. Crear agente (si existe configuración)
      if (selectedBusiness.agent && tableIds.length > 0) {
        setProgress(80);
        await createAgent({
          workspaceId,
          agent: {
            ...selectedBusiness.agent,
            tables: tableIds,
          },
        });
      }

      setProgress(100);

      // Esperar un momento para que se vea el 100%
      setTimeout(() => {
        onComplete?.();
        navigate("/chat");
      }, 800);

    } catch (err) {
      console.error("Error en onboarding:", err);
      setError(err.response?.data?.error || err.message || "Error al configurar");
      setCreating(false);
    }
  };

  // Renderizar paso actual
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Elige tu plan
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Selecciona el plan que mejor se adapte a tu negocio
            </p>

            {loadingPlans ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <button
                      key={plan._id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`relative p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] ${
                        selectedPlan?._id === plan._id ? 'ring-2' : ''
                      }`}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: `2px solid ${selectedPlan?._id === plan._id ? plan.ui?.color || '#a855f7' : "rgba(255, 255, 255, 0.08)"}`,
                        ringColor: plan.ui?.color || '#a855f7'
                      }}
                    >
                      {plan._id === 'premium' && (
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                          Popular
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-white capitalize">{plan._id}</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                          {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-zinc-400">/mes</span>}
                        </p>
                      </div>
                      
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-zinc-300">
                          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {plan.limits?.workspaces === -1 ? 'Workspaces ilimitados' : `${plan.limits?.workspaces || 1} workspace${plan.limits?.workspaces !== 1 ? 's' : ''}`}
                        </li>
                        <li className="flex items-center gap-2 text-zinc-300">
                          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {plan.limits?.tablesPerWorkspace === -1 ? 'Tablas ilimitadas' : `${plan.limits?.tablesPerWorkspace || 3} tablas/workspace`}
                        </li>
                        <li className="flex items-center gap-2 text-zinc-300">
                          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {plan.limits?.agents === -1 ? 'Agentes ilimitados' : `${plan.limits?.agents || 1} agente${plan.limits?.agents !== 1 ? 's' : ''}`}
                        </li>
                        {plan.features?.flows && (
                          <li className="flex items-center gap-2 text-zinc-300">
                            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Automatizaciones
                          </li>
                        )}
                        {plan.features?.advancedAI && (
                          <li className="flex items-center gap-2 text-zinc-300">
                            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            IA avanzada (GPT-4)
                          </li>
                        )}
                      </ul>
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={handlePlanContinue}
                    disabled={!selectedPlan}
                    className="px-8 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                  >
                    Continuar con plan {selectedPlan?._id || 'seleccionado'} →
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              ¿Qué tipo de negocio tienes?
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Selecciona una opción para pre-configurar las tablas recomendadas
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleSelectBusiness(business)}
                  className="group p-4 rounded-xl text-left transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: `2px solid ${selectedBusiness?.id === business.id ? business.color : "rgba(255, 255, 255, 0.08)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = BUSINESS_ICONS[business.id];
                      return (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${business.color}20`, color: business.color }}
                        >
                          {IconComponent && <IconComponent className="w-6 h-6" />}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white group-hover:text-white/90">
                        {business.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{business.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {showPlanStep && (
              <div className="flex justify-start pt-4">
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  ← Cambiar plan
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        // Selección de tablas
        const atLimit = selectedTables.length >= tableLimit;
        return (
          <div className="space-y-6">
            <div className="text-center">
              {(() => {
                const IconComponent = selectedBusiness?.id ? BUSINESS_ICONS[selectedBusiness.id] : LuClipboardList;
                return (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: `${selectedBusiness?.color || '#8b5cf6'}20`, color: selectedBusiness?.color || '#8b5cf6' }}
                  >
                    {IconComponent && <IconComponent className="w-8 h-8" />}
                  </div>
                );
              })()}
              <h2 className="text-2xl font-bold text-white mb-2">
                ¿Qué datos necesitas gestionar?
              </h2>
              <p className="text-zinc-400">
                Tu plan <span className="text-violet-400 font-medium">{selectedPlan?.name || 'Free'}</span> permite hasta <span className="text-white font-semibold">{tableLimit} tablas</span>
              </p>
            </div>

            {/* Indicador de límite */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: tableLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${i < selectedTables.length ? 'bg-violet-500' : 'bg-zinc-700'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-zinc-400">{selectedTables.length}/{tableLimit}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(TABLE_TEMPLATES).map(([key, template]) => {
                const isSelected = selectedTables.includes(key);
                const customLabel = selectedBusiness?.customLabels?.[key];
                const isDisabled = !isSelected && atLimit;
                return (
                  <button
                    key={key}
                    onClick={() => handleTableToggle(key)}
                    disabled={isDisabled}
                    className={`p-4 rounded-xl text-center transition-all duration-200 ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'} ${
                      isSelected ? 'ring-2 ring-violet-500' : ''
                    }`}
                    style={{
                      background: isSelected ? "rgba(139, 92, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: `2px solid ${isSelected ? '#8b5cf6' : "rgba(255, 255, 255, 0.08)"}`,
                    }}
                  >
                    {(() => {
                      const TableIcon = TABLE_ICONS[key];
                      return (
                        <div className="flex justify-center mb-2" style={{ color: isSelected ? '#8b5cf6' : '#a1a1aa' }}>
                          {TableIcon && <TableIcon className="w-8 h-8" />}
                        </div>
                      );
                    })()}
                    <p className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      {customLabel || template.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{template.headers.length} campos</p>
                    {isSelected && (
                      <div className="mt-2">
                        <svg className="w-5 h-5 mx-auto text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-center text-sm">
              {atLimit ? (
                <span className="text-amber-400">Has alcanzado el límite de tu plan. ¿Necesitas más? <button onClick={() => setStep(0)} className="underline hover:text-amber-300">Cambiar plan</button></span>
              ) : selectedTables.length === 0 ? (
                <span className="text-zinc-500">Selecciona al menos una tabla o continúa sin tablas</span>
              ) : (
                <span className="text-zinc-400">{selectedTables.length} tabla{selectedTables.length !== 1 ? 's' : ''} seleccionada{selectedTables.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 rounded-xl text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-all"
              >
                ← Atrás
              </button>
              <button
                onClick={handleTablesSubmit}
                className="flex-1 px-6 py-3 rounded-xl text-white font-medium transition-all bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              >
                Continuar →
              </button>
            </div>
          </div>
        );

      case 3:
        // Datos generales del negocio
        return (
          <div className="max-w-lg mx-auto">
            {/* Header con icono premium */}
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedBusiness?.color || '#6b7280'}40, ${selectedBusiness?.color || '#6b7280'}20)`,
                  border: `1px solid ${selectedBusiness?.color || '#6b7280'}30`
                }}
              >
                <LuStore className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Datos de tu negocio
              </h2>
              <p className="text-zinc-400 text-sm">
                Tu asistente usará esta información para responder a tus clientes
              </p>
            </div>

            <form onSubmit={handleBusinessInfoSubmit} className="space-y-5">
              {/* Nombre del negocio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-2">
                  <LuSparkles className="w-4 h-4 text-violet-400" />
                  Nombre del negocio
                  <span className="text-violet-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-400 transition-colors">
                    <LuBuilding2 className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Ej: Salón Belleza María"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:bg-zinc-900 transition-all"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-2">
                  <LuMapPin className="w-4 h-4 text-zinc-400" />
                  Dirección
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-400 transition-colors">
                    <LuMapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={businessInfo.direccion}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Ej: Calle Principal #123, Centro"
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:bg-zinc-900 transition-all"
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-2">
                  <LuPhone className="w-4 h-4 text-zinc-400" />
                  Teléfono de contacto
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-400 transition-colors">
                    <LuPhone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    value={businessInfo.telefono}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: +52 555 123 4567"
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:bg-zinc-900 transition-all"
                  />
                </div>
              </div>

              {/* Horarios de atención */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-3">
                  <LuClock className="w-4 h-4 text-zinc-400" />
                  Horarios de atención
                </label>
                <div className="space-y-1 p-4 bg-zinc-900/30 rounded-xl border border-zinc-700/30">
                  {/* Lunes a Viernes */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={businessInfo.horarios.lunesViernes.activo}
                        onChange={(e) => updateHorario('lunesViernes', 'activo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500 peer-checked:after:bg-white"></div>
                    </label>
                    <span className="text-zinc-200 w-20 text-sm font-medium shrink-0">Lun - Vie</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="time"
                        value={businessInfo.horarios.lunesViernes.abre}
                        onChange={(e) => updateHorario('lunesViernes', 'abre', e.target.value)}
                        disabled={!businessInfo.horarios.lunesViernes.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                      <span className="text-zinc-500 text-sm shrink-0">a</span>
                      <input
                        type="time"
                        value={businessInfo.horarios.lunesViernes.cierra}
                        onChange={(e) => updateHorario('lunesViernes', 'cierra', e.target.value)}
                        disabled={!businessInfo.horarios.lunesViernes.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Sábado */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={businessInfo.horarios.sabado.activo}
                        onChange={(e) => updateHorario('sabado', 'activo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500 peer-checked:after:bg-white"></div>
                    </label>
                    <span className="text-zinc-200 w-20 text-sm font-medium shrink-0">Sábado</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="time"
                        value={businessInfo.horarios.sabado.abre}
                        onChange={(e) => updateHorario('sabado', 'abre', e.target.value)}
                        disabled={!businessInfo.horarios.sabado.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                      <span className="text-zinc-500 text-sm shrink-0">a</span>
                      <input
                        type="time"
                        value={businessInfo.horarios.sabado.cierra}
                        onChange={(e) => updateHorario('sabado', 'cierra', e.target.value)}
                        disabled={!businessInfo.horarios.sabado.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Domingo */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={businessInfo.horarios.domingo.activo}
                        onChange={(e) => updateHorario('domingo', 'activo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500 peer-checked:after:bg-white"></div>
                    </label>
                    <span className="text-zinc-200 w-20 text-sm font-medium shrink-0">Domingo</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="time"
                        value={businessInfo.horarios.domingo.abre}
                        onChange={(e) => updateHorario('domingo', 'abre', e.target.value)}
                        disabled={!businessInfo.horarios.domingo.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                      <span className="text-zinc-500 text-sm shrink-0">a</span>
                      <input
                        type="time"
                        value={businessInfo.horarios.domingo.cierra}
                        onChange={(e) => updateHorario('domingo', 'cierra', e.target.value)}
                        disabled={!businessInfo.horarios.domingo.activo}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3.5 rounded-xl text-zinc-300 font-medium border border-zinc-700/50 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all"
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  disabled={!workspaceName.trim()}
                  className="flex-1 px-6 py-3.5 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/20"
                  style={{ 
                    background: `linear-gradient(135deg, ${selectedBusiness?.color || '#6b7280'}, ${selectedBusiness?.color || '#6b7280'}dd)` 
                  }}
                >
                  Continuar →
                </button>
              </div>
            </form>
          </div>
        );

      case 4:
        // Resumen
        const tablesToShow = getTablesFromTemplates(selectedTables, selectedBusiness?.customLabels);
        return (
          <div className="max-w-lg mx-auto">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
              style={{ background: `${selectedBusiness?.color || '#6b7280'}20` }}
            >
              {selectedBusiness?.icon || '✨'}
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Todo listo para crear
            </h2>
            <p className="text-zinc-400 text-center mb-8">
              Vamos a configurar tu asistente con lo siguiente:
            </p>

            {/* Resumen */}
            <div className="space-y-4 mb-8">
              {/* Workspace */}
              <div
                className="p-4 rounded-xl flex items-center gap-4"
                style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/20 text-violet-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Proyecto</p>
                  <p className="text-white font-medium">{workspaceName}</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Nuevo</span>
                </div>
              </div>

              {/* Tablas */}
              {tablesToShow.length > 0 && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Tablas de datos</p>
                      <p className="text-white font-medium">{tablesToShow.length} tabla{tablesToShow.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="pl-14 space-y-2">
                    {tablesToShow.map((table, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{table.icon}</span>
                        <span className="text-zinc-300">{table.name}</span>
                        <span className="text-zinc-500">({table.headers.length} campos)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datos del negocio */}
              {(businessInfo.direccion || businessInfo.telefono || Object.values(businessInfo.horarios).some(h => h.activo)) && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Datos del negocio</p>
                    </div>
                  </div>
                  <div className="pl-14 space-y-1 text-sm">
                    {businessInfo.direccion && (
                      <p className="text-zinc-300">📍 {businessInfo.direccion}</p>
                    )}
                    {businessInfo.telefono && (
                      <p className="text-zinc-300">📱 {businessInfo.telefono}</p>
                    )}
                    {businessInfo.horarios.lunesViernes.activo && (
                      <p className="text-zinc-400">🕐 L-V: {businessInfo.horarios.lunesViernes.abre} - {businessInfo.horarios.lunesViernes.cierra}</p>
                    )}
                    {businessInfo.horarios.sabado.activo && (
                      <p className="text-zinc-400">🕐 Sáb: {businessInfo.horarios.sabado.abre} - {businessInfo.horarios.sabado.cierra}</p>
                    )}
                    {businessInfo.horarios.domingo.activo && (
                      <p className="text-zinc-400">🕐 Dom: {businessInfo.horarios.domingo.abre} - {businessInfo.horarios.domingo.cierra}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Asistente */}
              {selectedBusiness?.agent && tablesToShow.length > 0 && (
                <div
                  className="p-4 rounded-xl flex items-center gap-4"
                  style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-500/20 text-pink-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Asistente IA</p>
                    <p className="text-white font-medium">{selectedBusiness.agent.name}</p>
                  </div>
                  <div>
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">GPT-4</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 px-6 py-3 rounded-xl text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-all"
              >
                ← Atrás
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-6 py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                style={{ background: selectedBusiness?.color || '#6b7280' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {tablesToShow.length > 0 ? 'Crear mi asistente' : 'Crear proyecto'}
              </button>
            </div>
          </div>
        );

      case 5:
        // Creando
        return (
          <div className="max-w-md mx-auto text-center">
            {error ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-500/20">
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Hubo un problema</h2>
                <p className="text-zinc-400 mb-6">{error}</p>
                <button
                  onClick={() => { setStep(4); setError(null); }}
                  className="px-6 py-3 rounded-xl text-white font-medium bg-zinc-700 hover:bg-zinc-600 transition-all"
                >
                  Intentar de nuevo
                </button>
              </>
            ) : (
              <>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: `${selectedBusiness?.color || '#6b7280'}20` }}
                >
                  {progress < 100 ? (
                    <svg className="w-10 h-10 animate-spin" style={{ color: selectedBusiness?.color || '#6b7280' }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10" style={{ color: selectedBusiness?.color || '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                  {progress < 100 ? "Configurando tu proyecto..." : "¡Todo listo!"}
                </h2>
                <p className="text-zinc-400 mb-6">
                  {progress < 30 && "Creando tu proyecto..."}
                  {progress >= 30 && progress < 70 && "Configurando tablas de datos..."}
                  {progress >= 70 && progress < 100 && "Finalizando configuración..."}
                  {progress >= 100 && "Tu proyecto está listo para usarse"}
                </p>

                {/* Progress bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: selectedBusiness?.color || '#6b7280' }}
                  />
                </div>
                <p className="text-sm text-zinc-500">{progress}% completado</p>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" 
      style={{ 
        background: "linear-gradient(180deg, rgba(0, 0, 0, 0.97) 0%, rgba(10, 10, 20, 0.98) 100%)",
        backdropFilter: "blur(8px)"
      }}
    >
      {/* Decorative gradient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-3xl relative z-10 animate-fade-up">
        {/* Stepper profesional */}
        {step < 5 && (
          <div className="mb-10">
            {/* Progress bar de fondo */}
            <div className="relative mb-4">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-800/50 rounded-full" />
              <div 
                className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 rounded-full shadow-lg shadow-violet-500/30"
                style={{ width: `${(step / 4) * 100}%` }}
              />
              
              {/* Steps */}
              <div className="relative flex justify-between">
                {STEPS.filter(s => s.id < 5).map((s) => (
                  <div key={s.id} className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 relative z-10 ${
                        step > s.id
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40"
                          : step === s.id
                          ? "bg-violet-500 text-white ring-4 ring-violet-500/30 shadow-lg shadow-violet-500/50 scale-110"
                          : "bg-zinc-800/80 text-zinc-500 border border-zinc-700/50"
                      }`}
                    >
                      {step > s.id ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        s.id + 1
                      )}
                    </div>
                    <span className={`mt-2.5 text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                      step >= s.id ? "text-white" : "text-zinc-600"
                    }`}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skip button - Diseño Premium */}
            <div className="flex justify-end">
              <button
                onClick={onSkip}
                className="group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-zinc-400 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 transition-all duration-300 backdrop-blur-sm"
              >
                <svg 
                  className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Omitir tour
              </button>
            </div>
          </div>
        )}

        {/* Contenido del paso */}
        <div className="min-h-[400px] flex items-center justify-center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
