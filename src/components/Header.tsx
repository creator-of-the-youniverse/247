import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useStore, UserRole } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { UserProfileBadge } from './UserProfileBadge';
import { 
  Bike, 
  ShoppingBag, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  Menu, 
  X,
  Clock,
  LogIn,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const { 
    role, 
    setRole, 
    settings, 
    cartItemCount, 
    resetDemoState,
    activePass,
    loading 
  } = useStore();

  const { currentUser, profile, role: authRole, logout, isAuthenticated } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getStatusBadge = () => {
    switch (settings.service_status) {
      case 'ONLINE':
        return (
          <span id="service-status-online" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ONLINE 24/7</span>
          </span>
        );
      case 'LIMITED_SERVICE':
        return (
          <span id="service-status-limited" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/40 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>LIMITED</span>
          </span>
        );
      case 'WEATHER_HOLD':
        return (
          <span id="service-status-weather" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-500/40 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            <span>WEATHER HOLD</span>
          </span>
        );
      case 'EMERGENCY_HOLD':
      case 'OFFLINE':
      default:
        return (
          <span id="service-status-offline" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/40 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>STANDBY</span>
          </span>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/80 shadow-md">
        <div className="px-3 sm:px-6 h-16 max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Live Telemetry Title Section */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            {/* 24 Emblem Icon */}
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-black text-base sm:text-lg tracking-tight shadow-md font-display shrink-0 ring-1 ring-amber-400/50">
              24
            </div>

            {/* Title & Status Text Lockup */}
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-base sm:text-lg text-white tracking-wider leading-none truncate">
                  24
                </span>
                <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 bg-stone-900 text-stone-400 rounded font-mono-code border border-stone-800">
                  MHT-01
                </span>
              </div>

              {/* Sub-header Live Status */}
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono-code text-stone-400 leading-none">
                {settings.service_status === 'ONLINE' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>ONLINE 24/7</span>
                  </span>
                ) : settings.service_status === 'LIMITED_SERVICE' ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>LIMITED</span>
                  </span>
                ) : settings.service_status === 'WEATHER_HOLD' ? (
                  <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>WEATHER HOLD</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>STANDBY</span>
                  </span>
                )}
                <span className="text-stone-600">•</span>
                <span className="text-stone-400 truncate hidden xs:inline">Manchester, NH</span>
                <span className="text-stone-600 hidden md:inline">•</span>
                <span className="text-stone-400 hidden md:inline">≤{settings.target_delivery_minutes || 60}m</span>
                {activePass?.subscription_status === 'ACTIVE' && (
                  <>
                    <span className="text-stone-600 hidden sm:inline">•</span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-amber-300 font-bold">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Pass (${(activePass.credit_remaining || 0).toFixed(2)})</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center / Role Switcher Tabs (Tablet & Desktop) */}
          <div className="hidden md:flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 text-xs font-semibold">
            <button
              id="role-customer-tab"
              onClick={() => setRole('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                role === 'CUSTOMER' 
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm' 
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Customer Store
            </button>
            <button
              id="role-rider-tab"
              onClick={() => setRole('RIDER')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                role === 'RIDER' 
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm' 
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              Rider Cockpit
            </button>
            <button
              id="role-admin-tab"
              onClick={() => setRole('ADMIN')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                role === 'ADMIN' 
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm' 
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin OS
            </button>
          </div>

          {/* Right Actions: Sign In, Cart, Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active Pass Badge (Large screens) */}
            {activePass?.subscription_status === 'ACTIVE' && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-mono-code font-bold shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>PASS ACTIVE: ${(activePass.credit_remaining || 0).toFixed(2)}</span>
              </span>
            )}

            {/* Dynamic User Profile Badge & Profile Area */}
            <div id="header-profile-area" className="relative flex items-center shrink-0">
              <UserProfileBadge onOpenAuthModal={() => setAuthModalOpen(true)} />
            </div>

            {/* Install PWA Button Component (desktop/tablet header) */}
            <PWAInstallButton variant="header" className="hidden lg:flex" />

            {/* Demo Reset (desktop header; mobile has it in drawer) */}
            <button
              id="demo-reset-btn"
              onClick={resetDemoState}
              title="Reset Firestore with Seed Dataset"
              disabled={loading}
              className="hidden lg:flex h-10 w-10 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-amber-400 border border-stone-800 items-center justify-center transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Cart button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              id="cart-trigger-btn"
              onClick={onOpenCart}
              className="relative h-10 px-3 sm:px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all shrink-0"
              title="Open Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline font-mono-code text-xs font-black">CART</span>
              {cartItemCount > 0 && (
                <span
                  id="cart-item-count-badge"
                  className="bg-stone-950 text-amber-400 text-[11px] px-1.5 py-0.5 rounded-full font-mono-code font-black border border-amber-400/40 shrink-0"
                >
                  {cartItemCount}
                </span>
              )}
            </motion.button>

            {/* Mobile hamburger for role switching & extra options */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden h-10 w-10 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-white border border-stone-800 flex items-center justify-center shrink-0 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown for Role Switching & Auth */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-stone-900 border-b border-stone-800 p-4 space-y-4 shadow-xl">
            {/* System Telemetry in Mobile Menu */}
            <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-stone-400">Service Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {settings.service_status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-stone-400">Delivery Target:</span>
                <span className="text-stone-200 font-bold">≤{settings.target_delivery_minutes || 60} Minutes</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-stone-400">Base Station:</span>
                <span className="text-amber-400 font-bold">Manchester, NH (MHT-01)</span>
              </div>
              {activePass?.subscription_status === 'ACTIVE' && (
                <div className="flex items-center justify-between text-xs font-mono-code pt-1 border-t border-stone-800">
                  <span className="text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Trader Pass:
                  </span>
                  <span className="text-amber-300 font-bold">
                    ${(activePass.credit_remaining || 0).toFixed(2)} Credit
                  </span>
                </div>
              )}
            </div>

            {/* PWA Install Drawer Tile in Mobile Menu */}
            <PWAInstallButton variant="drawer" />

            <div>
              <div className="text-xs font-mono-code text-stone-400 uppercase tracking-wider mb-2">
                Interface Mode:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setRole('CUSTOMER'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    role === 'CUSTOMER' 
                      ? 'bg-amber-500 text-stone-950 shadow' 
                      : 'bg-stone-950 text-stone-300 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Customer
                </button>
                <button
                  onClick={() => { setRole('RIDER'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    role === 'RIDER' 
                      ? 'bg-amber-500 text-stone-950 shadow' 
                      : 'bg-stone-950 text-stone-300 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  Rider
                </button>
                <button
                  onClick={() => { setRole('ADMIN'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    role === 'ADMIN' 
                      ? 'bg-amber-500 text-stone-950 shadow' 
                      : 'bg-stone-950 text-stone-300 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-stone-800 text-xs">
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 py-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out ({currentUser?.email?.split('@')[0]})
                </button>
              ) : (
                <button
                  onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 py-1"
                >
                  <LogIn className="w-4 h-4" /> Sign In / Create Account
                </button>
              )}
              <button
                onClick={() => { resetDemoState(); setMobileMenuOpen(false); }}
                className="text-stone-400 hover:text-stone-200 flex items-center gap-1.5 py-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Demo
              </button>
            </div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
};
