import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const getInitialPrompt = (): BeforeInstallPromptEvent | null => {
    if (typeof window !== 'undefined') {
      return (window as any).deferredPWAInstallPrompt || (window as any).deferredPrompt || null;
    }
    return null;
  };

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(getInitialPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if prompt was captured prior to hook execution
    if ((window as any).deferredPWAInstallPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }
    // Detect standalone mode (already installed or running as standalone window)
    const checkStandalone = () => {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)');
      const isWindowStandalone = standaloneQuery.matches || (window.navigator as any).standalone === true;
      setIsStandalone(isWindowStandalone);
      if (isWindowStandalone) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Listen for display-mode changes
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

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Chromium, Android, Edge, Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
        return choice.outcome;
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
        return 'dismissed';
      }
    }
    return 'manual';
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: isInstalled || isStandalone,
    isStandalone,
    isIOS,
    canPrompt: !!deferredPrompt || (!isInstalled && isIOS),
    install
  };
}
