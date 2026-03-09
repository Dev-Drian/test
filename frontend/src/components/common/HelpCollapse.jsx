import { LightBulbIcon } from '@heroicons/react/24/outline';

export default function HelpCollapse({ title, icon: Icon = LightBulbIcon, children }) {
  return (
    <details className="group bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
      <summary className="flex items-center gap-3 p-4 cursor-pointer text-sm">
        <Icon className="w-5 h-5 text-blue-400" />
        <span className="text-zinc-300 font-medium">{title} (clic para ver)</span>
        <span className="ml-auto text-zinc-500 text-xs group-open:hidden">Mostrar</span>
        <span className="ml-auto text-zinc-500 text-xs hidden group-open:inline">Ocultar</span>
      </summary>
      <div className="px-4 pb-4 pt-0 border-t border-zinc-700/50 text-sm text-zinc-400">
        {children}
      </div>
    </details>
  );
}
