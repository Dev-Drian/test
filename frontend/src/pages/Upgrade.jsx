/**
 * Upgrade.jsx
 * Página para mejorar el plan de suscripción
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Crown, Check, Zap, Shield, Rocket, ArrowLeft, 
  Sparkles, Users, Database, Bot, Workflow, Globe,
  Star, ChevronRight, CreditCard, Lock, CheckCircle,
  AlertCircle, Loader2, X, Wallet
} from 'lucide-react';
import { useToast } from "../components/Toast";
import api from '../api/client';

// Iconos de proveedores de pago
const ProviderIcons = {
  wompi: () => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect width="40" height="40" rx="8" fill="#00C389"/>
      <path d="M10 20L15 15L20 20L15 25L10 20Z" fill="white"/>
      <path d="M20 20L25 15L30 20L25 25L20 20Z" fill="white" fillOpacity="0.7"/>
    </svg>
  ),
  mercadopago: () => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <rect width="40" height="40" rx="8" fill="#009EE3"/>
      <circle cx="20" cy="20" r="10" fill="white"/>
      <path d="M15 20C15 17.24 17.24 15 20 15C22.76 15 25 17.24 25 20" stroke="#009EE3" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="22" r="3" fill="#009EE3"/>
    </svg>
  ),
};

// Planes disponibles
const PLANS = [
  {
    id: 'free',
    name: 'Gratuito',
    description: 'Para explorar la plataforma',
    price: 0,
    priceLabel: '$0',
    period: 'para siempre',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    shadowColor: 'rgba(100, 116, 139, 0.3)',
    features: [
      { text: '1 proyecto', included: true },
      { text: '3 tablas por proyecto', included: true },
      { text: '100 registros por tabla', included: true },
      { text: '1 asistente IA', included: true },
      { text: 'GPT-4o Mini', included: true },
      { text: 'Exportar datos', included: false },
      { text: 'Automatizaciones', included: false },
      { text: 'Acceso API', included: false },
    ],
    limits: { workspaces: 1, tables: 3, records: 100, agents: 1 }
  },
  {
    id: 'starter',
    name: 'Inicial',
    description: 'Para negocios pequeños',
    price: 39000,
    priceLabel: '$1.000',
    period: 'COP/mes',
    icon: Rocket,
    color: 'from-blue-500 to-cyan-500',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    features: [
      { text: '3 proyectos', included: true },
      { text: '10 tablas por proyecto', included: true },
      { text: '1.000 registros por tabla', included: true },
      { text: '2 asistentes IA', included: true },
      { text: 'GPT-4o + Mini', included: true },
      { text: 'Exportar datos', included: true },
      { text: '5 automatizaciones', included: true },
      { text: 'Acceso API', included: false },
    ],
    limits: { workspaces: 3, tables: 10, records: 1000, agents: 2 }
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para negocios en crecimiento',
    price: 119000,
    priceLabel: '$119.000',
    period: 'COP/mes',
    icon: Crown,
    color: 'from-violet-500 to-purple-500',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
    popular: true,
    features: [
      { text: '10 proyectos', included: true },
      { text: '50 tablas por proyecto', included: true },
      { text: '10.000 registros por tabla', included: true },
      { text: '5 asistentes IA', included: true },
      { text: 'Todos los modelos IA', included: true },
      { text: 'Exportar datos', included: true },
      { text: '20 automatizaciones', included: true },
      { text: 'Acceso API completo', included: true },
    ],
    limits: { workspaces: 10, tables: 50, records: 10000, agents: 5 }
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    description: 'Sin límites para grandes equipos',
    price: 399000,
    priceLabel: '$399.000',
    period: 'COP/mes',
    icon: Shield,
    color: 'from-amber-500 to-orange-500',
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    features: [
      { text: 'Proyectos ilimitados', included: true },
      { text: 'Tablas ilimitadas', included: true },
      { text: 'Registros ilimitados', included: true },
      { text: 'Asistentes ilimitados', included: true },
      { text: 'GPT-4 Turbo + Claude Opus', included: true },
      { text: 'White label', included: true },
      { text: 'Dominio personalizado', included: true },
      { text: 'Soporte dedicado', included: true },
    ],
    limits: { workspaces: -1, tables: -1, records: -1, agents: -1 }
  }
];

function PlanCard({ plan, currentPlan, onSelect, loading }) {
  const isCurrent = currentPlan === plan.id;
  const isDowngrade = PLANS.findIndex(p => p.id === currentPlan) > PLANS.findIndex(p => p.id === plan.id);
  const Icon = plan.icon;

  return (
    <div 
      className={`relative flex flex-col rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
        plan.popular 
          ? 'border-violet-500/50 bg-gradient-to-b from-violet-600/10 to-transparent shadow-xl' 
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      } ${isCurrent ? 'ring-2 ring-emerald-500/50' : ''}`}
      style={{ 
        boxShadow: plan.popular ? `0 20px 60px ${plan.shadowColor}` : undefined 
      }}
    >
      {/* Badge de popular */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg whitespace-nowrap flex items-center gap-1">
          <Star className="w-3 h-3" /> Más popular
        </div>
      )}

      {/* Badge de plan actual */}
      {isCurrent && (
        <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-lg flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Tu plan
        </div>
      )}

      <div className="p-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.color}`}
            style={{ boxShadow: `0 8px 20px ${plan.shadowColor}` }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="text-xs text-slate-500">{plan.description}</p>
          </div>
        </div>

        {/* Precio */}
        <div className="mb-6 pb-6 border-b border-white/10">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">{plan.priceLabel}</span>
            <span className="text-slate-500 text-sm">/{plan.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {feature.included ? (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br ${plan.color}`}>
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-700/50">
                  <span className="w-2 h-0.5 bg-slate-500 rounded-full" />
                </div>
              )}
              <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="px-6 pb-6">
        <button
          onClick={() => onSelect(plan)}
          disabled={isCurrent || loading}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            isCurrent
              ? 'bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/30'
              : isDowngrade
                ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                : plan.popular
                  ? `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 shadow-lg`
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
          }`}
          style={!isCurrent && !isDowngrade && plan.popular ? { boxShadow: `0 10px 30px ${plan.shadowColor}` } : {}}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCurrent ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Plan actual
            </>
          ) : isDowngrade ? (
            'Contactar soporte'
          ) : plan.price === 0 ? (
            'Continuar gratis'
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Suscribirse
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Upgrade() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [autoStartPlan, setAutoStartPlan] = useState(null);
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);

  const currentPlan = user?.plan || 'free';

  // Cargar proveedores de pago disponibles
  useEffect(() => {
    api.get('/plans/providers')
      .then(res => setProviders(res.data?.providers || []))
      .catch(() => setProviders([]));
  }, []);

  const initiatePayment = useCallback(async (plan, provider) => {
    setLoading(true);
    setSelectedPlan(plan.id);
    setShowProviderModal(false);

    try {
      const response = await api.post('/plans/subscribe', {
        planId: plan.id,
        provider: provider,
        successUrl: `${window.location.origin}/upgrade?success=true&plan=${plan.id}`,
        cancelUrl: `${window.location.origin}/upgrade?cancelled=true`
      });

      if (response.data?.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else {
        throw new Error('No se generó el link de pago');
      }
    } catch (error) {
      console.error('Error al iniciar suscripción:', error);
      toast.error(error.response?.data?.error || 'Error al procesar la suscripción');
      setLoading(false);
      setSelectedPlan(null);
    }
  }, [toast]);

  const handleSelectPlan = useCallback(async (plan) => {
    if (plan.id === currentPlan) return;
    
    if (plan.price === 0) {
      toast.info('El plan gratuito no requiere cambios');
      return;
    }

    // Si hay más de un proveedor, mostrar modal de selección
    if (providers.length > 1) {
      setPendingPlan(plan);
      setShowProviderModal(true);
    } else if (providers.length === 1) {
      // Si hay solo un proveedor, usar ese directamente
      initiatePayment(plan, providers[0].id);
    } else {
      // No hay proveedores configurados
      toast.error('No hay métodos de pago disponibles. Contacta al administrador.');
    }
  }, [currentPlan, toast, providers, initiatePayment]);

  // Verificar si viene de un pago exitoso o con plan preseleccionado
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const planId = params.get('plan');
    const cancelled = params.get('cancelled');
    const selected = params.get('selected');

    if (success === 'true' && planId) {
      toast.success(`¡Plan ${planId} activado! Tu suscripción está siendo procesada.`);
      refreshUser?.();
      window.history.replaceState({}, '', '/upgrade');
    } else if (cancelled === 'true') {
      toast.info('Pago cancelado. Puedes intentarlo de nuevo cuando quieras.');
      window.history.replaceState({}, '', '/upgrade');
    } else if (selected && selected !== currentPlan && selected !== 'free') {
      setAutoStartPlan(selected);
      window.history.replaceState({}, '', '/upgrade');
    }
  }, [refreshUser, toast, currentPlan]);

  // Auto-iniciar pago si viene con plan preseleccionado
  useEffect(() => {
    if (autoStartPlan && !loading && providers.length > 0) {
      const plan = PLANS.find(p => p.id === autoStartPlan);
      if (plan && plan.price > 0 && plan.id !== currentPlan) {
        setAutoStartPlan(null);
        // Si hay múltiples proveedores, mostrar modal
        if (providers.length > 1) {
          setPendingPlan(plan);
          setShowProviderModal(true);
        } else {
          initiatePayment(plan, providers[0].id);
        }
      }
    }
  }, [autoStartPlan, loading, currentPlan, providers, initiatePayment]);

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Modal de selección de proveedor de pago */}
      {showProviderModal && pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => { setShowProviderModal(false); setPendingPlan(null); }}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Selecciona método de pago</h3>
              <p className="text-slate-400 text-sm">
                Plan <span className="text-white font-medium">{pendingPlan.name}</span> - {pendingPlan.priceLabel}/{pendingPlan.period}
              </p>
            </div>

            {/* Provider options */}
            <div className="space-y-3">
              {providers.map(provider => {
                const IconComponent = ProviderIcons[provider.icon] || ProviderIcons.wompi;
                return (
                  <button
                    key={provider.id}
                    onClick={() => initiatePayment(pendingPlan, provider.id)}
                    disabled={loading}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <IconComponent />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {provider.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {provider.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                  </button>
                );
              })}
            </div>

            {/* Security note */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>Pago 100% seguro y encriptado</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-violet-300 text-sm font-medium">Planes y precios</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Elige el plan perfecto para tu negocio
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Escala tu operación con las herramientas que necesitas. Todos los planes incluyen
            actualizaciones automáticas y soporte técnico.
          </p>
        </div>
      </div>

      {/* Plan actual info */}
      {currentPlan && currentPlan !== 'free' && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300">
              Actualmente tienes el plan <strong className="text-emerald-400">{PLANS.find(p => p.id === currentPlan)?.name}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Grid de planes */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            loading={loading && selectedPlan === plan.id}
          />
        ))}
      </div>

      {/* FAQ / Info adicional */}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-400" />
            Pago 100% seguro
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">Pagos procesados por Wompi</p>
                <p>Plataforma certificada de Bancolombia con los más altos estándares de seguridad.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">Múltiples métodos de pago</p>
                <p>Tarjeta de crédito, débito, PSE, Nequi, Daviplata y más.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">Activación instantánea</p>
                <p>Tu plan se activa automáticamente al confirmar el pago.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">Soporte incluido</p>
                <p>Asistencia técnica para ayudarte en todo momento.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
