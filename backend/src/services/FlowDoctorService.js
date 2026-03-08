/**
 * FlowDoctorService - Análisis automático de flujos para detectar problemas
 * 
 * Como un linter pero para flujos:
 * - Detecta nodos sin conexiones
 * - Detecta loops infinitos
 * - Sugiere manejo de errores
 * - Detecta nodos inalcanzables
 */

import OpenAI from 'openai';
import logger from '../config/logger.js';

const log = logger.child('FlowDoctor');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tipos de problemas
export const ISSUE_SEVERITY = {
  ERROR: 'error',      // Problema crítico, el flujo no funcionará
  WARNING: 'warning',  // Problema potencial
  INFO: 'info',        // Sugerencia de mejora
  TIP: 'tip'           // Best practice
};

// Reglas de análisis
const ANALYSIS_RULES = [
  {
    id: 'no_trigger',
    name: 'Sin nodo trigger',
    check: (flow) => {
      const hasTrigger = flow.nodes.some(n => n.type === 'trigger' || n.type === 'start');
      if (!hasTrigger) {
        return {
          severity: ISSUE_SEVERITY.ERROR,
          message: 'El flujo no tiene nodo de inicio (trigger)',
          suggestion: 'Agrega un nodo Trigger al inicio del flujo'
        };
      }
      return null;
    }
  },
  {
    id: 'orphan_nodes',
    name: 'Nodos huérfanos',
    check: (flow) => {
      const issues = [];
      const connectedNodeIds = new Set();
      
      // El trigger siempre está conectado
      flow.nodes.forEach(n => {
        if (n.type === 'trigger' || n.type === 'start') {
          connectedNodeIds.add(n.id);
        }
      });
      
      // Agregar nodos conectados por edges
      flow.edges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });
      
      // Buscar nodos sin conexión
      flow.nodes.forEach(n => {
        if (!connectedNodeIds.has(n.id) && n.type !== 'trigger' && n.type !== 'start') {
          issues.push({
            severity: ISSUE_SEVERITY.WARNING,
            nodeId: n.id,
            nodeName: n.data?.label || n.type,
            message: `El nodo "${n.data?.label || n.type}" no está conectado al flujo`,
            suggestion: 'Conecta este nodo o elimínalo si no es necesario'
          });
        }
      });
      
      return issues.length > 0 ? issues : null;
    }
  },
  {
    id: 'dead_ends',
    name: 'Nodos sin salida',
    check: (flow) => {
      const issues = [];
      const nodesWithOutgoing = new Set(flow.edges.map(e => e.source));
      
      flow.nodes.forEach(n => {
        // Response y algunos actions pueden ser finales
        if (n.type === 'response' || n.type === 'end') return;
        
        if (!nodesWithOutgoing.has(n.id)) {
          const isLast = flow.edges.some(e => e.target === n.id);
          if (isLast) {
            issues.push({
              severity: ISSUE_SEVERITY.INFO,
              nodeId: n.id,
              nodeName: n.data?.label || n.type,
              message: `El nodo "${n.data?.label || n.type}" no tiene salida`,
              suggestion: 'Considera agregar un nodo de respuesta o una acción final'
            });
          }
        }
      });
      
      return issues.length > 0 ? issues : null;
    }
  },
  {
    id: 'condition_outputs',
    name: 'Condiciones incompletas',
    check: (flow) => {
      const issues = [];
      
      flow.nodes.forEach(n => {
        if (n.type === 'condition' || n.type === 'switch') {
          const outgoingEdges = flow.edges.filter(e => e.source === n.id);
          
          // Una condición debería tener al menos 2 salidas (true/false)
          if (outgoingEdges.length < 2) {
            issues.push({
              severity: ISSUE_SEVERITY.WARNING,
              nodeId: n.id,
              nodeName: n.data?.label || n.type,
              message: `La condición "${n.data?.label || 'sin nombre'}" solo tiene ${outgoingEdges.length} salida(s)`,
              suggestion: 'Las condiciones deberían tener al menos una rama para "Sí" y otra para "No"'
            });
          }
        }
      });
      
      return issues.length > 0 ? issues : null;
    }
  },
  {
    id: 'no_error_handling',
    name: 'Sin manejo de errores',
    check: (flow) => {
      const hasErrorHandler = flow.nodes.some(n => 
        n.type === 'error_handler' || 
        n.data?.continueOnError === true
      );
      
      const hasHttpOrExternal = flow.nodes.some(n => 
        ['http', 'webhook', 'email', 'sms', 'whatsapp'].includes(n.type)
      );
      
      if (hasHttpOrExternal && !hasErrorHandler) {
        return {
          severity: ISSUE_SEVERITY.WARNING,
          message: 'El flujo usa servicios externos pero no tiene manejo de errores',
          suggestion: 'Agrega un nodo de manejo de errores o habilita "Continuar en error" en los nodos críticos'
        };
      }
      
      return null;
    }
  },
  {
    id: 'potential_loops',
    name: 'Loops potenciales',
    check: (flow) => {
      // Detectar ciclos en el grafo
      const visited = new Set();
      const recursionStack = new Set();
      const issues = [];
      
      function hasCycle(nodeId, path = []) {
        if (recursionStack.has(nodeId)) {
          return path.slice(path.indexOf(nodeId));
        }
        if (visited.has(nodeId)) return null;
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);
        
        const outgoing = flow.edges.filter(e => e.source === nodeId);
        for (const edge of outgoing) {
          const cycle = hasCycle(edge.target, [...path]);
          if (cycle) return cycle;
        }
        
        recursionStack.delete(nodeId);
        return null;
      }
      
      for (const node of flow.nodes) {
        const cycle = hasCycle(node.id);
        if (cycle && cycle.length > 0) {
          const cycleNodes = cycle.map(id => {
            const n = flow.nodes.find(node => node.id === id);
            return n?.data?.label || id;
          }).join(' → ');
          
          issues.push({
            severity: ISSUE_SEVERITY.WARNING,
            message: `Posible loop detectado: ${cycleNodes}`,
            suggestion: 'Verifica que el loop sea intencional y tenga condición de salida'
          });
          break; // Solo reportar el primer ciclo
        }
      }
      
      return issues.length > 0 ? issues : null;
    }
  },
  {
    id: 'empty_responses',
    name: 'Respuestas vacías',
    check: (flow) => {
      const issues = [];
      
      flow.nodes.forEach(n => {
        if (n.type === 'response' || n.type === 'message') {
          const template = n.data?.responseTemplate || n.data?.message || n.data?.label;
          if (!template || template.trim().length < 3) {
            issues.push({
              severity: ISSUE_SEVERITY.WARNING,
              nodeId: n.id,
              nodeName: n.data?.label || 'Respuesta',
              message: 'Nodo de respuesta sin contenido',
              suggestion: 'Agrega el mensaje que se enviará al usuario'
            });
          }
        }
      });
      
      return issues.length > 0 ? issues : null;
    }
  },
  {
    id: 'unconfigured_actions',
    name: 'Acciones sin configurar',
    check: (flow) => {
      const issues = [];
      
      flow.nodes.forEach(n => {
        if (n.type === 'action' || n.type === 'query') {
          const hasConfig = n.data?.tableId || n.data?.actionType || n.data?.config;
          if (!hasConfig) {
            issues.push({
              severity: ISSUE_SEVERITY.WARNING,
              nodeId: n.id,
              nodeName: n.data?.label || 'Acción',
              message: `El nodo "${n.data?.label || 'Acción'}" no está configurado`,
              suggestion: 'Configura la tabla y tipo de acción'
            });
          }
        }
      });
      
      return issues.length > 0 ? issues : null;
    }
  }
];

