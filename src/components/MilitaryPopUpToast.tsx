import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, ShieldCheck, Users, X, User } from 'lucide-react';
import { PopUpToastState } from '../types';

interface MilitaryPopUpToastProps {
  toast: PopUpToastState | null;
  onDismiss: () => void;
  onSelectMilitar?: (plate?: string) => void;
  onSelectCivil?: (plate?: string) => void;
  onOpenManualInput?: () => void;
}

export const MilitaryPopUpToast: React.FC<MilitaryPopUpToastProps> = ({
  toast,
  onDismiss,
  onSelectMilitar,
  onSelectCivil,
  onOpenManualInput,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [toast?.id]);

  useEffect(() => {
    if (!toast) return;

    // CASO CADASTRADO: Desaparece automaticamente após 2,5 segundos (2500ms) sem travar a câmera
    // CASO NÃO CADASTRADO (Vermelho): Dá 15s para decisão ou fechamento manual
    const duration = toast.durationMs || (toast.type === 'green' ? 2500 : 15000);

    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isGreen = toast.type === 'green';
  const isRed = toast.type === 'red';
  const isYellow = toast.type === 'yellow';

  return (
    <div
      id="military-popup-container"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg pointer-events-auto transition-all animate-in fade-in slide-in-from-top-3 duration-200"
      role="alert"
    >
      {/* 1. CASO CADASTRADO: POP-UP FLUTUANTE E COMPACTO (CARD HUD VERDE) - 2.5s */}
      {isGreen && (
        <div
          id="registered-success-popup"
          className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 shadow-2xl border backdrop-blur-xl bg-slate-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/60 ring-1 ring-emerald-500/50"
        >
          {/* Animated Progress Countdown bar (2.5s) */}
          <div
            className="absolute top-0 left-0 h-1 bg-emerald-400"
            style={{ width: '100%', animation: 'shrinkWidth2500ms 2500ms linear forwards' }}
          />

          <div className="flex items-start gap-3 pt-1">
            {/* Foto Cadastrada do Militar / Civil */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-md flex items-center justify-center">
                {toast.personPhotoUrl && !imageError ? (
                  <img
                    src={toast.personPhotoUrl}
                    alt={toast.warName || 'Foto Cadastrada'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-950/70 text-emerald-300">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              {/* Ícone de Check Verde (✓) */}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow-md">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            {/* Informações de Reconhecimento */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Status "ENTRADA REGISTRADA" */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/50">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {toast.statusText || 'ENTRADA REGISTRADA'}
                </span>
                {toast.entryTime && (
                  <span className="text-[10px] font-mono text-emerald-400/90 font-bold">
                    {toast.entryTime}
                  </span>
                )}
              </div>

              {/* [Posto/Graduação], [Nome de Guerra], [Divisão/OPM] (ex: "Cap. Ribeiro - EsFO / APMG") */}
              <div className="mt-1 text-sm sm:text-base font-black text-white tracking-wide truncate">
                {toast.warName ? (
                  <>
                    <span className="text-emerald-400 font-extrabold">{toast.rankOrDoc}</span>{' '}
                    <span>{toast.warName}</span>
                    {toast.division && (
                      <span className="text-slate-300 font-medium text-xs sm:text-sm">
                        {' '}— {toast.division}
                      </span>
                    )}
                  </>
                ) : (
                  toast.title
                )}
              </div>

              {/* Placa e Veículo */}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {toast.plate && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono font-black text-xs tracking-wider shadow-inner">
                    {toast.plate}
                  </span>
                )}
                {toast.vehicleInfo && (
                  <span className="text-xs text-slate-300 truncate">
                    {toast.vehicleInfo}
                  </span>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              id="btn-close-green-toast"
              type="button"
              onClick={onDismiss}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar pop-up"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. CASO NÃO CADASTRADO: ALERTA EM DESTAQUE VERMELHO */}
      {isRed && (
        <div
          id="unregistered-alert-popup"
          className="relative overflow-hidden rounded-2xl p-4 shadow-2xl border-2 backdrop-blur-xl bg-slate-950/98 border-rose-500 text-rose-100 shadow-rose-950/80 ring-2 ring-rose-500/50 animate-bounce-subtle"
        >
          {/* Header Alerta */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-900/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg animate-pulse">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700/60">
                  ALERTA DE SEGURANÇA • APMG
                </span>
                <h4 className="text-base sm:text-lg font-black text-white tracking-wide uppercase leading-tight mt-0.5">
                  VEÍCULO / PESSOA NÃO CADASTRADA
                </h4>
              </div>
            </div>

            <button
              id="btn-close-red-toast"
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-950 transition-colors"
              aria-label="Fechar alerta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Placa Detectada */}
          <div className="py-2.5 flex items-center justify-between gap-2 flex-wrap bg-slate-900/80 rounded-xl px-3 my-2 border border-slate-800">
            <div className="text-xs text-slate-300">
              Placa capturada na portaria:
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded bg-black border-2 border-rose-500/80 text-rose-400 font-mono font-black text-sm tracking-widest shadow-inner">
              {toast.plate || 'NÃO IDENTIFICADA'}
            </div>
          </div>

          {/* Roteamento Imediato: [ MILITAR / EFETIVO ] vs [ CIVIL / VISITANTE ] */}
          <div className="pt-1">
            <p className="text-xs text-slate-300 mb-2 font-medium text-center">
              Selecione para direcionar ao cadastro imediato:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="btn-route-militar"
                type="button"
                onClick={() => onSelectMilitar && onSelectMilitar(toast.plate)}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>MILITAR / EFETIVO</span>
              </button>

              <button
                id="btn-route-civil"
                type="button"
                onClick={() => onSelectCivil && onSelectCivil(toast.plate)}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-950/60 border border-blue-400/40 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-blue-200" />
                <span>CIVIL / VISITANTE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FALHA NA LEITURA / AVISO (AMARELO) */}
      {isYellow && (
        <div
          id="warning-toast"
          className="relative overflow-hidden rounded-2xl p-3.5 shadow-2xl border backdrop-blur-xl bg-slate-950/95 border-amber-500 text-amber-100 shadow-amber-950/60"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {toast.title}
                </div>
                {toast.subtitle && (
                  <div className="text-xs text-amber-200/90 mt-0.5">
                    {toast.subtitle}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenManualInput && (
                <button
                  id="btn-open-manual-fallback"
                  type="button"
                  onClick={onOpenManualInput}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
                >
                  Digitar
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrinkWidth2500ms {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: subtleBounce 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
