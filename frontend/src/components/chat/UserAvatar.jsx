/**
 * UserAvatar - Avatar con indicador de canal, online y unread.
 */
import { CHANNEL_ICONS, CHANNEL_GRADIENTS } from './ChatConstants';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
};

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-indigo-500 to-blue-500',
];

export default function UserAvatar({ name, profilePic, size = 'md', channel, showOnline = false, unreadCount = 0, showChannelBadge = true }) {
  const initials = name 
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U';
  
  const colorIndex = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const ChannelIcon = channel && CHANNEL_ICONS[channel];
  const channelGradient = channel && CHANNEL_GRADIENTS[channel];

  return (
    <div className="relative">
      {profilePic ? (
        <img 
          src={profilePic} 
          alt={name} 
          className={`${SIZES[size]} rounded-full object-cover ring-2 ring-white/10`}
        />
      ) : (
        <div className={`${SIZES[size]} rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIndex]} flex items-center justify-center font-semibold text-white shadow-lg`}>
          {initials}
        </div>
      )}
      {showChannelBadge && ChannelIcon && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md"
          style={{ background: `linear-gradient(135deg, ${channelGradient?.from || '#6366f1'}, ${channelGradient?.to || '#4f46e5'})` }}
        >
          <ChannelIcon className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
      {showOnline && !ChannelIcon && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
      )}
    </div>
  );
}
