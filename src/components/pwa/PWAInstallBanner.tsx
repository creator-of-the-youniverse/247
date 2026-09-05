import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Zap, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Sparkles,
  WifiOff
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return (window as any).deferredPWAInstallPrompt || (window as any).deferredPrompt || null;
    }
    return null;
  });

  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // 1. Detect environment and listen for beforeinstallprompt
  useEffect(() => {
    // Standalone detection
    const checkStandalone = () => {
      const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (window.navigator as any).standalone === true;
      const isTWA = document.referrer.includes('android-app://');
      const standaloneActive = isMediaStandalone || isNavStandalone || isTWA;
      setIsStandalone(standaloneActive);
      if (standaloneActive) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Listen for standalone display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // iOS Detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Check dismissal status from localStorage (dismiss for 48 hours)
    try {
      const dismissedAt = localStorage.getItem('t24_pwa_banner_dismissed_at');
      if (dismissedAt) {
        const diffHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (diffHours < 48) {
          setDismissed(true);
        }
      }
    } catch {
      // Ignore localStorage errors in private mode
    }

    // Check if prompt was pre-captured on window
    if ((window as any).deferredPWAInstallPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    // 2. Primary listener: beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      // Store event in window and component state
      (window as any).deferredPWAInstallPrompt = promptEvent;
      (window as any).deferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 3. App installed event listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  // Handle dismiss action
  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('t24_pwa_banner_dismissed_at', Date.now().toString());
    } catch {
      // Fallback
    }
  };

  // Handle installation action
  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        setInstalling(true);
        // Show native install prompt
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 5000);
        } else {
          // User chose not to install at this moment
          setDismissed(true);
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      // Open iOS installation modal walkthrough
      setShowIOSModal(true);
    } else {
      // Fallback manual modal
      setShowIOSModal(true);
    }
  }, [deferredPrompt, isIOS]);

  // Never render if running as standalone app or dismissed
  if (isStandalone || isInstalled || dismissed) {
    // If just installed and success toast is active, show confirmation
    if (showSuccessToast) {
      return (
        <div 
          id="pwa-installed-toast"
          className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-emerald-300 text-xs font-mono-code flex items-center justify-between animate-fadeIn z-30"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">24 is now installed on your device!</span>
              <span className="hidden sm:inline text-emerald-400/80">• Standalone 24/7 mobile access enabled</span>
            </div>
            <button 
              onClick={() => setShowSuccessToast(false)} 
              className="p-1 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  // Determine prompt availability
  const hasDirectPrompt = !!deferredPrompt;

  return (
    <>
      {/* ====================================================================
          MAIN ACTIONABLE PWA INSTALL BANNER
          ==================================================================== */}
      <section 
        id="pwa-install-banner" 
        role="region" 
        aria-label="Install 24 Progressive Web App"
        className="relative z-30 bg-stone-900 border-b border-amber-500/30 text-stone-100 shadow-xl"
      >
        {/* Subtle decorative top neon rule */}
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 opacity-80" />

        <div className="max-w-7xl mx-auto px-3.5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            
            {/* Left Column: Brand Icon & Compelling Value Proposition */}
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              {/* App Icon with industrial styling */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/10">
                  <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                    <span className="font-display font-black text-amber-400 text-sm tracking-tighter">
                      24
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-[9px] shadow">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>

              {/* Text & Capability Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                  <h2 className="font-display font-extrabold text-white text-xs sm:text-sm tracking-wide uppercase">
                    Install 24 App
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono-code text-[10px] font-bold tracking-wider uppercase whitespace-nowrap">
                    {hasDirectPrompt ? '1-Tap Install' : isIOS ? 'iOS Safari Ready' : 'Standalone PWA'}
                  </span>
                  <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-300 font-mono-code text-[10px] whitespace-nowrap">
                    <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                    <span>Offline Catalog</span>
                  </span>
                </div>

                <p className="text-stone-300 text-xs leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-1">
                  Add to your home screen for full-screen bicycle courier dispatch, zero browser address bar, and instant offline ordering.
                </p>

                {/* Micro-Features Row (Tablet & Desktop) */}
                <div className="hidden sm:flex items-center gap-3 mt-1 text-[11px] font-mono-code text-stone-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Instant Launch</span>
                  </span>
                  <span className="text-stone-700">•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Fast Local Sync</span>
                  </span>
                  <span className="text-stone-700">•</span>
                  <span>≤60 min Manchester Target</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Contrast Actions */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-stone-800/80">
              {/* Secondary Dismiss Button */}
              <button
                id="pwa-dismiss-btn"
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-xs font-mono-code transition-colors"
                title="Dismiss banner"
              >
                <span className="hidden sm:inline">Maybe Later</span>
                <span className="sm:hidden">Later</span>
              </button>

              {/* Primary Action Button */}
              <button
                id="pwa-install-action-btn"
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 active:to-amber-500 text-stone-950 font-mono-code font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
              >
                {installing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Installing...</span>
                  </>
                ) : hasDirectPrompt ? (
                  <>
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="whitespace-nowrap">Install App</span>
                  </>
                ) : isIOS ? (
                  <>
                    <Share className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="whitespace-nowrap">How to Install</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="whitespace-nowrap">Install PWA</span>
                  </>
                )}
              </button>

              {/* Close Icon Button */}
              <button
                id="pwa-close-icon-btn"
                type="button"
                onClick={handleDismiss}
                className="p-2 text-stone-500 hover:text-stone-300 rounded-lg hover:bg-stone-800 transition-colors"
                aria-label="Close install prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================================
          INTERACTIVE IOS / MANUAL INSTALLATION GUIDE MODAL
          ==================================================================== */}
      {showIOSModal && (
        <div 
          id="pwa-ios-guide-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-stone-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-display font-black text-sm shadow">
                  24
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wide">
                    Install 24
                  </h3>
                  <p className="text-[11px] font-mono-code text-stone-400">
                    Add to iPhone or iPad Home Screen
                  </p>
                </div>
              </div>
              <button
                id="pwa-ios-guide-close-btn"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step-by-step visual cards */}
            <div className="space-y-3 font-mono-code text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-white font-bold mb-1 flex items-center gap-1.5">
                    <span>Tap the Safari Share Icon</span>
                    <Share className="w-3.5 h-3.5 text-amber-400 inline" />
                  </p>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Look for the square share button with an arrow pointing up at the bottom (or top) of your Safari browser bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-white font-bold mb-1 flex items-center gap-1.5">
                    <span>Select &quot;Add to Home Screen&quot;</span>
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" />
                  </p>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Scroll down through the share options sheet and tap the &quot;Add to Home Screen&quot; button.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-white font-bold mb-1 flex items-center gap-1.5">
                    <span>Confirm &quot;Add&quot;</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                  </p>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Tap &quot;Add&quot; in the top-right corner. 24 will appear right on your home screen ready to launch in standalone mode!
                  </p>
                </div>
              </div>
            </div>

            {/* Standalone benefits reminder */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-stone-300 text-xs space-y-1">
              <div className="font-bold text-amber-400 font-mono-code text-[11px] uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Why Install as Standalone?</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-normal">
                Enjoy zero browser navigation clutter, faster response times, and target ≤60 min bicycle courier delivery with live status tracking.
              </p>
            </div>

            {/* Got It Button */}
            <button
              id="pwa-ios-guide-confirm-btn"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-mono-code font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
