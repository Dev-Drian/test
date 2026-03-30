/**
 * ChannelBadge - Badge con icono y nombre del canal.
 * formatTimeAgo - Formatea una fecha ISO a texto relativo.
 */
import { CHANNEL_COLORS, CHANNEL_GRADIENTS, CHANNEL_ICONS } from './ChatConstants';

export function formatTimeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 45) return "ahora";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export default function ChannelBadge({ channel }) {
  const Icon = CHANNEL_ICONS[channel] || CHANNEL_ICONS.web;
  const gradient = CHANNEL_GRADIENTS[channel] || CHANNEL_GRADIENTS.web;
  const labels = { web: 'Web', telegram: 'Telegram', messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' };

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
      style={{ 
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        boxShadow: `0 2px 8px -2px ${gradient.shadow}`
      }}
    >
      <Icon className="w-3 h-3" />
      {labels[channel] || channel}
    </span>
  );
}
