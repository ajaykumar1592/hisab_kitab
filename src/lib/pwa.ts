// Type for BeforeInstallPromptEvent with proper userChoice return type
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: () => Promise<{ outcome: 'installed' | 'denied' }>;
}

// Extend global Window interface for the browser
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://com.hisabkitab');
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.log('Service Worker registration failed:', error);
    return null;
  }
};

export const getInstallPrompt = (): BeforeInstallPromptEvent | null => {
  return deferredPrompt;
};

export const setInstallPrompt = (event: BeforeInstallPromptEvent): void => {
  deferredPrompt = event;
};

export const clearInstallPrompt = (): void => {
  deferredPrompt = null;
};

export const installPWA = async (): Promise<boolean> => {
  if (deferredPrompt) {
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice();
    return result.outcome === 'installed';
  }
  return false;
};

export const canInstallPWA = (): boolean => {
  return deferredPrompt !== null;
};

export const isAppInstalled = (): boolean => {
  return isPWA();
};

export const initPWASupport = (): void => {
  if (typeof window === 'undefined') return;

  const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    setInstallPrompt(e);
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  const handleAppInstalled = () => {
    clearInstallPrompt();
    console.log('PWA installed');
  };

  window.addEventListener('appinstalled', handleAppInstalled);
};