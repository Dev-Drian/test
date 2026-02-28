/**
 * Flows - Página de gestión de flujos/automatizaciones
 * Lista los flujos existentes y permite crear nuevos desde plantillas
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import FlowTemplatesGallery from '../components/FlowTemplatesGallery';
import FlowWizard from '../components/FlowWizard';

// Iconos
const Icons = {
  flow: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  template: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  wizard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  play: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),
  pause: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  ),
};

// Colores por categoría
const categoryColors = {
  business: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  support: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  automation: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  crm: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  default: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
};

export default function Flows() {
  const navigate = useNavigate();
  const { workspaceId, workspaceName } = useWorkspace();
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Cargar flujos
  useEffect(() => {
    if (!workspaceId) return;
    loadFlows();
  }, [workspaceId]);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/flow/list', { params: { workspaceId } });
      setFlows(res.data || []);
    } catch (err) {
      console.error('Error loading flows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Crear flujo desde plantilla
  const handleCreateFromTemplate = async (template) => {
    try {
      const flowData = {
        workspaceId,
        name: template ? `${template.name} - Nuevo` : 'Nuevo flujo',
        description: template?.description || '',
        nodes: template?.nodes || [],
        edges: template?.edges || [],
      };

      const res = await api.post('/flow/create', flowData);
      setShowGallery(false);
      navigate(`/flows/editor?flowId=${res.data._id}`);
    } catch (err) {
      console.error('Error creating flow:', err);
      const errorData = err.response?.data;
      if (err.response?.status === 403 && errorData?.code === 'LIMIT_REACHED') {
        toast.error(`${errorData.upgrade?.title || 'Límite alcanzado'}: ${errorData.upgrade?.message || 'Has alcanzado el límite de flujos de tu plan.'}`);
      } else if (err.response?.status === 403) {
        toast.error('No tienes permisos para crear flujos. Actualiza tu plan para continuar.');
      } else {
        toast.error(`Error al crear flujo: ${errorData?.error || err.message}`);
      }
    }
  };

  // Crear flujo desde wizard
  const handleCreateFromWizard = async (flowConfig) => {
    try {
      const res = await api.post('/flow/create', {
        workspaceId,
        ...flowConfig,
      });
      setShowWizard(false);
      navigate(`/flows/editor?flowId=${res.data._id}`);
    } catch (err) {
      console.error('Error creating flow:', err);
      const errorData = err.response?.data;
      if (err.response?.status === 403 && errorData?.code === 'LIMIT_REACHED') {
        toast.error(`${errorData.upgrade?.title || 'Límite alcanzado'}: ${errorData.upgrade?.message || 'Has alcanzado el límite de flujos de tu plan.'}`);
      } else if (err.response?.status === 403) {
        toast.error('No tienes permisos para crear flujos. Actualiza tu plan para continuar.');
      } else {
        toast.error(`Error al crear flujo: ${errorData?.error || err.message}`);
      }
    }
  };

  // Eliminar flujo
  const handleDeleteFlow = async (flowId) => {
    try {
      await api.delete('/flow/delete', { data: { workspaceId, flowId } });
      setFlows(flows.filter(f => f._id !== flowId));
      setDeleteConfirm(null);
      toast.success('Flujo eliminado correctamente');
    } catch (err) {
      console.error('Error deleting flow:', err);
      toast.error(`Error al eliminar: ${err.response?.data?.error || err.message}`);
    }
  };

  // Toggle activo/inactivo
  const handleToggleActive = async (flow) => {
    try {
      await api.put('/flow/update', {
        workspaceId,
        flowId: flow._id,
        isActive: !flow.isActive,
      });
      setFlows(flows.map(f => f._id === flow._id ? { ...f, isActive: !f.isActive } : f));
      toast.success(`Flujo ${flow.isActive ? 'desactivado' : 'activado'}`);
    } catch (err) {
      console.error('Error toggling flow:', err);
      toast.error(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            {Icons.flow}
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Selecciona un proyecto</h2>
          <p className="text-zinc-400 mb-4">Para gestionar flujos, primero selecciona un proyecto</p>
          <Link
            to="/workspaces"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white hover:bg-violet-400 transition-colors"
          >
            Ir a Proyectos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4" style={{ background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                {Icons.flow}
              </div>
              Automatizaciones
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {workspaceName} • {flows.length} flujo{flows.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Asistente */}
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-violet-300 transition-all hover:bg-violet-500/10"
              style={{ border: '1px solid rgba(139, 92, 246, 0.3)' }}
            >
              {Icons.wizard}
              <span>Asistente</span>
            </button>

            {/* Botón Plantillas */}
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              {Icons.template}
              <span>Plantillas</span>
            </button>

            {/* Botón Crear */}
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/20"
            >
              {Icons.plus}
              <span>Nuevo flujo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flows.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Comienza a automatizar</h2>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Los flujos automatizan tareas repetitivas. Crea reservas, responde preguntas frecuentes o notifica eventos importantes.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
              >
                {Icons.wizard}
                Crear con asistente
              </button>
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all"
                style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {Icons.template}
                Ver plantillas
              </button>
            </div>
          </div>
        ) : (
          /* Lista de flujos */
          <div className="grid gap-4">
            {flows.map((flow) => {
              const colors = categoryColors[flow.category] || categoryColors.default;
              return (
                <div
                  key={flow._id}
                  className={`group p-5 rounded-2xl border transition-all hover:border-white/20 ${colors.border}`}
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center text-xl shrink-0`}>
                        {flow.icon || '⚡'}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-white">{flow.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${flow.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                            {flow.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-3">{flow.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>{flow.nodes?.length || 0} bloques</span>
                          <span>•</span>
                          <span>Trigger: {flow.trigger || 'message'}</span>
                          {flow.updatedAt && (
                            <>
                              <span>•</span>
                              <span>Actualizado: {new Date(flow.updatedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleActive(flow)}
                        className={`p-2 rounded-lg transition-all ${flow.isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                        title={flow.isActive ? 'Pausar' : 'Activar'}
                      >
                        {flow.isActive ? Icons.pause : Icons.play}
                      </button>
                      <Link
                        to={`/flows/editor?flowId=${flow._id}`}
                        className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Editar"
                      >
                        {Icons.edit}
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(flow._id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                        title="Eliminar"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Galería de Plantillas */}
      {showGallery && (
        <FlowTemplatesGallery
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* Modal Asistente */}
      {showWizard && (
        <FlowWizard
          workspaceId={workspaceId}
          onCreate={handleCreateFromWizard}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              {Icons.trash}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">¿Eliminar flujo?</h3>
            <p className="text-sm text-zinc-400 mb-6">Esta acción no se puede deshacer. El flujo dejará de funcionar inmediatamente.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 transition-all"
                style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteFlow(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-400 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
