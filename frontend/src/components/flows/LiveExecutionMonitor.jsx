import { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

/**
 * LiveExecutionMonitor - Visualización en tiempo real de ejecución de flujos
 */
export default function LiveExecutionMonitor({ 
  socket, 
  workspaceId, 
  flowId,
  onNodeHighlight 
}) {
  const [executions, setExecutions] = useState([]);
  const [activeExecution, setActiveExecution] = useState(null);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [isLive, setIsLive] = useState(true);
  
  const stepsEndRef = useRef(null);
  
  // Conectar a eventos de ejecución
  useEffect(() => {
    if (!socket || !isLive) return;
    
    // Suscribirse a eventos del workspace
    socket.emit('execution:subscribe', { workspaceId, flowId });
    
    // Listeners
    socket.on('flow:execution:started', (data) => {
      const newExecution = {
        id: data.executionId,
        flowId: data.flowId,
        flowName: data.flowName,
        startTime: new Date(),
        status: 'running',
        steps: []
      };
      
      setExecutions(prev => [newExecution, ...prev.slice(0, 19)]);
      setActiveExecution(newExecution);
      setExecutionSteps([]);
    });
    
    socket.on('flow:node:running', (data) => {
      const step = {
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        startTime: new Date(),
        status: 'running'
      };
      
      setExecutionSteps(prev => [...prev, step]);
      
      // Highlight node en el editor
      if (onNodeHighlight) {
        onNodeHighlight(data.nodeId, 'running');
      }
    });
    
    socket.on('flow:node:completed', (data) => {
      setExecutionSteps(prev => prev.map(step => 
        step.nodeId === data.nodeId
          ? { ...step, status: 'completed', endTime: new Date(), result: data.result }
          : step
      ));
      
      if (onNodeHighlight) {
        onNodeHighlight(data.nodeId, 'completed');
      }
    });
    
    socket.on('flow:node:error', (data) => {
      setExecutionSteps(prev => prev.map(step => 
        step.nodeId === data.nodeId
          ? { ...step, status: 'error', endTime: new Date(), error: data.error }
          : step
      ));
      
      if (onNodeHighlight) {
        onNodeHighlight(data.nodeId, 'error');
      }
    });
    
    socket.on('flow:execution:completed', (data) => {
      setExecutions(prev => prev.map(exec =>
        exec.id === data.executionId
          ? { ...exec, status: 'completed', endTime: new Date(), duration: data.duration }
          : exec
      ));
      
      if (activeExecution?.id === data.executionId) {
        setActiveExecution(prev => ({ ...prev, status: 'completed', endTime: new Date() }));
      }
    });
    
    socket.on('flow:execution:error', (data) => {
      setExecutions(prev => prev.map(exec =>
        exec.id === data.executionId
          ? { ...exec, status: 'error', endTime: new Date(), error: data.error }
          : exec
      ));
      
      if (activeExecution?.id === data.executionId) {
        setActiveExecution(prev => ({ ...prev, status: 'error', endTime: new Date() }));
      }
    });
    
    return () => {
      socket.emit('execution:unsubscribe', { workspaceId, flowId });
      socket.off('flow:execution:started');
      socket.off('flow:node:running');
      socket.off('flow:node:completed');
      socket.off('flow:node:error');
      socket.off('flow:execution:completed');
      socket.off('flow:execution:error');
    };
  }, [socket, workspaceId, flowId, isLive, onNodeHighlight]);
  
  // Auto-scroll a nuevos pasos
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionSteps]);
  
  // Formatear duración
  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end) - new Date(start);
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Obtener icono de estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };
  
  // Obtener color de nodo según tipo
  const getNodeTypeColor = (type) => {
    const colors = {
      trigger: 'bg-purple-100 text-purple-700',
      condition: 'bg-amber-100 text-amber-700',
      action: 'bg-blue-100 text-blue-700',
      query: 'bg-green-100 text-green-700',
      response: 'bg-pink-100 text-pink-700',
      wait: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Monitor de Ejecución</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isLive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isLive ? 'En vivo' : 'Pausado'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Executions list */}
        <div className="w-64 border-r overflow-y-auto">
          <div className="p-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">
              Ejecuciones recientes
            </h4>
          </div>
          
          {executions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              Sin ejecuciones
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {executions.map(exec => (
                <button
                  key={exec.id}
                  onClick={() => setActiveExecution(exec)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                    activeExecution?.id === exec.id
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {getStatusIcon(exec.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {exec.flowName || 'Flujo'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(exec.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Execution detail */}
        <div className="flex-1 overflow-y-auto">
          {activeExecution ? (
            <div className="p-4">
              {/* Execution header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(activeExecution.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {activeExecution.flowName || 'Ejecución'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      ID: {activeExecution.id?.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <p className="text-gray-500">Duración</p>
                  <p className="font-medium text-gray-900">
                    {formatDuration(activeExecution.startTime, activeExecution.endTime || new Date())}
                  </p>
                </div>
              </div>
              
              {/* Steps timeline */}
              <div className="space-y-2">
                {executionSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`relative pl-6 pb-4 ${
                      idx < executionSteps.length - 1 ? 'border-l-2 border-gray-200' : ''
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center"
                      style={{
                        borderColor: step.status === 'running' ? '#3b82f6' :
                                    step.status === 'completed' ? '#22c55e' :
                                    step.status === 'error' ? '#ef4444' : '#9ca3af'
                      }}
                    >
                      {step.status === 'running' && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Step card */}
                    <div className={`ml-4 p-3 rounded-lg border ${
                      step.status === 'running' ? 'border-blue-200 bg-blue-50' :
                      step.status === 'error' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNodeTypeColor(step.nodeType)}`}>
                            {step.nodeType}
                          </span>
                          <span className="font-medium text-gray-900 text-sm">
                            {step.nodeName}
                          </span>
                        </div>
                        
                        <span className="text-xs text-gray-500">
                          {formatDuration(step.startTime, step.endTime)}
                        </span>
                      </div>
                      
                      {/* Error message */}
                      {step.error && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{step.error}</span>
                        </div>
                      )}
                      
                      {/* Result preview */}
                      {step.result && step.status === 'completed' && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 max-h-20 overflow-auto">
                          {typeof step.result === 'object' 
                            ? JSON.stringify(step.result, null, 2).slice(0, 200)
                            : String(step.result).slice(0, 200)
                          }
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={stepsEndRef} />
              </div>
              
              {/* Empty state for steps */}
              {executionSteps.length === 0 && activeExecution.status === 'running' && (
                <div className="text-center py-8 text-gray-400">
                  <ArrowPathIcon className="w-8 h-8 mx-auto animate-spin mb-2" />
                  <p>Esperando pasos...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BoltIcon className="w-12 h-12 mb-2" />
              <p>Selecciona una ejecución para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente mini para mostrar en el editor de flujos
export function ExecutionMiniStatus({ status, nodeId }) {
  if (!status) return null;
  
  const colors = {
    running: 'ring-blue-500 bg-blue-500',
    completed: 'ring-green-500 bg-green-500',
    error: 'ring-red-500 bg-red-500'
  };
  
  return (
    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-offset-1 ${colors[status] || ''}`}>
      {status === 'running' && (
        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping" />
      )}
    </div>
  );
}
