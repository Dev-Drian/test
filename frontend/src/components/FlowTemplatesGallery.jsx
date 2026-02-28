/**
 * FlowTemplatesGallery - Galeria visual de plantillas de flujos
 * Carga dinamica segun plan y tipo de negocio del usuario
 */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Iconos SVG profesionales
const Icons = {
  grid: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  megaphone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  'calendar-check': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6l2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  'file-text': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9h3.75m-3.75 3h3.75m-3.75 3h3.75M6 18.75V6.375c0-.621.504-1.125 1.125-1.125h5.25L18 10.5v8.25c0 .621-.504 1.125-1.125 1.125H7.125A1.125 1.125 0 016 18.75z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  'bell-ring': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
    </svg>
  ),
  question: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
  'user-plus': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  close: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  xmark: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// Obtener icono por nombre
const getIcon = (iconName) => {
  const icon = Icons[iconName];
  if (!icon) return Icons.document;
  return icon;
};

// Colores por categoria
const categoryStyles = {
  business: { 
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    icon: 'bg-emerald-500/20 text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  support: { 
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30 hover:border-blue-400/50',
    icon: 'bg-blue-500/20 text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300'
  },
  crm: { 
    gradient: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/30 hover:border-purple-400/50',
    icon: 'bg-purple-500/20 text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300'
  },
  automation: { 
    gradient: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/30 hover:border-amber-400/50',
    icon: 'bg-amber-500/20 text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  marketing: { 
    gradient: 'from-pink-500/20 to-pink-600/5',
    border: 'border-pink-500/30 hover:border-pink-400/50',
    icon: 'bg-pink-500/20 text-pink-400',
    badge: 'bg-pink-500/20 text-pink-300'
  },
  default: { 
    gradient: 'from-zinc-500/20 to-zinc-600/5',
    border: 'border-zinc-500/30 hover:border-zinc-400/50',
    icon: 'bg-zinc-500/20 text-zinc-400',
    badge: 'bg-zinc-500/20 text-zinc-300'
  },
};

