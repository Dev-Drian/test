import { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

/**
 * ConversationReplay - Reproductor de timeline de conversaciones
 */
export default function ConversationReplay({ conversationId, workspaceId, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const playIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Cargar timeline
  useEffect(() => {
    loadTimeline();
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [conversationId]);
  
  const loadTimeline = async () => {
    try {
      const response = await api.get(`/replay/${workspaceId}/${conversationId}/timeline`);
      
      if (response.data.success) {
        setTimeline(response.data.timeline || []);
      }
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Análisis con IA
  const analyzeConversation = async () => {
    try {
      const response = await api.get(`/replay/${workspaceId}/${conversationId}/analyze`);
      
      if (response.data.success) {
        setAiAnalysis(response.data.analysis);
        setShowAnalysis(true);
      }
    } catch (err) {
      console.error('Error analyzing:', err);
    }
  };
  
  // Control de reproducción
  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= timeline.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / speed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [playing, speed, timeline.length]);
  
  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentIndex]);
  
  // Exportar
  const exportConversation = async (format) => {
    try {
      const response = await api.get(`/replay/${workspaceId}/${conversationId}/export`, {
        params: { format }
      });
      
      if (response.data.success) {
        const blob = new Blob([response.data.content], { 
          type: format === 'json' ? 'application/json' : 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${conversationId}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };
  
  // Formatear timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Obtener mensajes visibles hasta el índice actual
  const visibleEvents = timeline.slice(0, currentIndex + 1);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Replay de Conversación</h3>
              <p className="text-sm text-gray-500">
                {timeline.length} eventos en el timeline
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={analyzeConversation}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              Analizar con IA
            </button>
            
            <div className="relative group">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => exportConversation('json')}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  JSON
                </button>
                <button
                  onClick={() => exportConversation('txt')}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  TXT
                </button>
                <button
                  onClick={() => exportConversation('html')}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  HTML
                </button>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-2xl mx-auto space-y-4">
                {visibleEvents.map((event, idx) => (
                  <MessageBubble
                    key={idx}
                    event={event}
                    isNew={idx === currentIndex}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="px-6 py-2 border-t">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={timeline.length - 1}
                  value={currentIndex}
                  onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                {/* Timeline markers */}
                <div className="absolute top-4 left-0 right-0 flex justify-between text-xs text-gray-500">
                  <span>{timeline[0] ? formatTime(timeline[0].timestamp) : ''}</span>
                  <span>{currentIndex + 1} / {timeline.length}</span>
                  <span>{timeline[timeline.length - 1] ? formatTime(timeline[timeline.length - 1].timestamp) : ''}</span>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="p-6 border-t flex items-center justify-center gap-4">
              {/* Speed selector */}
              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
              
              {/* Backward */}
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BackwardIcon className="w-6 h-6 text-gray-700" />
              </button>
              
              {/* Play/Pause */}
              <button
                onClick={() => setPlaying(!playing)}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white"
              >
                {playing ? (
                  <PauseIcon className="w-8 h-8" />
                ) : (
                  <PlayIcon className="w-8 h-8" />
                )}
              </button>
              
              {/* Forward */}
              <button
                onClick={() => setCurrentIndex(Math.min(timeline.length - 1, currentIndex + 1))}
                disabled={currentIndex >= timeline.length - 1}
                className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ForwardIcon className="w-6 h-6 text-gray-700" />
              </button>
              
              {/* Reset */}
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setPlaying(false);
                }}
                className="p-3 rounded-full hover:bg-gray-100"
              >
                <ArrowPathIcon className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </>
        )}
        
        {/* AI Analysis Modal */}
        {showAnalysis && aiAnalysis && (
          <div className="absolute inset-x-6 bottom-32 bg-white border border-purple-200 rounded-xl shadow-xl p-6 max-h-64 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Análisis de IA</h4>
              </div>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {aiAnalysis.summary && (
                <div className="col-span-2">
                  <h5 className="font-medium text-gray-700 mb-1">Resumen</h5>
                  <p className="text-gray-600">{aiAnalysis.summary}</p>
                </div>
              )}
              {aiAnalysis.intent && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-1">Intención</h5>
                  <p className="text-gray-600">{aiAnalysis.intent}</p>
                </div>
              )}
              {aiAnalysis.sentiment && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-1">Sentimiento</h5>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    aiAnalysis.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    aiAnalysis.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {aiAnalysis.sentiment}
                  </span>
                </div>
              )}
              {aiAnalysis.keyPoints?.length > 0 && (
                <div className="col-span-2">
                  <h5 className="font-medium text-gray-700 mb-1">Puntos clave</h5>
                  <ul className="list-disc list-inside text-gray-600">
                    {aiAnalysis.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.improvement && (
                <div className="col-span-2">
                  <h5 className="font-medium text-gray-700 mb-1">Sugerencia de mejora</h5>
                  <p className="text-gray-600">{aiAnalysis.improvement}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de burbuja de mensaje
function MessageBubble({ event, isNew }) {
  const isUser = event.type === 'user_message' || event.sender === 'user';
  const isBot = event.type === 'bot_message' || event.sender === 'bot';
  const isSystem = event.type === 'system' || event.type === 'flow_trigger' || event.type === 'action';
  
  if (isSystem) {
    return (
      <div className={`flex justify-center transition-all duration-300 ${isNew ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 rounded-full text-xs text-gray-600">
          <CpuChipIcon className="w-3 h-3" />
          {event.action || event.message || event.type}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-300 ${isNew ? 'scale-105' : ''}`}>
      <div className={`flex items-end gap-2 max-w-md ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`p-2 rounded-full ${isUser ? 'bg-blue-100' : 'bg-gray-200'}`}>
          {isUser ? (
            <UserIcon className="w-4 h-4 text-blue-600" />
          ) : (
            <CpuChipIcon className="w-4 h-4 text-gray-600" />
          )}
        </div>
        
        <div className={`px-4 py-3 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        }`}>
          <p className="text-sm">{event.content || event.message}</p>
          <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            {new Date(event.timestamp).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
