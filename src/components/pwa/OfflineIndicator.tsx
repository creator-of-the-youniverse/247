import React from 'react';
import { useOnlineStatus } from '../../utils/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      id="pwa-offline-indicator"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono-code font-bold shadow-xl border border-stone-950 animate-bounce"
    >
      <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
      <span>OFFLINE MODE — Local cache active</span>
    </div>
  );
};
