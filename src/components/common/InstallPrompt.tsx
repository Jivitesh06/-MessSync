import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Android/Desktop beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {/* Floating or Inline Install Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/90 rounded-2xl p-4 shadow-subtle flex items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chitkara text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              Install MessSync App
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Access Chitkara mess menu instantly, even without internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-chitkara text-white text-xs font-bold hover:bg-chitkara-dark shadow-2xs transition-colors active-press"
          >
            {isIOS ? 'How to Install' : 'Install'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-chitkara font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </span>
                <p>
                  Open <strong>MessSync</strong> in <strong>Safari</strong> on your iPhone.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-chitkara font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Tap the <strong>Share</strong> button</span>
                  <span className="p-1 rounded-md bg-slate-100 text-slate-800 inline-flex items-center">
                    <Share className="w-4 h-4 text-blue-600" />
                  </span>
                  <span>in the bottom browser bar.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-chitkara font-bold flex items-center justify-center text-xs shrink-0">
                  3
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                  <span className="p-1 rounded-md bg-slate-100 text-slate-800 inline-flex items-center">
                    <PlusSquare className="w-4 h-4 text-slate-700" />
                  </span>
                  <span>.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                  ✓
                </span>
                <p>
                  Tap <strong>Add</strong> at top right. MessSync will appear on your home screen like an app!
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
