import { useState, useEffect, useCallback } from 'react';
import {
  isPWA,
  isIOS,
  getInstallPrompt,
  setInstallPrompt,
  clearInstallPrompt,
  installPWA,
  canInstallPWA,
  initPWASupport,
  BeforeInstallPromptEvent,
} from '@/lib/pwa';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOSDevice: boolean;
  promptInstall: () => Promise<boolean>;
  isSupported: boolean;
}

export function usePWA(): PWAState {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkInstallation = () => {
      setIsInstalled(isPWA());
      setIsInstallable(canInstallPWA());
      setIsIOSDevice(isIOS());
    };

    checkInstallation();

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      clearInstallPrompt();
    };

    if ('serviceWorker' in navigator) {
      setIsSupported(true);

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstallation);

      initPWASupport();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)')?.removeEventListener('change', checkInstallation);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const result = await installPWA();
    setIsInstallable(false);
    if (result) {
      setIsInstalled(true);
    }
    return result;
  }, []);

  return {
    isInstalled,
    isInstallable,
    isIOSDevice,
    promptInstall,
    isSupported,
  };
}