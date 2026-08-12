'use client';

import { useEffect, useState } from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err);
          });
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('PWA installed successfully');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md border border-slate-700/80">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-100">Install Aplikasi KSP Mobile</p>
          <p className="text-[11px] text-slate-300 truncate">
            Akses cepat & lebih hemat kuota langsung dari layar HP kamu!
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1 rounded-lg px-2.5"
          >
            <Download className="h-3.5 w-3.5" /> Install
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowInstallBanner(false)}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
