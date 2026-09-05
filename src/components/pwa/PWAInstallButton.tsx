import React, { useState } from 'react';
import { usePWAInstall } from '../../utils/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'compact' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  // If already running as an installed PWA, hide or show installed badge
  if (isInstalled) {
    if (variant === 'drawer') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono-code">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>APP INSTALLED • STANDALONE READY</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 4000);
      }
    } else {
      // iOS or browser without direct prompt support: open step-by-step guidance
      setShowIOSModal(true);
    }
  };

  // Render variant styles
  const getButtonContent = () => {
    if (variant === 'hero') {
      return (
        <button
          id="pwa-hero-install-btn"
          onClick={handleClick}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-display font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all ${className}`}
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Install 24 Mobile App</span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          id="pwa-compact-install-btn"
          onClick={handleClick}
          title="Install 24 Web App"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono-code font-bold transition-colors ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      );
    }

    if (variant === 'drawer') {
      return (
        <button
          id="pwa-drawer-install-btn"
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-xl bg-stone-900 hover:bg-stone-850 border border-amber-500/30 text-stone-100 transition-colors ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white font-mono-code uppercase">Install 24 App</div>
              <div className="text-[11px] text-stone-400">Add to home screen for 1-tap ordering</div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 font-mono-code">INSTALL →</span>
        </button>
      );
    }

    // Default 'header'
    return (
      <button
        id="pwa-header-install-btn"
        onClick={handleClick}
        title="Install 24 Progressive Web App"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono-code font-bold transition-colors active:scale-95 ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  };

  return (
    <>
      {getButtonContent()}

      {/* Installed Toast Confirmation */}
      {installedNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-amber-500/60 text-stone-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-mono-code text-xs">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>24 installed successfully! Available on your Home Screen.</span>
        </div>
      )}

      {/* iOS / Manual Installation Instructions Modal */}
      {showIOSModal && (
        <div 
          id="ios-install-guide-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black text-sm">
                  24
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white uppercase">Install 24</h3>
                  <p className="text-[11px] font-mono-code text-stone-400">Manchester 24/7 Mobile Micro-Store</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className="text-stone-300">
                  Install 24 directly onto your iPhone or iPad home screen for full-screen access and offline emergency support:
                </p>

                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 space-y-2.5 font-mono-code">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                    <div className="flex items-center gap-1.5 text-stone-200">
                      <span>Tap the</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800 text-white font-bold">
                        <Share className="w-3.5 h-3.5 text-sky-400" /> Share
                      </span>
                      <span>button in Safari toolbar.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                    <div className="flex items-center gap-1.5 text-stone-200">
                      <span>Scroll down and select</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800 text-white font-bold">
                        <PlusSquare className="w-3.5 h-3.5 text-amber-400" /> Add to Home Screen
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-stone-200">Tap <strong>Add</strong> in the top-right corner.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className="text-stone-300">
                  To install 24 on your device:
                </p>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 space-y-2 font-mono-code">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Open browser menu (three dots icon <strong>⋮</strong>) and click <strong>&quot;Install 24&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono-code text-xs uppercase tracking-wider"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
