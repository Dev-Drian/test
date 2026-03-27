import { useState, useEffect } from 'react';
import { useMetaIntegration } from '../../hooks/useMetaIntegration';
import { useSearchParams } from 'react-router-dom';
import { listAgents } from '../../api/client';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CheckCircleIcon, 
  XMarkIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// ══════════════════════════════════════════════════════════════════════════════
// ── Brand Icons (Professional SVG) ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const MetaIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86c.08.21.166.414.26.608l.053.1a4.58 4.58 0 0 0 .544.858c.328.39.728.725 1.2.97.473.243 1.02.366 1.638.366.627 0 1.19-.129 1.677-.386a4.34 4.34 0 0 0 1.252-.974 8.063 8.063 0 0 0 .912-1.218 31.03 31.03 0 0 0 .71-1.187c.271-.476.523-.954.76-1.432l.076-.152c.283-.574.576-1.167.89-1.778.314-.61.652-1.227 1.025-1.829l.024-.038.042-.06a12.13 12.13 0 0 1 1.055-1.357 6.478 6.478 0 0 1 1.311-1.073c.496-.302 1.058-.453 1.685-.453.56 0 1.076.127 1.538.379.461.253.826.609 1.077 1.07.251.461.378.997.378 1.593 0 .87-.322 1.848-.819 2.86a20.18 20.18 0 0 1-1.49 2.523c-.42.62-.79 1.155-1.104 1.594l-.087.12c-.378.521-.715.989-1.009 1.389a8.93 8.93 0 0 1-.759.888 3.12 3.12 0 0 1-.723.567 1.43 1.43 0 0 1-.63.18c-.217 0-.393-.066-.534-.2a.898.898 0 0 1-.267-.479 2.328 2.328 0 0 1-.068-.55l-.001-.053.001-.029V13.5l.002-.088c.003-.265.014-.533.034-.8l.016-.168.012-.095a7.57 7.57 0 0 1 .178-1 5.04 5.04 0 0 1 .254-.747c.063-.148.13-.29.202-.425l.053-.095.02-.034.005-.008c.104-.177.213-.335.327-.476.114-.14.232-.263.354-.368l.04-.033a2.2 2.2 0 0 1 .267-.192.908.908 0 0 1 .378-.1c.167 0 .32.056.458.169.137.111.258.266.358.462.1.195.182.418.245.667.063.248.108.514.13.794l.012.159.002.052-.001.083-.005.16a6.3 6.3 0 0 1-.078.7l-.028.163-.019.101a3.886 3.886 0 0 1-.247.826c-.073.182-.156.348-.247.495a3.58 3.58 0 0 1-.206.3l-.072.086-.048.055c-.227.257-.474.491-.742.701-.268.211-.553.395-.857.55a4.5 4.5 0 0 1-.948.354 3.786 3.786 0 0 1-1.014.132c-.564 0-1.06-.124-1.477-.372a2.98 2.98 0 0 1-1.001-.975 4.152 4.152 0 0 1-.543-1.314 5.848 5.848 0 0 1-.17-1.386l.001-.132c0-.438.034-.878.103-1.313l.027-.164a9.994 9.994 0 0 1 .261-1.089c.077-.265.164-.523.26-.773l.068-.173c.157-.389.341-.772.55-1.147.21-.375.447-.739.713-1.085.265-.347.56-.67.886-.968.325-.297.68-.563 1.065-.793A5.48 5.48 0 0 1 16.917 4c.615 0 1.183.104 1.695.311.511.208.955.498 1.321.866.367.37.65.8.846 1.294.196.494.295 1.027.295 1.591 0 .644-.115 1.305-.343 1.973-.228.669-.553 1.34-.969 2.003a20.42 20.42 0 0 1-1.44 2.028 42.33 42.33 0 0 1-1.542 1.79l-.057.062a78.26 78.26 0 0 1-1.14 1.235c-.41.434-.799.84-1.163 1.214-.365.374-.704.711-1.012 1.007a11.91 11.91 0 0 1-.753.643l-.066.05c-.27.201-.543.365-.821.489a2.06 2.06 0 0 1-.858.187c-.349 0-.657-.084-.92-.252a2.16 2.16 0 0 1-.627-.627 2.724 2.724 0 0 1-.36-.843 3.605 3.605 0 0 1-.114-.916l.001-.07L8 15.1l.003-.099c.01-.303.038-.609.083-.914l.026-.167c.056-.34.138-.677.244-1.006l.048-.142.028-.08c.129-.355.286-.7.475-1.032.189-.331.407-.644.656-.935.248-.29.526-.554.833-.788.307-.233.645-.428 1.011-.58a3.24 3.24 0 0 1 1.19-.229c.304 0 .59.049.858.146.268.097.51.23.722.398.211.168.392.364.538.586.147.222.257.46.328.712l.03.112a1.972 1.972 0 0 1 .065.507c0 .28-.037.555-.11.823a3.478 3.478 0 0 1-.295.731c-.116.219-.246.423-.39.61a4.05 4.05 0 0 1-.433.476l-.072.065-.049.042a4.92 4.92 0 0 1-.575.424l-.082.05c-.258.154-.527.27-.805.347a2.94 2.94 0 0 1-.823.115c-.245 0-.478-.033-.696-.1a2.035 2.035 0 0 1-.584-.286 1.91 1.91 0 0 1-.446-.446 2.12 2.12 0 0 1-.285-.584 2.143 2.143 0 0 1-.1-.68c0-.132.01-.265.03-.397l.019-.115.02-.097c.038-.178.09-.355.157-.528.068-.173.149-.341.244-.504a3.98 3.98 0 0 1 .322-.456c.116-.14.244-.268.383-.382l.056-.043a2.61 2.61 0 0 1 .366-.231c.126-.067.258-.119.395-.157a1.466 1.466 0 0 1 .381-.054c.104 0 .206.012.304.034.098.023.192.055.28.096.089.041.17.09.245.148a.898.898 0 0 1 .188.186l.022.03.015.022.006.01.01.016.004.007a.39.39 0 0 1 .045.096c.01.032.016.065.019.099l.002.032-.002.062a.525.525 0 0 1-.088.256.772.772 0 0 1-.16.18l-.035.029-.04.03c-.063.045-.134.082-.212.11a.816.816 0 0 1-.261.044.725.725 0 0 1-.233-.037.68.68 0 0 1-.201-.107.631.631 0 0 1-.146-.164.579.579 0 0 1-.074-.206l-.008-.065v-.02l.004-.038a.329.329 0 0 1 .024-.078.233.233 0 0 1 .045-.063.208.208 0 0 1 .06-.044l.03-.015-.031.016a.209.209 0 0 0-.06.043.236.236 0 0 0-.045.063.334.334 0 0 0-.024.078l-.004.039v.02l.008.064a.582.582 0 0 0 .074.206c.037.064.086.12.146.164.06.045.128.08.2.107a.722.722 0 0 0 .234.038.816.816 0 0 0 .261-.045.685.685 0 0 0 .212-.11l.04-.029.035-.029a.77.77 0 0 0 .16-.18.526.526 0 0 0 .088-.257l.002-.061-.002-.032a.387.387 0 0 0-.02-.1.394.394 0 0 0-.044-.095l-.004-.007-.01-.016-.006-.01-.015-.022-.022-.03a.897.897 0 0 0-.188-.186 1.056 1.056 0 0 0-.245-.148 1.206 1.206 0 0 0-.28-.096 1.369 1.369 0 0 0-.304-.035c-.133 0-.26.019-.38.055a1.54 1.54 0 0 0-.396.157 2.629 2.629 0 0 0-.366.231l-.056.044a2.785 2.785 0 0 0-.383.382 4.01 4.01 0 0 0-.322.455c-.095.163-.176.331-.244.504a2.895 2.895 0 0 0-.157.528l-.02.098-.019.114a2.53 2.53 0 0 0-.03.397c0 .245.034.475.1.68.067.205.165.404.286.584.12.179.271.33.446.445.175.116.371.212.584.286.213.075.446.1.696.1.285 0 .56-.038.823-.116a3.23 3.23 0 0 0 .805-.347l.083-.05c.206-.127.399-.27.574-.424l.05-.042.071-.065c.158-.147.303-.308.434-.477a3.37 3.37 0 0 0 .39-.61c.122-.218.218-.451.294-.73a2.8 2.8 0 0 0 .11-.823 1.97 1.97 0 0 0-.065-.508l-.03-.112a1.906 1.906 0 0 0-.328-.712 2.02 2.02 0 0 0-.538-.586 2.365 2.365 0 0 0-.722-.398 2.584 2.584 0 0 0-.858-.146c-.43 0-.833.076-1.19.229-.366.152-.704.347-1.011.58-.307.234-.585.497-.833.788a5.7 5.7 0 0 0-.656.935c-.19.332-.347.677-.475 1.033l-.028.078-.048.143a6.334 6.334 0 0 0-.244 1.006l-.026.167a6.78 6.78 0 0 0-.084.914L8 15.1v.055l-.001.07c0 .329.038.636.114.916.076.28.193.548.36.843.167.296.38.49.627.627.247.136.531.218.851.243l.07.005c.035.003.07.004.105.004.305 0 .591-.063.858-.187.278-.124.551-.288.821-.49l.066-.05c.221-.17.46-.381.753-.643.308-.296.647-.633 1.012-1.007.364-.374.754-.78 1.164-1.214a78.3 78.3 0 0 0 1.14-1.235l.056-.062c.523-.57 1.028-1.158 1.508-1.76.497-.625.94-1.269 1.326-1.923.385-.654.688-1.317.905-1.98a6.17 6.17 0 0 0 .325-1.89c0-.523-.093-1.008-.275-1.45a3.262 3.262 0 0 0-.77-1.139 3.443 3.443 0 0 0-1.19-.743 4.053 4.053 0 0 0-1.515-.269c-.565 0-1.1.113-1.596.336a5.48 5.48 0 0 0-1.313.873c-.399.362-.763.77-1.086 1.219-.324.449-.608.918-.848 1.405l-.067.14-.016.035-.041.088a7.85 7.85 0 0 0-.199.467l-.028.073c-.082.224-.156.445-.221.661a6.663 6.663 0 0 0-.147.613l-.01.058-.017.107a5.66 5.66 0 0 0-.056.637L6.5 9.502v.183c0 .455.052.891.155 1.3.103.41.26.78.468 1.103.209.323.473.587.788.789.315.201.686.302 1.104.302.326 0 .62-.061.876-.181a2.43 2.43 0 0 0 .689-.47c.195-.189.363-.404.503-.64.139-.235.25-.48.33-.731l.024-.081.02-.074.013-.052.01-.044a3.106 3.106 0 0 0 .047-.382l.001-.044v-.02c0-.117-.013-.227-.038-.327a.87.87 0 0 0-.116-.273.71.71 0 0 0-.198-.2.62.62 0 0 0-.287-.09l-.038-.003h-.031a.507.507 0 0 0-.293.096.848.848 0 0 0-.22.222c-.064.09-.118.189-.163.294a3.35 3.35 0 0 0-.115.32l-.02.07-.014.054-.01.043a1.902 1.902 0 0 0-.036.325l-.001.034.002.051c.003.111.017.22.04.326.024.106.058.204.103.294.044.09.098.17.161.237.064.068.137.121.219.16a.67.67 0 0 0 .275.057c.132 0 .258-.035.375-.104a1.37 1.37 0 0 0 .315-.255.173.173 0 0 0 .02-.022l.014-.019c.081-.103.15-.215.204-.335.054-.12.094-.245.118-.372.024-.128.037-.257.037-.385 0-.113-.009-.226-.027-.336L12 10.4l-.038-.194a2.93 2.93 0 0 0-.221-.611 2.277 2.277 0 0 0-.373-.525 2.05 2.05 0 0 0-.502-.394 1.65 1.65 0 0 0-.602-.196l-.075-.01L10.106 8.5h-.188c-.456 0-.878.084-1.26.248a3.56 3.56 0 0 0-1.032.683 4.77 4.77 0 0 0-.79.973c-.228.365-.419.751-.568 1.155l-.044.129-.025.077a6.55 6.55 0 0 0-.163.585l-.015.066-.016.078-.011.057a4.57 4.57 0 0 0-.061.66l-.001.086v.112c0 .576.09 1.098.269 1.559.178.46.43.85.752 1.165.322.315.703.557 1.14.723.438.165.912.248 1.418.248.426 0 .828-.057 1.2-.171a4.2 4.2 0 0 0 1.046-.464c.315-.193.6-.416.855-.668.254-.252.477-.526.667-.821.19-.295.346-.607.466-.933.12-.326.202-.66.244-1l.014-.122.01-.113a4.32 4.32 0 0 0 .015-.452l-.001-.063a3.56 3.56 0 0 0-.045-.468 2.61 2.61 0 0 0-.125-.449 1.89 1.89 0 0 0-.211-.396 1.3 1.3 0 0 0-.305-.308 1.024 1.024 0 0 0-.405-.175 1.463 1.463 0 0 0-.361-.044c-.192 0-.37.036-.53.107a1.266 1.266 0 0 0-.424.298c-.12.128-.216.275-.287.441a1.614 1.614 0 0 0-.124.536l-.003.058v.038l.002.053.004.054c.004.048.012.096.022.142.01.047.023.091.04.133.017.042.038.081.063.116a.401.401 0 0 0 .09.092c.034.024.073.042.115.054.042.012.087.017.133.017.063 0 .12-.012.17-.037a.427.427 0 0 0 .127-.092.472.472 0 0 0 .085-.126.392.392 0 0 0 .035-.14l.002-.033v-.012l-.003-.04a.24.24 0 0 0-.019-.063.194.194 0 0 0-.034-.05.169.169 0 0 0-.047-.035.15.15 0 0 0-.058-.017h-.025l-.03.003a.149.149 0 0 0-.052.021.158.158 0 0 0-.042.038.182.182 0 0 0-.028.052.234.234 0 0 0-.012.059v.007l.001.028a.126.126 0 0 0 .012.042.107.107 0 0 0 .024.033.093.093 0 0 0 .033.02.073.073 0 0 0 .031.005l.009-.001h.008a.055.055 0 0 0 .02-.009.06.06 0 0 0 .015-.015l.004-.006a.055.055 0 0 0 .006-.018.072.072 0 0 0 .003-.02v-.003z"/>
  </svg>
);

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const MessengerIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.26 5.886-3.26-6.558 6.763z" />
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Channel Card Component ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const CHANNEL_CONFIG = {
  messenger: {
    name: 'Messenger',
    Icon: MessengerIcon,
    iconColor: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    buttonGradient: 'from-blue-500 to-blue-600',
    glowColor: 'shadow-blue-500/25',
  },
  instagram: {
    name: 'Instagram',
    Icon: InstagramIcon,
    iconColor: 'text-pink-400',
    bgGradient: 'from-pink-500/20 via-purple-500/15 to-orange-500/10',
    borderColor: 'border-pink-500/30',
    buttonGradient: 'from-pink-500 via-purple-500 to-orange-500',
    glowColor: 'shadow-pink-500/25',
  },
  whatsapp: {
    name: 'WhatsApp',
    Icon: WhatsAppIcon,
    iconColor: 'text-green-400',
    bgGradient: 'from-green-500/20 to-emerald-600/10',
    borderColor: 'border-green-500/30',
    buttonGradient: 'from-green-500 to-emerald-600',
    glowColor: 'shadow-green-500/25',
  },
};

