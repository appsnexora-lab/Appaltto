'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, X, Share2, MoreVertical } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const { theme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed or added to home screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalledSuccessfully(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  const renderCardContent = () => {
    if (installedSuccessfully) {
      return (
        <div
          className="p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all flex items-center justify-between gap-3 bg-white"
          style={{ borderColor: '#EEEAF3' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs flex items-center justify-center shrink-0 text-emerald-600">
              <Check className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm font-serif leading-tight text-emerald-800">
                Altto Adicionado com Sucesso!
              </h4>
              <p className="text-[11px] truncate mt-0.5" style={{ color: theme.colors.textMuted }}>
                O ícone já está disponível na tela inicial do seu celular.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isInstalled) {
      return (
        <div
          className="p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all flex items-center justify-between gap-3 bg-white"
          style={{ borderColor: '#EEEAF3' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-[#EDE9FE] shadow-2xs flex items-center justify-center shrink-0 p-1">
              <img
                src="/icons/icon-192.png"
                alt="Ícone Altto"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm font-serif leading-tight" style={{ color: theme.colors.text }}>
                  Altto Instalado no Celular
                </h4>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Ativo
                </span>
              </div>
              <p className="text-[11px] truncate mt-0.5" style={{ color: theme.colors.textMuted }}>
                Ícone oficial adicionado à tela inicial
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
          >
            Ver Dicas
          </button>
        </div>
      );
    }

    return (
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all flex items-center justify-between gap-3 bg-white"
        style={{ borderColor: '#EEEAF3' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* App Icon preview */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-[#EDE9FE] shadow-2xs flex items-center justify-center shrink-0 p-1">
            <img
              src="/icons/icon-192.png"
              alt="Ícone Altto"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs sm:text-sm font-serif leading-tight" style={{ color: theme.colors.text }}>
              Instalar Altto no Celular
            </h4>
            <p className="text-[11px] truncate mt-0.5" style={{ color: theme.colors.textMuted }}>
              Ícone oficial e abertura rápida na tela inicial
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: theme.colors.accent,
            color: '#FFFFFF',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{deferredPrompt ? 'Instalar' : 'Adicionar'}</span>
        </button>
      </div>
    );
  };

  return (
    <>
      {renderCardContent()}

      {/* Modal with Visual Step-by-Step Instructions */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: '#EEEAF3' }}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#EEEAF3] shadow-xs p-1">
                  <img src="/icons/icon-192.png" alt="Altto" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif" style={{ color: '#292633' }}>
                    Adicionar Altto à Tela Inicial
                  </h3>
                  <p className="text-xs" style={{ color: '#77717F' }}>
                    Atalho oficial e modo app standalone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <p style={{ color: '#292633' }}>
                Para ter o ícone oficial do <strong>Altto</strong> na tela inicial do seu celular Android ou iOS:
              </p>

              {/* Step 1 */}
              <div className="p-3 rounded-2xl border space-y-1" style={{ backgroundColor: '#F8F5FF', borderColor: '#EEEAF3' }}>
                <div className="flex items-center gap-2 font-bold" style={{ color: '#292633' }}>
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>No Chrome (Android):</span>
                </div>
                <p className="pl-7 text-[11px]" style={{ color: '#77717F' }}>
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-2xl border space-y-1" style={{ backgroundColor: '#F8F5FF', borderColor: '#EEEAF3' }}>
                <div className="flex items-center gap-2 font-bold" style={{ color: '#292633' }}>
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Escolha a opção:</span>
                </div>
                <p className="pl-7 text-[11px]" style={{ color: '#77717F' }}>
                  Toque em <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong> ou <strong>&ldquo;Instalar app&rdquo;</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-2xl border space-y-1" style={{ backgroundColor: '#F8F5FF', borderColor: '#EEEAF3' }}>
                <div className="flex items-center gap-2 font-bold" style={{ color: '#292633' }}>
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Confirme o atalho:</span>
                </div>
                <p className="pl-7 text-[11px]" style={{ color: '#77717F' }}>
                  O nome <strong>Altto</strong> e o <strong>ícone oficial em lilás</strong> surgirão na tela do seu telefone. Ao tocar, ele abre diretamente o app em tela inteira, preservando seus livros, leituras e dados offline!
                </p>
              </div>

              {/* iOS Note */}
              <div className="p-3 rounded-2xl border space-y-1" style={{ backgroundColor: '#FFFFFF', borderColor: '#EEEAF3' }}>
                <div className="flex items-center gap-2 font-semibold text-[11px]" style={{ color: '#77717F' }}>
                  <Share2 className="w-3.5 h-3.5 text-violet-500" />
                  <span>No Safari (iPhone/iPad): Toque no botão de Compartilhar e selecione &ldquo;Adicionar à Tela de Início&rdquo;.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl text-white font-bold text-xs transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
                style={{ backgroundColor: theme.colors.accent }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