/**
 * Analiza un flujo y retorna todos los problemas encontrados
 */
export function analyzeFlow(flow) {
  if (!flow || !flow.nodes) {
    return {
      score: 0,
      issues: [{
        severity: ISSUE_SEVERITY.ERROR,
        message: 'Flujo inválido o vacío'
      }],
      suggestions: []
    };
  }
  
  const allIssues = [];
  
  // Ejecutar todas las reglas
  for (const rule of ANALYSIS_RULES) {
    try {
      const result = rule.check(flow);
      if (result) {
        if (Array.isArray(result)) {
          allIssues.push(...result.map(r => ({ ...r, ruleId: rule.id })));
        } else {
          allIssues.push({ ...result, ruleId: rule.id });
        }
      }
    } catch (error) {
      log.warn('Rule check failed', { ruleId: rule.id, error: error.message });
    }
  }
  
  // Calcular score (100 - penalizaciones)
  let score = 100;
  for (const issue of allIssues) {
    switch (issue.severity) {
      case ISSUE_SEVERITY.ERROR:
        score -= 25;
        break;
      case ISSUE_SEVERITY.WARNING:
        score -= 10;
        break;
      case ISSUE_SEVERITY.INFO:
        score -= 3;
        break;
    }
  }
  score = Math.max(0, score);
  
  // Ordenar por severidad
  allIssues.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2, tip: 3 };
    return order[a.severity] - order[b.severity];
  });
  
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
    issues: allIssues,
    nodeCount: flow.nodes.length,
    edgeCount: flow.edges.length,
    hasErrors: allIssues.some(i => i.severity === ISSUE_SEVERITY.ERROR),
    hasWarnings: allIssues.some(i => i.severity === ISSUE_SEVERITY.WARNING),
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Análisis profundo con IA
 */