// Mini preview de nodos
const FlowPreview = ({ nodes = [], edges = [] }) => {
  if (!nodes.length) return null;
  
  const visibleNodes = nodes.slice(0, 5);
  
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {visibleNodes.map((node, idx) => (
        <div key={node.id} className="flex items-center">
          <div 
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              node.type === 'start' || node.type === 'trigger' ? 'bg-emerald-500/30 text-emerald-300' :
              node.type === 'condition' ? 'bg-amber-500/30 text-amber-300' :
              node.type === 'message' || node.type === 'response' ? 'bg-pink-500/30 text-pink-300' :
              node.type === 'insert' || node.type === 'update' || node.type === 'action' ? 'bg-violet-500/30 text-violet-300' :
              'bg-blue-500/30 text-blue-300'
            }`}
            title={node.data?.label || node.type}
          >
            {idx + 1}
          </div>
          {idx < visibleNodes.length - 1 && (
            <div className="w-4 h-0.5 bg-zinc-700" />
          )}
        </div>
      ))}
      {nodes.length > 5 && (
        <span className="text-xs text-zinc-500 ml-1">+{nodes.length - 5}</span>
      )}
    </div>
  );
};

export default function FlowTemplatesGallery({ onSelect, onClose, businessType: propBusinessType }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  const [businessType, setBusinessType] = useState(propBusinessType || user?.businessType || 'general');

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, businessType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Usar URL correcta con parametros de filtro
      const params = new URLSearchParams();
      if (businessType) params.append('businessType', businessType);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const res = await api.get(`/flow/templates?${params.toString()}`);
      const data = res.data;
      
      if (data.templates) {
        setTemplates(data.templates);
        setCategories(data.categories || []);
        setUserPlan(data.userPlan || 'free');
        setBusinessType(data.businessType || businessType);
      } else {
        // Fallback si el backend devuelve array directamente
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setTemplates([{
        _id: 'empty',
        name: 'Flujo vacio',
        description: 'Empieza desde cero',
        icon: 'sparkles',
        nodes: [],
        edges: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por categoria (solo si no viene filtrado del backend)
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory || t._id === 'empty');

  // Asegurar que "Flujo vacio" siempre esta al final
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a._id === 'empty') return 1;
    if (b._id === 'empty') return -1;
    return 0;
  });

  // Categorias dinamicas o fallback
  const displayCategories = categories.length > 0 ? categories : [
    { id: 'all', label: 'Todas', icon: 'grid' },
    { id: 'business', label: 'Negocio', icon: 'briefcase' },
    { id: 'support', label: 'Soporte', icon: 'chat' },
    { id: 'crm', label: 'CRM', icon: 'users' },
    { id: 'automation', label: 'Automatizacion', icon: 'bolt' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div 
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-fade-up"
        style={{ 
          background: 'linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 15, 0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Galeria de Plantillas</h2>
            <p className="text-zinc-400">
              Elige una plantilla para crear tu flujo rapidamente
              {userPlan !== 'enterprise' && (
                <span className="ml-2 text-xs text-zinc-600">
                  Plan: <span className="text-violet-400 capitalize">{userPlan}</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            {Icons.close}
          </button>
        </div>

        {/* Categories */}
        <div className="px-8 py-4 flex items-center gap-2 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {displayCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              style={{ border: '1px solid' }}
            >
              <span className="w-5 h-5">{getIcon(cat.icon)}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                {Icons.document}
              </div>
              <p className="text-zinc-400 mb-2">No hay plantillas en esta categoria</p>
              <p className="text-sm text-zinc-600">
                Prueba seleccionando otra categoria o contacta soporte para mas opciones
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTemplates.map((template) => {
                const styles = categoryStyles[template.category] || categoryStyles.default;
                const isHovered = hoveredTemplate === template._id;
                const isEmpty = template._id === 'empty';
                
                return (
                  <button
                    key={template._id}
                    onClick={() => onSelect(isEmpty ? null : template)}
                    onMouseEnter={() => setHoveredTemplate(template._id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    className={`group relative p-6 rounded-2xl text-left transition-all duration-300 border ${
                      isEmpty 
                        ? 'border-dashed border-zinc-700 hover:border-zinc-500'
                        : styles.border
                    } ${isHovered ? 'scale-[1.02] shadow-xl' : ''}`}
                    style={{ 
                      background: isEmpty 
                        ? 'transparent' 
                        : `linear-gradient(135deg, ${isHovered ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.02)'}, transparent)`
                    }}
                  >
                    {/* Badges Container */}
                    {!isEmpty && (
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {/* Plan Badge (si es premium) */}
                        {template.requiredPlan && !template.requiredPlan.includes('free') && (
                          <div className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 flex items-center gap-1">
                            {Icons.lock}
                            <span>Premium</span>
                          </div>
                        )}
                        {/* Category Badge */}
                        {template.category && (
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${styles.badge}`}>
                            {displayCategories.find(c => c.id === template.category)?.label || template.category}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                      isHovered ? 'scale-110' : ''
                    } ${isEmpty ? 'bg-zinc-800/50 text-zinc-400' : styles.icon}`}>
                      {getIcon(template.icon || 'bolt')}
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Preview */}
                    {!isEmpty && template.nodes?.length > 0 && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <FlowPreview nodes={template.nodes} edges={template.edges} />
                        <p className="text-xs text-zinc-600 text-center mt-1">
                          {template.nodes.length} bloques preconstruidos
                        </p>
                      </div>
                    )}

                    {/* Arrow indicator */}
                    <div className={`absolute bottom-6 right-6 transition-all ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      <span className="text-violet-400">{Icons.arrow}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
          <p className="text-sm text-zinc-500">
            {sortedTemplates.length} plantilla{sortedTemplates.length !== 1 ? 's' : ''} disponible{sortedTemplates.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
