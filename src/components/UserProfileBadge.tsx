import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  LogIn, 
  LogOut, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  Bike, 
  ShoppingBag,
  User as UserIcon
} from 'lucide-react';

interface UserProfileBadgeProps {
  onOpenAuthModal: () => void;
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.includes('@')) {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function formatAbbreviatedName(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
    }
    return parts[0];
  }
  if (email && email.includes('@')) {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) {
      const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const second = parts[1].charAt(0).toUpperCase() + '.';
      return `${first} ${second}`;
    }
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return 'User';
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({ onOpenAuthModal }) => {
  const { currentUser, profile, role: authRole, logout, isAuthenticated } = useAuth();
  const { role: activeInterfaceRole, setRole: setInterfaceRole, activePass } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const initials = getInitials(profile?.display_name, currentUser?.email);
  const abbreviatedName = formatAbbreviatedName(profile?.display_name, currentUser?.email);

  const getRoleBadgeStyle = (userRole?: string) => {
    switch (userRole) {
      case 'ADMIN':
        return {
          dot: 'bg-purple-400',
          badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
          avatarBg: 'bg-purple-900/30 border-purple-500/40 text-purple-300'
        };
      case 'RIDER':
        return {
          dot: 'bg-amber-400',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          avatarBg: 'bg-amber-900/30 border-amber-500/40 text-amber-300'
        };
      default:
        return {
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          avatarBg: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'
        };
    }
  };

  const roleStyle = getRoleBadgeStyle(authRole);

  return (
    <div className="relative shrink-0">
      {isAuthenticated ? (
        <motion.div
          key="authenticated-badge"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center"
        >
          {/* Dynamic User Profile Trigger Button with Entry Glow */}
          <button
            ref={buttonRef}
            id="user-profile-badge-btn"
            onClick={handleToggleMenu}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label={`User account: ${abbreviatedName}`}
            className={`h-10 pl-1.5 pr-2.5 sm:pr-3 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-200 border transition-all flex items-center gap-2 shadow-sm shrink-0 select-none ${
              menuOpen 
                ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-stone-850' 
                : 'border-stone-800 hover:border-stone-700'
            }`}
          >
            {/* Avatar Pill with Initials */}
            <div className="relative shrink-0">
              <div 
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-code font-bold text-xs border shadow-inner ${roleStyle.avatarBg}`}
              >
                {initials}
              </div>
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-stone-950 ${roleStyle.dot}`}
                title={`Role: ${authRole}`}
              />
            </div>

            {/* Abbreviated Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="hidden xs:inline-block truncate text-stone-200 font-medium text-xs max-w-[80px] sm:max-w-[120px]">
                {abbreviatedName}
              </span>
              <ChevronDown 
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 shrink-0 ${
                  menuOpen ? 'rotate-180 text-amber-400' : ''
                }`} 
              />
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="unauthenticated-signin"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center"
        >
          {/* Space-Efficient Compact Sign In State */}
          <button
            id="header-sign-in-btn"
            onClick={onOpenAuthModal}
            title="Sign in to your 24 account"
            className="h-10 px-2.5 sm:px-3.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-200 hover:text-white border border-stone-800 hover:border-amber-500/50 text-xs font-semibold font-mono-code tracking-wide flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm shrink-0 whitespace-nowrap active:scale-95"
          >
            <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SIGN IN</span>
          </button>
        </motion.div>
      )}

      {/* Dynamic Popover Dropdown Card positioned safely within screen bounds */}
      {isAuthenticated && menuOpen && (
        <>
          {/* Invisible dismissal backdrop */}
          <div
            id="user-profile-backdrop"
            className="fixed inset-0 z-40 bg-stone-950/20 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none"
            onClick={() => setMenuOpen(false)}
          />

          <motion.div
            ref={dropdownRef}
            id="user-profile-dropdown"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed sm:absolute top-16 sm:top-full left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-72 max-w-[calc(100vw-24px)] bg-stone-900/98 backdrop-blur-md border border-stone-800 rounded-2xl shadow-2xl p-3 z-50 overflow-hidden origin-top-right"
          >
              {/* User Identity Header */}
              <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono-code font-extrabold text-sm border ${roleStyle.avatarBg}`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-stone-100 text-sm truncate leading-tight">
                        {profile?.display_name || 'Member'}
                      </p>
                      <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${roleStyle.badge}`}>
                        {authRole}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 font-mono-code truncate mt-0.5">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>

                {/* Trader Pass Status snippet */}
                {activePass?.subscription_status === 'ACTIVE' && (
                  <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Pass Credit:
                    </span>
                    <span className="font-mono-code font-bold text-amber-300">
                      ${(activePass.credit_remaining || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Switch Interface Mode */}
              <div className="mb-2">
                <div className="text-[10px] font-mono-code text-stone-400 uppercase tracking-wider px-2 py-1">
                  Active Cockpit View
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-stone-950/60 rounded-xl border border-stone-800/60">
                  <button
                    onClick={() => {
                      setInterfaceRole('CUSTOMER');
                      setMenuOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      activeInterfaceRole === 'CUSTOMER'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Switch to Customer Store"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Store</span>
                  </button>
                  <button
                    onClick={() => {
                      setInterfaceRole('RIDER');
                      setMenuOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      activeInterfaceRole === 'RIDER'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Switch to Rider Cockpit"
                  >
                    <Bike className="w-3 h-3" />
                    <span>Rider</span>
                  </button>
                  <button
                    onClick={() => {
                      setInterfaceRole('ADMIN');
                      setMenuOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      activeInterfaceRole === 'ADMIN'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Switch to Admin OS"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1 pt-1 border-t border-stone-800">
                <button
                  id="profile-manage-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-stone-400" />
                  <span>Account & Credentials</span>
                </button>

                <button
                  id="profile-logout-btn"
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
        </>
      )}
    </div>
  );
};
