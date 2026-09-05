import React from 'react';
import { 
  Home, 
  ShoppingBag, 
  Clock, 
  Sparkles, 
  HeartHandshake, 
  UserCheck 
} from 'lucide-react';

export type CustomerTab = 'HOME' | 'SHOP' | 'ORDERS' | 'TRADER_PASS' | 'RESOURCES' | 'ACCOUNT';

interface BottomNavProps {
  currentTab: CustomerTab;
  onSelectTab: (tab: CustomerTab) => void;
  activeOrderCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, activeOrderCount = 0 }) => {
  const tabs: { id: CustomerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'HOME', label: 'HOME', icon: Home },
    { id: 'SHOP', label: 'SHOP', icon: ShoppingBag },
    { id: 'ORDERS', label: 'ORDERS', icon: Clock },
    { id: 'TRADER_PASS', label: 'PASS', icon: Sparkles },
    { id: 'RESOURCES', label: 'RESOURCES', icon: HeartHandshake },
    { id: 'ACCOUNT', label: 'ACCOUNT', icon: UserCheck }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-6 h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id.toLowerCase()}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.id === 'ORDERS' && activeOrderCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </div>
              <span className="text-[9px] tracking-wider font-mono-code mt-0.5 uppercase">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
