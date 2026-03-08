import { useState, useCallback } from 'react';
import { SparklesIcon, LightBulbIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

/**
 * AIFlowBuilder - Generador de flujos con IA
 * 
 * Permite crear flujos completos desde una descripción en lenguaje natural.
 */
export default function AIFlowBuilder({ workspaceId, onFlowGenerated }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  
  // Ejemplos de prompts
  const examplePrompts = [
    'Un bot de soporte que responde preguntas frecuentes y escala a un humano si no puede resolver',
    'Flujo para agendar citas: pregunta fecha, hora y confirma la reserva',
    'Bot de ventas que califica leads, muestra productos y genera cotizaciones',
    'Encuesta de satisfacción con opciones múltiples y respuestas abiertas',
    'Recordatorio de pagos pendientes con opción de pagar o pedir extensión'
  ];
  
  const generateFlow = useCallback(async () => {
    if (!description.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post(`/ai-flow/${workspaceId}/generate`, {
        description
      });
      
      if (response.data.success) {
        setGeneratedFlow(response.data.flow);
        onFlowGenerated?.(response.data.flow);
      } else {
        setError('No se pudo generar el flujo');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar flujo');
    } finally {
      setLoading(false);
    }
  }, [description, workspaceId, onFlowGenerated]);
  
  const getSuggestions = useCallback(async () => {
    if (!generatedFlow) return;
    
    try {
      const response = await api.post('/ai-flow/suggest-improvements', {
        flow: generatedFlow
      });
      
      if (response.data.success) {
        setSuggestions(response.data.suggestions.improvements || []);
      }
    } catch (err) {
      console.error('Error getting suggestions:', err);
    }
  }, [generatedFlow]);
  
  return (
    <div className="space-y-6">
      {/* Explicación educativa */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2">¿Cómo funciona?</h3>
            <p className="text-sm text-zinc-300 mb-3">
              Es como tener un <span className="text-purple-400 font-medium">asistente experto</span> que crea bots por ti. 
              Solo describe en palabras lo que quieres y la IA diseña el flujo completo automáticamente.
            </p>
            <div className="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3">
              <span className="font-medium text-white">Tip:</span> Entre más detalles des en tu descripción, mejor será el resultado. 
              Menciona qué preguntas hacer, qué datos guardar, y cómo debe responder el bot.
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-900/50 rounded-xl shadow-lg border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Crear con IA</h2>
            <p className="text-purple-100 text-sm">
              Describe tu flujo en palabras y la IA lo diseña por ti
            </p>
          </div>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            ¿Qué quieres que haga tu bot?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Un bot que reciba leads de Facebook, les pregunte qué producto les interesa, muestre opciones con precios, y guarde los datos del cliente para contactarlo después..."
            className="w-full h-32 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        </div>
        
        {/* Example Prompts */}
        <div className="mb-6">
          <p className="text-xs text-zinc-400 mb-2">Ideas para inspirarte (haz clic para usar):</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setDescription(prompt)}
                className="text-xs px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-violet-600/30 hover:text-violet-300 rounded-full transition-colors truncate max-w-[250px]"
                title={prompt}
              >
                {prompt.substring(0, 40)}...
              </button>
            ))}
          </div>
        </div>
        
        {/* Generate Button */}
        <button
          onClick={generateFlow}
          disabled={loading || !description.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Generando flujo...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              Generar Flujo con IA
            </>
          )}
        </button>
        
        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Generated Flow Preview */}
        {generatedFlow && (
          <div className="mt-6 p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 mb-3">
              <CheckIcon className="w-5 h-5" />
              <span className="font-medium">Flujo generado exitosamente</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Nodos:</span>
                <span className="font-medium text-white">{generatedFlow.nodes?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Conexiones:</span>
                <span className="font-medium text-white">{generatedFlow.edges?.length || 0}</span>
              </div>
            </div>
            
            {/* Node List Preview */}
            <div className="mt-3 pt-3 border-t border-green-700">
              <p className="text-xs text-zinc-400 mb-2">Nodos generados:</p>
              <div className="flex flex-wrap gap-1">
                {generatedFlow.nodes?.slice(0, 6).map((node, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-zinc-800 text-white rounded border border-green-700"
                  >
                    {node.data?.label || node.type}
                  </span>
                ))}
                {generatedFlow.nodes?.length > 6 && (
                  <span className="text-xs px-2 py-1 text-zinc-400">
                    +{generatedFlow.nodes.length - 6} más
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onFlowGenerated?.(generatedFlow)}
                className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Usar este flujo
              </button>
              <button
                onClick={getSuggestions}
                className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-600 rounded-lg transition-colors flex items-center gap-1"
              >
                <LightBulbIcon className="w-4 h-4" />
                Mejorar
              </button>
            </div>
          </div>
        )}
        
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <LightBulbIcon className="w-5 h-5" />
              <span className="font-medium">Sugerencias de mejora</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-300">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{suggestion.description || suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