function ChannelCard({ channel, connected, detail, onConnect, onDisconnect, connecting, onConfigure }) {
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.Icon;
  
  return (
    <div 
      className={`relative p-4 rounded-xl border transition-all duration-300 ${
        connected 
          ? `bg-gradient-to-br ${cfg.bgGradient} ${cfg.borderColor}` 
          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
      }`}
    >
      {/* Glow effect when connected */}
      {connected && (
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${cfg.bgGradient} blur-xl opacity-30 -z-10`} />
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            connected 
              ? `bg-gradient-to-br ${cfg.bgGradient}` 
              : 'bg-slate-700/50'
          }`}>
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">{cfg.name}</p>
              {connected && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ACTIVO
                </span>
              )}
            </div>
            {connected && detail ? (
              <p className="text-xs text-slate-400">{detail}</p>
            ) : !connected ? (
              <p className="text-xs text-slate-500">No conectado</p>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              {onConfigure && (
                <button
                  onClick={onConfigure}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Configurar"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={connecting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50 bg-gradient-to-r ${cfg.buttonGradient} hover:opacity-90 shadow-lg ${cfg.glowColor}`}
            >
              {connecting ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Conectando...
                </span>
              ) : (
                'Conectar'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card principal ────────────────────────────────────────────────────────────
export default function MetaIntegrationCard() {
  const {
    config,
    saveConfig,
    testConnection,
    disconnect,
    error,
    clearError,
    connectChannel,
    fetchPages,
    choosePage,
    refresh,
  } = useMetaIntegration();

  const [searchParams] = useSearchParams();
  const { workspaceId } = useWorkspace();
  const [notification, setNotification] = useState(null);
  const [connectingChannel, setConnectingChannel] = useState(null);
  const [disconnectingChannel, setDisconnectingChannel] = useState(null);
  const [agents, setAgents] = useState([]);
  const [savingAgent, setSavingAgent] = useState(false);

  // Page selection (multi-page OAuth flow)
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pageSelectChannel, setPageSelectChannel] = useState(null);
  const [availablePages, setAvailablePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectingPage, setSelectingPage] = useState(null);

  // WhatsApp manual setup
  const [showWhatsAppSetup, setShowWhatsAppSetup] = useState(false);
  const [waForm, setWaForm] = useState({ token: '', phoneNumberId: '', appSecret: '' });
  const [waTesting, setWaTesting] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);

  // Cargar agentes del workspace
  useEffect(() => {
    if (!workspaceId) return;
    listAgents(workspaceId).then(res => {
      const list = res.data || res;
      setAgents(Array.isArray(list) ? list.filter(a => a.active !== false) : []);
    }).catch(() => {});
  }, [workspaceId]);

  // Leer resultado OAuth del query string
  useEffect(() => {
    const metaParam = searchParams.get('meta');
    const metaError = searchParams.get('meta_error');

    if (metaParam === 'select_page') {
      const ch = searchParams.get('channel');
      setPageSelectChannel(ch);
      setShowPageSelector(true);
      setLoadingPages(true);
      fetchPages().then(pages => {
        setAvailablePages(pages);
        setLoadingPages(false);
      });
      // Limpiar URL
      const url = new URL(window.location);
      url.searchParams.delete('meta');
      url.searchParams.delete('channel');
      window.history.replaceState({}, '', url);
    } else if (metaParam?.includes('connected')) {
      const ch = metaParam.replace('_connected', '');
      setNotification({ type: 'success', message: `${ch.charAt(0).toUpperCase() + ch.slice(1)} conectado exitosamente` });
      refresh();
      // Limpiar URL
      const url = new URL(window.location);
      url.searchParams.delete('meta');
      window.history.replaceState({}, '', url);
    }
    if (metaError) {
      const friendlyErrors = {
        no_pages: 'No se encontraron páginas de Facebook. Asegúrate de tener al menos una Página.',
        no_instagram_account: 'Ninguna de tus páginas tiene una cuenta de Instagram Business vinculada.',
        missing_params: 'Parámetros faltantes en la respuesta de Facebook.',
        invalid_state: 'Estado de sesión inválido. Intenta de nuevo.',
      };
      setNotification({ type: 'error', message: friendlyErrors[metaError] || `Error: ${metaError}` });
      const url = new URL(window.location);
      url.searchParams.delete('meta_error');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams, refresh]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleConnectOAuth = async (channel) => {
    setConnectingChannel(channel);
    await connectChannel(channel);
    // Si llega aquí sin redirigir, algo falló
    setConnectingChannel(null);
  };

  const handleDisconnect = async (channel) => {
    const labels = { whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram' };
    if (!window.confirm(`¿Desconectar ${labels[channel]}? Los mensajes dejarán de llegar.`)) return;
    setDisconnectingChannel(channel);
    try {
      await disconnect(channel);
      setNotification({ type: 'success', message: `${labels[channel]} desconectado` });
    } catch {}
    setDisconnectingChannel(null);
  };

  // WhatsApp manual
  const handleWaTest = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      await saveConfig({
        whatsapp: { token: waForm.token, phoneNumberId: waForm.phoneNumberId },
        appSecret: waForm.appSecret || undefined,
      });
      const result = await testConnection('whatsapp');
      setWaTestResult(result);
    } catch {
      setWaTestResult({ connected: false, error: 'Error al probar conexión' });
    }
    setWaTesting(false);
  };

  const handleWaSave = async () => {
    setWaSaving(true);
    try {
      await saveConfig({
        whatsapp: { token: waForm.token, phoneNumberId: waForm.phoneNumberId },
        appSecret: waForm.appSecret || undefined,
      });
      setShowWhatsAppSetup(false);
      setNotification({ type: 'success', message: 'WhatsApp configurado correctamente' });
    } catch {}
    setWaSaving(false);
  };

  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    if (config.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (config.loading) {
    return (
      <div className="p-6 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(236, 72, 153, 0.03))', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50" />
          <div className="flex-1">
            <div className="h-5 w-40 bg-slate-800/50 rounded mb-2" />
            <div className="h-4 w-56 bg-slate-800/50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isAnyConnected = config.whatsapp?.enabled || config.whatsapp?.hasToken || config.messenger?.enabled || config.instagram?.enabled;
  const connectedCount = [
    config.messenger?.enabled || config.messenger?.hasToken,
    config.instagram?.enabled || config.instagram?.hasToken,
    config.whatsapp?.enabled || config.whatsapp?.hasToken,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10, 10, 15, 0.9), rgba(15, 15, 24, 0.95))', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER with gradient */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative p-5" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(236, 72, 153, 0.05))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <svg className="w-7 h-7 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              {isAnyConnected && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Meta Business</h3>
              <p className="text-sm text-slate-400">WhatsApp, Messenger e Instagram</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAnyConnected && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {connectedCount}/3 canales
              </div>
            )}
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              isAnyConnected 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
              {isAnyConnected ? 'Activo' : 'No conectado'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        {/* Notification */}
        {notification && (
          <div className={`mt-4 p-3.5 rounded-xl flex items-start justify-between gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-start gap-2">
              {notification.type === 'success' 
                ? <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                : <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              }
              <p className={`text-sm ${notification.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                {notification.message}
              </p>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-1">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error del hook */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={clearError} className="text-red-400 hover:text-red-300 p-1">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-500 mt-4 mb-5">
          Conecta tus canales de Meta para responder mensajes automáticamente con IA.
        </p>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHANNELS */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 mb-5">
          <ChannelCard
            channel="messenger"
            connected={config.messenger?.enabled || config.messenger?.hasToken}
            detail={config.messenger?.pageName || config.messenger?.pageId || null}
            onConnect={() => handleConnectOAuth('messenger')}
            onDisconnect={() => handleDisconnect('messenger')}
            connecting={connectingChannel === 'messenger'}
          />

          <ChannelCard
            channel="instagram"
            connected={config.instagram?.enabled || config.instagram?.hasToken}
            detail={config.instagram?.username ? `@${config.instagram.username}` : null}
            onConnect={() => handleConnectOAuth('instagram')}
            onDisconnect={() => handleDisconnect('instagram')}
            connecting={connectingChannel === 'instagram'}
          />

          <ChannelCard
            channel="whatsapp"
            connected={config.whatsapp?.enabled || config.whatsapp?.hasToken}
            detail={config.whatsapp?.phoneNumberId ? `ID: ${config.whatsapp.phoneNumberId}` : null}
            onConnect={() => setShowWhatsAppSetup(true)}
            onDisconnect={() => handleDisconnect('whatsapp')}
            connecting={false}
            onConfigure={(config.whatsapp?.enabled || config.whatsapp?.hasToken) ? () => setShowWhatsAppSetup(true) : undefined}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* AGENT SELECTOR */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {isAnyConnected && agents.length > 0 && (
          <div className="mb-5 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Agente para canales externos</p>
                <p className="text-xs text-slate-500 mt-0.5">Este agente responderá los mensajes de Messenger, Instagram y WhatsApp</p>
              </div>
            </div>
            <select
              value={config.defaultAgentId || ''}
              onChange={async (e) => {
                const val = e.target.value || null;
                setSavingAgent(true);
                try {
                  await saveConfig({ defaultAgentId: val });
                  setNotification({ type: 'success', message: val ? `Agente "${agents.find(a => a._id === val)?.name}" asignado` : 'Agente desvinculado' });
                } catch {}
                setSavingAgent(false);
              }}
              disabled={savingAgent}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer"
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <option value="">Automático (primer agente activo)</option>
              {agents.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* WHATSAPP SETUP */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {showWhatsAppSetup && (
          <div className="mb-5 p-5 rounded-xl space-y-4" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(16, 185, 129, 0.04))', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="w-5 h-5 text-green-400" />
                <p className="text-sm font-semibold text-white">Configurar WhatsApp Cloud API</p>
              </div>
              <button onClick={() => setShowWhatsAppSetup(false)} className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">WhatsApp Token (Cloud API)</label>
                <input
                  type="password"
                  value={waForm.token}
                  onChange={(e) => setWaForm({ ...waForm, token: e.target.value })}
                  placeholder="EAAxxxxxxx..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number ID</label>
                <input
                  type="text"
                  value={waForm.phoneNumberId}
                  onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">App Secret (opcional)</label>
                <input
                  type="password"
                  value={waForm.appSecret}
                  onChange={(e) => setWaForm({ ...waForm, appSecret: e.target.value })}
                  placeholder="abc123..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            </div>

            {waTestResult && (
              <div className={`p-3.5 rounded-xl text-sm flex items-center gap-2 ${
                waTestResult.connected 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {waTestResult.connected 
                  ? <CheckCircleIcon className="w-5 h-5 shrink-0" />
                  : <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                }
                {waTestResult.connected
                  ? `Conexión exitosa — ${waTestResult.displayName || waTestResult.phoneNumber}`
                  : waTestResult.error || 'No se pudo conectar'}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleWaTest}
                disabled={waTesting || !waForm.token || !waForm.phoneNumberId}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {waTesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Probando...
                  </span>
                ) : 'Probar conexión'}
              </button>
              <button
                onClick={handleWaSave}
                disabled={waSaving || !waForm.token || !waForm.phoneNumberId}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50"
              >
                {waSaving ? 'Guardando...' : 'Guardar y activar'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* WEBHOOK URL */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {isAnyConnected && config.webhookUrl && (
          <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <p className="text-xs font-medium text-slate-400 mb-2">URL del Webhook (configura en Meta Dashboard):</p>
            <div className="relative">
              <div 
                className="p-3.5 pr-24 rounded-xl text-xs text-slate-300 overflow-x-auto font-mono"
                style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                {config.webhookUrl}
              </div>
              <button
                onClick={copyUrl}
                className={`absolute top-1/2 -translate-y-1/2 right-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  copied 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* INSTRUCTIONS */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {!isAnyConnected && (
          <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <InformationCircleIcon className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-semibold text-blue-400">¿Cómo funciona?</p>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
                <span className="text-slate-400"><strong className="text-slate-300">Messenger / Instagram:</strong> Haz clic en "Conectar" e inicia sesión con Facebook. Se conectará con tu Página automáticamente.</span>
              </li>
              <li className="flex items-start gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
                <span className="text-slate-400"><strong className="text-slate-300">WhatsApp:</strong> Requiere configuración manual con los tokens de la API Cloud de WhatsApp.</span>
              </li>
              <li className="flex items-start gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
                <span className="text-slate-400">Los mensajes entrantes se procesan con IA y flujos automáticos.</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PAGE SELECTOR MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showPageSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f0f18, #0a0a0f)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                pageSelectChannel === 'instagram' 
                  ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' 
                  : 'bg-blue-500/20'
              }`}>
                {pageSelectChannel === 'instagram'
                  ? <InstagramIcon className="w-7 h-7 text-pink-400" />
                  : <MessengerIcon className="w-7 h-7 text-blue-400" />}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Selecciona una página
              </h3>
              <p className="text-sm text-zinc-400 mb-5">
                Tienes varias páginas de Facebook. Elige cuál conectar para {pageSelectChannel === 'instagram' ? 'Instagram' : 'Messenger'}.
              </p>

              {loadingPages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availablePages.map((page) => (
                    <button
                      key={page.id}
                      disabled={selectingPage === page.id}
                      onClick={async () => {
                        setSelectingPage(page.id);
                        try {
                          await choosePage(pageSelectChannel, page.id);
                          setShowPageSelector(false);
                          setNotification({ type: 'success', message: `${page.name} conectada exitosamente` });
                        } catch {
                          setNotification({ type: 'error', message: 'Error al seleccionar página' });
                        }
                        setSelectingPage(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">{'\uD83D\uDCC4'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{page.name}</p>
                        {page.igUsername && (
                          <p className="text-xs text-zinc-500">@{page.igUsername}</p>
                        )}
                      </div>
                      {selectingPage === page.id ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowPageSelector(false)}
                className="mt-4 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