export async function analyzeFlowWithAI(flow) {
  // Primero hacer análisis básico
  const basicAnalysis = analyzeFlow(flow);
  
  // Luego análisis con IA
  try {
    const prompt = `Analiza este flujo de automatización y proporciona recomendaciones de mejora:

FLUJO:
${JSON.stringify(flow, null, 2)}

ANÁLISIS BÁSICO:
${JSON.stringify(basicAnalysis, null, 2)}

Proporciona en JSON:
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "Título corto",
      "description": "Qué mejorar",
      "howTo": "Cómo implementarlo"
    }
  ],
  "optimizationTips": ["consejo1", "consejo2"],
  "potentialBugs": ["bug potencial"],
  "userExperienceScore": 85,
  "maintainabilityScore": 80,
  "summary": "Resumen en 2 oraciones"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Eres un experto en automatización de flujos de trabajo. Analiza flujos y proporciona recomendaciones específicas y accionables.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    const aiAnalysis = JSON.parse(content);
    
    return {
      ...basicAnalysis,
      aiAnalysis,
      analyzedWithAI: true
    };
    
  } catch (error) {
    log.error('AI analysis failed', { error: error.message });
    return {
      ...basicAnalysis,
      analyzedWithAI: false,
      aiError: error.message
    };
  }
}

/**
 * Obtiene sugerencias rápidas para un nodo específico
 */
export function getNodeSuggestions(node, flow) {
  const suggestions = [];
  
  // Sugerencias según tipo de nodo
  switch (node.type) {
    case 'trigger':
      if (!node.data?.triggerType) {
        suggestions.push({
          type: 'config',
          message: 'Define el tipo de trigger (mensaje, webhook, schedule, etc.)'
        });
      }
      break;
      
    case 'condition':
      if (!node.data?.condition) {
        suggestions.push({
          type: 'config',
          message: 'Define la condición a evaluar'
        });
      }
      const conditionOutputs = flow.edges.filter(e => e.source === node.id);
      if (conditionOutputs.length < 2) {
        suggestions.push({
          type: 'connection',
          message: 'Conecta las rutas "Verdadero" y "Falso"'
        });
      }
      break;
      
    case 'action':
      if (!node.data?.actionType) {
        suggestions.push({
          type: 'config',
          message: 'Selecciona el tipo de acción'
        });
      }
      if (!node.data?.tableId && ['create', 'update', 'delete', 'query'].includes(node.data?.actionType)) {
        suggestions.push({
          type: 'config',
          message: 'Selecciona la tabla donde ejecutar la acción'
        });
      }
      break;
      
    case 'response':
      if (!node.data?.responseTemplate && !node.data?.message) {
        suggestions.push({
          type: 'config',
          message: 'Escribe el mensaje de respuesta'
        });
      }
      break;
      
    case 'http':
    case 'webhook':
      if (!node.data?.url) {
        suggestions.push({
          type: 'config',
          message: 'Configura la URL del endpoint'
        });
      }
      break;
  }
  
  // Verificar conexiones
  const hasIncoming = flow.edges.some(e => e.target === node.id);
  const hasOutgoing = flow.edges.some(e => e.source === node.id);
  
  if (!hasIncoming && node.type !== 'trigger' && node.type !== 'start') {
    suggestions.push({
      type: 'connection',
      message: 'Este nodo no tiene conexión de entrada'
    });
  }
  
  if (!hasOutgoing && !['response', 'end'].includes(node.type)) {
    suggestions.push({
      type: 'connection',
      message: 'Conecta este nodo al siguiente paso del flujo'
    });
  }
  
  return suggestions;
}

/**
 * Auto-fix problemas simples
 */
export function autoFix(flow, issueId) {
  const fixes = [];
  
  switch (issueId) {
    case 'orphan_nodes':
      // Eliminar nodos huérfanos
      const analysis = analyzeFlow(flow);
      const orphanIssues = analysis.issues.filter(i => i.ruleId === 'orphan_nodes');
      const orphanIds = orphanIssues.map(i => i.nodeId);
      
      flow.nodes = flow.nodes.filter(n => !orphanIds.includes(n.id));
      fixes.push(`Eliminados ${orphanIds.length} nodos huérfanos`);
      break;
      
    case 'no_trigger':
      // Agregar trigger al inicio
      const triggerId = `trigger_${Date.now()}`;
      flow.nodes.unshift({
        id: triggerId,
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: {
          label: 'Inicio',
          triggerType: 'message'
        }
      });
      
      // Conectar al primer nodo si existe
      if (flow.nodes.length > 1) {
        flow.edges.unshift({
          id: `edge_${Date.now()}`,
          source: triggerId,
          target: flow.nodes[1].id,
          animated: true
        });
      }
      fixes.push('Agregado nodo trigger al inicio');
      break;
  }
  
  return {
    flow,
    fixes,
    fixedAt: new Date().toISOString()
  };
}

export default {
  analyzeFlow,
  analyzeFlowWithAI,
  getNodeSuggestions,
  autoFix,
  ISSUE_SEVERITY,
  ANALYSIS_RULES
};
