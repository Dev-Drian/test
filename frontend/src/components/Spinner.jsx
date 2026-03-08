/**
 * Spinner - Componente de carga reutilizable
 * 
 * Props:
 *   - size: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 *   - color: 'blue' | 'white' | 'gray' (default: 'blue')
 *   - className: clases adicionales
 */

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const colorMap = {
  blue: 'border-blue-500',
  white: 'border-white',
  gray: 'border-gray-400',
  indigo: 'border-indigo-500',
};

export default function Spinner({ size = 'md', color = 'blue', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`animate-spin rounded-full border-t-2 border-b-2 ${sizeMap[size]} ${colorMap[color]} ${className}`}
    />
  );
}

/**
 * FullPageSpinner - Spinner centrado en pantalla completa
 */
export function FullPageSpinner({ message = '' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
      <Spinner size="lg" color="blue" />
      {message && <p className="text-slate-400 text-sm">{message}</p>}
    </div>
  );
}
