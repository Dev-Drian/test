import { useState, useCallback, useEffect } from 'react';
import { 
  BeakerIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const SEVERITY_CONFIG = {
  error: {
    icon: ExclamationTriangleIcon,
    color: 'red',
    bg: 'bg-red-900/30',
    border: 'border-red-700',
    text: 'text-red-400',
    label: 'Error'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'amber',
    bg: 'bg-amber-900/30',
    border: 'border-amber-700',
    text: 'text-amber-400',
    label: 'Advertencia'
  },
  info: {
    icon: InformationCircleIcon,
    color: 'blue',
    bg: 'bg-blue-900/30',
    border: 'border-blue-700',
    text: 'text-blue-400',
    label: 'Info'
  },
  tip: {
    icon: LightBulbIcon,
    color: 'green',
    bg: 'bg-green-900/30',
    border: 'border-green-700',
    text: 'text-green-400',
    label: 'Tip'
  }
};

const GRADE_COLORS = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500'
};

/**
 * FlowDoctor - Analizador y linter de flujos
 */
export default function FlowDoctor({ workspaceId, flow: externalFlow, onApplyFix }) {
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [flow, setFlow] = useState(externalFlow || null);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [businessContext, setBusinessContext] = useState('');
  
  // Cargar lista de flujos del workspace
  useEffect(() => {
    if (!workspaceId || externalFlow) return;
    
    const loadFlows = async () => {
      setLoadingFlows(true);
      try {
        const res = await api.get(`/flow/list?workspaceId=${workspaceId}`);
        setFlows(res.data || []);
      } catch (err) {
        console.error('Error loading flows:', err);
      } finally {
        setLoadingFlows(false);
      }
    };
    loadFlows();
  }, [workspaceId, externalFlow]);
  
  // Cargar flujo seleccionado
  useEffect(() => {
    if (!selectedFlowId || !workspaceId || externalFlow) return;
    
    const loadFlow = async () => {
      try {
        const res = await api.get(`/flow/get?workspaceId=${workspaceId}&flowId=${selectedFlowId}`);
        setFlow(res.data);
        setAnalysis(null);
        setAiAnalysis(null);
      } catch (err) {
        console.error('Error loading flow:', err);
      }
    };
    loadFlow();
  }, [selectedFlowId, workspaceId, externalFlow]);
  
  // Analizar flujo básico
  const analyzeFlow = useCallback(async () => {
    if (!flow) return;
    
    setAnalyzing(true);
    try {
      const response = await api.post('/flow-doctor/analyze', { flow });
      if (response.data.success) {
        setAnalysis(response.data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing flow:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [flow]);
  
  // Analizar con IA
  const analyzeWithAI = useCallback(async () => {
    if (!flow) return;
    
    setAiAnalyzing(true);
    try {
      const response = await api.post('/flow-doctor/analyze-ai', { 
        flow,
        businessContext: businessContext || undefined
      });
      if (response.data.success) {
        setAiAnalysis(response.data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing with AI:', err);
    } finally {
      setAiAnalyzing(false);
    }
  }, [flow, businessContext]);
  
  // Auto-fix
  const applyAutoFix = async () => {
    try {
      const response = await api.post('/flow-doctor/auto-fix', { flow });
      if (response.data.success && response.data.fixed) {
        onApplyFix?.(response.data.fixed.fixedFlow);
        // Re-analizar
        setAnalysis(null);
        await analyzeFlow();
      }
    } catch (err) {
      console.error('Error applying auto-fix:', err);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Explicación educativa */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <WrenchScrewdriverIcon className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2">¿Qué hace Flow Doctor?</h3>
            <p className="text-sm text-zinc-300 mb-3">
              Es como un <span className="text-violet-400 font-medium">"médico"</span> para tus bots. Revisa tus flujos buscando problemas y te da sugerencias para mejorarlos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 bg-zinc-800/50 rounded-lg p-3">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-white block mb-1">Detecta errores</span>
                  <span className="text-zinc-400">Nodos desconectados, configuraciones faltantes, bucles infinitos.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-zinc-800/50 rounded-lg p-3">
                <LightBulbIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-white block mb-1">Sugiere mejoras</span>
                  <span className="text-zinc-400">Tips para hacer tu bot más efectivo y profesional.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-zinc-800/50 rounded-lg p-3">
                <SparklesIcon className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-white block mb-1">Análisis con IA</span>
                  <span className="text-zinc-400">La IA revisa tu flujo y da recomendaciones personalizadas.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <BeakerIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Flow Doctor</h2>
            <p className="text-violet-100 text-sm">
              Selecciona un flujo y analízalo
            </p>
          </div>
          
          {analysis && (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className={`w-12 h-12 ${GRADE_COLORS[analysis.grade]} rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                  {analysis.grade}
                </div>
                <span className="text-xs text-violet-100">Calificación</span>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.score}</div>
                <span className="text-xs text-violet-100">Puntaje</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {/* Flow Selector - siempre visible si no hay flujo externo */}
        {!externalFlow && flows.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Flujo a analizar
            </label>
            <div className="relative">
              <select
                value={selectedFlowId}
                onChange={(e) => setSelectedFlowId(e.target.value)}
                disabled={loadingFlows}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {loadingFlows ? 'Cargando flujos...' : '-- Selecciona un flujo --'}
                </option>
                {flows.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name || 'Flujo sin nombre'}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="w-5 h-5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={analyzeFlow}
            disabled={analyzing || !flow}
            className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <BeakerIcon className="w-5 h-5" />
                Analizar Flujo
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowAiInsights(true)}
            disabled={!flow}
            className="py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <SparklesIcon className="w-5 h-5" />
            Análisis IA
          </button>
          
          {analysis && analysis.issues?.some(i => i.autoFixable) && (
            <button
              onClick={applyAutoFix}
              className="py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <WrenchScrewdriverIcon className="w-5 h-5" />
              Auto-Fix
            </button>
          )}
        </div>
        
        {/* No Flow Selected */}
        {!flow && (
          <div className="text-center py-8 text-zinc-400">
            <BeakerIcon className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
            <p>Selecciona un flujo para analizar</p>
            {flows.length === 0 && !loadingFlows && !externalFlow && (
              <p className="text-sm text-zinc-500 mt-2">
                No tienes flujos creados. Crea uno primero en la sección de Automatizar.
              </p>
            )}
          </div>
        )}
        
        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {analysis.issues?.filter(i => i.severity === 'error').length || 0}
                </div>
                <span className="text-xs text-red-400">Errores</span>
              </div>
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {analysis.issues?.filter(i => i.severity === 'warning').length || 0}
                </div>
                <span className="text-xs text-amber-400">Advertencias</span>
              </div>
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {analysis.issues?.filter(i => i.severity === 'info').length || 0}
                </div>
                <span className="text-xs text-blue-400">Info</span>
              </div>
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {analysis.issues?.filter(i => i.severity === 'tip').length || 0}
                </div>
                <span className="text-xs text-green-400">Tips</span>
              </div>
            </div>
            
            {/* Issues List */}
            {analysis.issues?.length === 0 ? (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                <div>
                  <p className="font-medium text-green-400">¡Flujo perfecto!</p>
                  <p className="text-sm text-green-500">No se encontraron problemas.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-medium text-white">Problemas encontrados:</h3>
                
                {analysis.issues.map((issue, idx) => {
                  const config = SEVERITY_CONFIG[issue.severity];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={idx}
                      className={`${config.bg} ${config.border} border rounded-lg p-4`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${config.text} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${config.text}`}>
                              {config.label}
                            </span>
                            {issue.autoFixable && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Auto-fix disponible
                              </span>
                            )}
                          </div>
                          <p className={`${config.text} mt-1`}>
                            {issue.message}
                          </p>
                          {issue.nodeId && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Nodo: {issue.nodeId}
                            </p>
                          )}
                          {issue.suggestion && (
                            <p className="text-sm text-zinc-400 mt-2 italic">
                              {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* AI Analysis Results */}
        {aiAnalysis && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-violet-400" />
              <h3 className="font-medium text-white">Análisis con IA</h3>
            </div>
            
            {aiAnalysis.summary && (
              <div className="bg-violet-900/30 border border-violet-700 rounded-lg p-4 mb-4">
                <p className="text-violet-300">{aiAnalysis.summary}</p>
              </div>
            )}
            
            {aiAnalysis.improvements?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-zinc-300">Mejoras sugeridas:</h4>
                {aiAnalysis.improvements.map((imp, idx) => (
                  <div key={idx} className="bg-zinc-800 rounded-lg p-3 text-sm">
                    <div className="font-medium text-white">{imp.title}</div>
                    <p className="text-zinc-400 mt-1">{imp.description}</p>
                    {imp.implementation && (
                      <div className="mt-2 bg-zinc-900 rounded p-2 border border-zinc-700">
                        <code className="text-xs text-zinc-300">{imp.implementation}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {aiAnalysis.bestPractices?.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-zinc-300">Buenas prácticas:</h4>
                <ul className="space-y-1">
                  {aiAnalysis.bestPractices.map((practice, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {practice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* AI Analysis Modal */}
      {showAiInsights && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md">
            <div className="p-6 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Análisis con IA
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Obtén insights avanzados sobre tu flujo
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Contexto del negocio (opcional)
                </label>
                <textarea
                  value={businessContext}
                  onChange={(e) => setBusinessContext(e.target.value)}
                  placeholder="Ej: Somos una clínica dental que atiende citas..."
                  className="w-full h-24 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Proporcionar contexto ayuda a la IA a dar mejores sugerencias
                </p>
              </div>
              
              <button
                onClick={() => {
                  analyzeWithAI();
                  setShowAiInsights(false);
                }}
                disabled={aiAnalyzing}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiAnalyzing ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Analizar con IA
                  </>
                )}
              </button>
            </div>
            
            <div className="p-6 border-t border-zinc-700 flex justify-end">
              <button
                onClick={() => setShowAiInsights(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
