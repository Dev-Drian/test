import { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FaceSmileIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import HelpCollapse from '../common/HelpCollapse';

/**
 * ConversationAnalytics - Dashboard de analítica de conversaciones
 */
export default function ConversationAnalytics({ workspaceId }) {
  const [stats, setStats] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  
  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - parseInt(dateRange));
      
      const [statsRes, realtimeRes] = await Promise.all([
        api.get(`/analytics/${workspaceId}/conversations`, {
          params: { from: from.toISOString() }
        }),
        api.get(`/analytics/${workspaceId}/realtime`)
      ]);
      
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (realtimeRes.data.success) {
        setRealtime(realtimeRes.data.metrics);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, dateRange]);
  
  useEffect(() => {
    loadStats();
    // Cargar último análisis guardado
    (async () => {
      try {
        const latest = await api.get(`/analytics/${workspaceId}/conversations/ai/latest`);
        if (latest.data?.success && latest.data.analysis) {
          setAiAnalysis(latest.data.analysis);
        }
      } catch (e) {
        // silencioso
      }
    })();
    
    // Actualizar realtime cada 30 segundos
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/analytics/${workspaceId}/realtime`);
        if (res.data.success) {
          setRealtime(res.data.metrics);
        }
      } catch {}
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadStats, workspaceId]);
  
  // Análisis con IA
  const analyzeWithAI = async () => {
    setAiLoading(true);
    try {
      const response = await api.get(`/analytics/${workspaceId}/conversations/ai`);
      if (response.data) {
        // Guardamos siempre el payload de analysis para poder mostrar mensajes de estado
        setAiAnalysis(response.data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing with AI:', err);
    } finally {
      setAiLoading(false);
    }
  };
  
  // Formatear número
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };
  
  // Obtener color de sentimiento
  const getSentimentColor = (score) => {
    if (score >= 7) return 'text-green-400 bg-green-900/30';
    if (score >= 4) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-red-400 bg-red-900/30';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analytics de Conversaciones</h2>
            <p className="text-sm text-zinc-400">
              Métricas y análisis de rendimiento con IA
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-violet-500"
          >
            <option value="1d">Últimas 24h</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          
          <button
            onClick={analyzeWithAI}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <SparklesIcon className="w-5 h-5" />
            )}
            Análisis IA
          </button>
        </div>
      </div>
      
      {/* Tip colapsable */}
      <details className="group bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <summary className="flex items-center gap-3 p-4 cursor-pointer text-sm">
          <SparklesIcon className="w-5 h-5 text-violet-400" />
          <span className="text-zinc-300 font-medium">¿Qué es Analytics? (clic para ver)</span>
          <span className="ml-auto text-zinc-500 text-xs group-open:hidden">Mostrar</span>
          <span className="ml-auto text-zinc-500 text-xs hidden group-open:inline">Ocultar</span>
        </summary>
        <div className="px-4 pb-4 pt-0 border-t border-zinc-700/50 text-sm text-zinc-400">
          Aquí ves métricas clave de tus conversaciones: volumen, horarios pico, sentimiento y un análisis con IA. Úsalo para detectar oportunidades y mejorar tus flujos.
        </div>
      </details>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : (
        <>
          {/* Qué es... */}
          <HelpCollapse title="¿Qué son las Estadísticas?" icon={ChartBarIcon}>
            <p>
              Aquí ves métricas clave de tus conversaciones: actividad en tiempo real, volumen, preguntas frecuentes,
              horas pico y tasa de resolución. Úsalo para identificar momentos de mayor demanda y oportunidades de mejora.
            </p>
          </HelpCollapse>
          
          {/* Real-time Stats */}
          {realtime && (
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-sm font-medium text-violet-200 mb-3">En tiempo real</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-bold">{realtime.activeChats || 0}</div>
                  <div className="text-violet-200 text-sm">Chats activos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{realtime.messagesLastHour || 0}</div>
                  <div className="text-violet-200 text-sm">Mensajes (última hora)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{realtime.avgResponseTime || 0}s</div>
                  <div className="text-violet-200 text-sm">Tiempo respuesta</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{realtime.resolvedToday || 0}</div>
                  <div className="text-violet-200 text-sm">Resueltos hoy</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={ChatBubbleLeftRightIcon}
                label="Conversaciones"
                value={formatNumber(stats.totalConversations)}
                trend={null}
                color="blue"
              />
              <StatCard
                icon={UserGroupIcon}
                label="Mensajes por chat"
                value={stats.avgMessagesPerChat?.toFixed(1) || '0'}
                trend={null}
                color="green"
              />
              <StatCard
                icon={ClockIcon}
                label="Duración promedio"
                value={`${stats.avgDuration || 0}m`}
                trend={null}
                color="purple"
              />
              <StatCard
                icon={FaceSmileIcon}
                label="Sentimiento"
                value={`${stats.sentimentScore || 0}/10`}
                trend={null}
                color="amber"
                customColor={getSentimentColor(stats.sentimentScore)}
              />
            </div>
          )}
          
          {/* Detailed Stats */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Intents */}
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-6">
                <h3 className="font-semibold text-white mb-4">Intenciones frecuentes</h3>
                {stats.topIntents?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topIntents.slice(0, 5).map((intent, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-zinc-300">
                              {intent.intent || 'Sin clasificar'}
                            </span>
                            <span className="text-sm text-zinc-500">{intent.count}</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div
                              className="bg-violet-500 h-2 rounded-full"
                              style={{ width: `${(intent.count / stats.topIntents[0]?.count) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-4">Sin datos</p>
                )}
              </div>
              
              {/* Peak Hours */}
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-6">
                <h3 className="font-semibold text-white mb-4">Horas pico</h3>
                {stats.peakHours?.length > 0 ? (
                  <div className="flex items-end justify-between h-32 gap-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const data = stats.peakHours.find(h => h.hour === hour);
                      const count = data?.count || 0;
                      const maxCount = Math.max(...stats.peakHours.map(h => h.count));
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      
                      return (
                        <div
                          key={hour}
                          className="flex-1 group relative"
                          title={`${hour}:00 - ${count} mensajes`}
                        >
                          <div
                            className="bg-violet-500 hover:bg-violet-400 rounded-t transition-all"
                            style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                          />
                          {hour % 6 === 0 && (
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
                              {hour}h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-4">Sin datos</p>
                )}
              </div>
              
              {/* Top Questions */}
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-6">
                <h3 className="font-semibold text-white mb-4">Preguntas frecuentes</h3>
                {stats.topQuestions?.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topQuestions.slice(0, 5).map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg"
                      >
                        <span className="text-violet-400 font-bold">{idx + 1}</span>
                        <span className="text-sm text-zinc-300 flex-1 truncate">
                          {q.question}
                        </span>
                        <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded">
                          {q.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-4">Sin datos</p>
                )}
              </div>
              
              {/* Resolution Rate */}
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-6">
                <h3 className="font-semibold text-white mb-4">Tasa de resolución</h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#3f3f46"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#22c55e"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(stats.resolved || 0) * 3.52} 352`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {stats.resolved || 0}%
                      </span>
                      <span className="text-xs text-zinc-500">resueltos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="bg-violet-900/30 border border-violet-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold text-white">Análisis con IA</h3>
              </div>
              {/* Mensaje de estado cuando no hay datos o hay error */}
              {aiAnalysis?.success === false && (
                <div className="mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-700 text-sm text-zinc-300">
                  {aiAnalysis.message || aiAnalysis.error || 'No fue posible generar el análisis.'}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Topics */}
                {aiAnalysis.mainTopics?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Temas principales</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.mainTopics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-violet-900/50 text-violet-300 rounded-full text-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Common Problems */}
                {aiAnalysis.commonProblems?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Problemas comunes</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.commonProblems.slice(0, 3).map((problem, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                          <ExclamationCircleIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {problem}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Missed Opportunities */}
                {aiAnalysis.missedOpportunities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Oportunidades perdidas</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.missedOpportunities.slice(0, 3).map((opp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Recommendations */}
                {aiAnalysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Recomendaciones</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                          <SparklesIcon className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Sentiment Analysis */}
              {aiAnalysis.sentimentAnalysis && (
                <div className="mt-4 pt-4 border-t border-violet-700">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Análisis de sentimiento</h4>
                  <p className="text-sm text-zinc-400">{aiAnalysis.sentimentAnalysis}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Componente StatCard
function StatCard({ icon: Icon, label, value, trend, color, customColor }) {
  const colors = {
    blue: 'bg-blue-900/30 text-blue-400',
    green: 'bg-green-900/30 text-green-400',
    purple: 'bg-violet-900/30 text-violet-400',
    amber: 'bg-amber-900/30 text-amber-400'
  };
  
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${customColor || colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend !== null && (
          <span className={`text-sm flex items-center gap-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
