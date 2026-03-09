import { useState, useEffect, useCallback } from 'react';
import { 
  Squares2X2Icon, 
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  StarIcon,
  TagIcon,
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  HomeIcon,
  AcademicCapIcon,
  ScaleIcon,
  TruckIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import HelpCollapse from '../common/HelpCollapse';
import { Squares2X2Icon } from '@heroicons/react/24/outline';

// Mapeo de iconos por código de template
const TEMPLATE_ICONS = {
  SHOP: ShoppingCartIcon,
  REST: BuildingStorefrontIcon,
  MED: HeartIcon,
  HOME: HomeIcon,
  FIT: SparklesIcon,
  TRAVEL: PaperAirplaneIcon,
  EDU: AcademicCapIcon,
  LEGAL: ScaleIcon,
  DEFAULT: Squares2X2Icon
};

// Obtener icono según el código
const getTemplateIcon = (iconCode) => {
  const Icon = TEMPLATE_ICONS[iconCode] || TEMPLATE_ICONS.DEFAULT;
  return <Icon className="w-6 h-6" />;
};

/**
 * TemplatesMarketplace - Marketplace de plantillas de flujos
 */
export default function TemplatesMarketplace({ workspaceId, onInstall }) {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [businessDescription, setBusinessDescription] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [customVariables, setCustomVariables] = useState({});
  
  // Cargar templates y categorías
  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesRes, categoriesRes] = await Promise.all([
          api.get('/templates'),
          api.get('/templates/categories')
        ]);
        
        if (templatesRes.data.success) {
          setTemplates(templatesRes.data.templates);
        }
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.categories);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Filtrar templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !search || 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some(tag => tag.includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Obtener sugerencias con IA
  const getSuggestions = async () => {
    if (!businessDescription.trim()) return;
    
    setSuggesting(true);
    try {
      const response = await api.post('/templates/suggest', { businessDescription });
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (err) {
      console.error('Error getting suggestions:', err);
    } finally {
      setSuggesting(false);
    }
  };
  
  // Instalar template
  const installTemplate = async (templateId) => {
    setInstalling(templateId);
    try {
      const response = await api.post(`/templates/${workspaceId}/${templateId}/install`, {
        customVariables
      });
      
      if (response.data.success) {
        onInstall?.(response.data);
        setSelectedTemplate(null);
      }
    } catch (err) {
      console.error('Error installing template:', err);
    } finally {
      setInstalling(null);
    }
  };
  
  // Ver detalles de template
  const viewTemplate = async (templateId) => {
    try {
      const response = await api.get(`/templates/${templateId}`);
      if (response.data.success) {
        setSelectedTemplate(response.data.template);
        // Inicializar variables personalizadas con valores por defecto
        const vars = {};
        response.data.template.variables?.forEach(v => {
          vars[v.key] = v.default || '';
        });
        setCustomVariables(vars);
      }
    } catch (err) {
      console.error('Error loading template:', err);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
            <Squares2X2Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Templates Marketplace</h2>
            <p className="text-sm text-zinc-400">
              Plantillas pre-construidas para tu industria
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSuggest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all"
        >
          <SparklesIcon className="w-5 h-5" />
          IA Sugerir Template
        </button>
      </div>
      
      {/* Tip colapsable unificado */}
      <HelpCollapse title="¿Qué son los Templates?" icon={Squares2X2Icon}>
        Son flujos pre-diseñados para casos de uso comunes. Instálalos y personaliza variables para activar un bot en minutos.
      </HelpCollapse>
      
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all group"
            >
              {/* Header con icono y categoría */}
              <div className="bg-zinc-800/50 p-4 border-b border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 bg-violet-600/30 rounded-xl flex items-center justify-center text-violet-400">{getTemplateIcon(template.icon)}</span>
                    <div>
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <span className="text-xs text-zinc-400">{template.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-amber-400">
                    <StarIcon className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{template.popularity}</span>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-4">
                <p className="text-sm text-zinc-300 mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <p className="text-xs text-zinc-500 mb-3">
                  {template.preview}
                </p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags?.slice(0, 4).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                  <span>{template.nodesCount} nodos</span>
                  <span>{template.variablesCount} variables</span>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => viewTemplate(template.id)}
                    className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => installTemplate(template.id)}
                    disabled={installing === template.id}
                    className="flex-1 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {installing === template.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Instalar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* AI Suggestions Modal */}
      {showSuggest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg">
            <div className="p-6 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Sugerir Template con IA
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Describe tu negocio y encontraremos el template ideal
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Ej: Tengo una clínica dental en Madrid. Necesito atender consultas de pacientes, agendar citas y enviar recordatorios..."
                className="w-full h-32 px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
              
              <button
                onClick={getSuggestions}
                disabled={suggesting || !businessDescription.trim()}
                className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {suggesting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Obtener sugerencias
                  </>
                )}
              </button>
              
              {/* Suggestions Results */}
              {suggestions && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-white">Templates recomendados:</h4>
                  
                  {suggestions.suggestions?.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-violet-500/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowSuggest(false);
                        viewTemplate(s.templateId);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{s.template?.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-white">{s.template?.name}</h5>
                            <span className="text-sm text-violet-400 font-medium">
                              {s.relevance}% match
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">{s.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {suggestions.customization && (
                    <div className="p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
                      <p className="text-sm text-amber-400">
                        <strong>Tip:</strong> {suggestions.customization}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-zinc-700 flex justify-end">
              <button
                onClick={() => {
                  setShowSuggest(false);
                  setSuggestions(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-700 bg-zinc-800/50">
              <div className="flex items-start gap-4">
                <span className="w-16 h-16 bg-violet-600/30 rounded-xl flex items-center justify-center text-violet-400">{getTemplateIcon(selectedTemplate.icon)}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-zinc-400">{selectedTemplate.category} • {selectedTemplate.industry}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-violet-900/50 text-violet-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-zinc-300 mb-6">{selectedTemplate.description}</p>
              
              {/* Variables to customize */}
              {selectedTemplate.variables?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-white mb-3">
                    Personaliza el template:
                  </h4>
                  <div className="space-y-3">
                    {selectedTemplate.variables.map((v) => (
                      <div key={v.key}>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          {v.label}
                        </label>
                        <input
                          type="text"
                          value={customVariables[v.key] || ''}
                          onChange={(e) => setCustomVariables({
                            ...customVariables,
                            [v.key]: e.target.value
                          })}
                          placeholder={v.default}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Flow preview */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Estructura del flujo:
                </h4>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.flow?.nodes?.map((node, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm"
                      >
                        <span className="text-zinc-500">{node.type}:</span>{' '}
                        <span className="font-medium text-white">{node.data?.label || node.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => installTemplate(selectedTemplate.id)}
                disabled={installing === selectedTemplate.id}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {installing === selectedTemplate.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Instalando...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Instalar Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
