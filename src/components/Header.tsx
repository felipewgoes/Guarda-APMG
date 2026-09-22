import React, { useState, useEffect } from 'react';
import { Shield, Clock, Car, Users, Truck, UserCheck, Settings, FileSpreadsheet, Camera } from 'lucide-react';
import { VehicleEntry, AppTab } from '../types';

interface HeaderProps {
  entries: VehicleEntry[];
  currentSentry: string;
  currentPost: string;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onChangeSentry: (sentry: string, post: string) => void;
  onExportExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  entries,
  currentSentry,
  currentPost,
  activeTab,
  onSelectTab,
  onChangeSentry,
  onExportExcel,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isEditingSentry, setIsEditingSentry] = useState<boolean>(false);
  const [sentryInput, setSentryInput] = useState<string>(currentSentry);
  const [postInput, setPostInput] = useState<string>(currentPost);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveSentry = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeSentry(sentryInput.trim() || currentSentry, postInput.trim() || currentPost);
    setIsEditingSentry(false);
  };

  // Metrics calculation
  const totalEntries = entries.length;
  const militaryEntries = entries.filter((e) => e.driverType === 'militar').length;
  const visitorsEntries = entries.filter((e) => e.driverType === 'visitante' || e.driverType === 'fornecedor').length;

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & APMG Military Quartel Identity */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-100 font-mono-military">
                  APMG • Guarda do Quartel
                </h1>
                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 font-mono-military">
                  PMPR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Academia Policial Militar do Guatupê • Controle de Acesso e Portaria
              </p>
            </div>
          </div>

          {/* Sentry on duty & Live Clock & Top Navigation */}
          <div className="flex items-center gap-2">
            {/* Live Clock HUD */}
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 shadow-sm">
              <Clock className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <div className="font-mono-military text-right">
                <div className="text-xs font-bold text-slate-100 tracking-wider">
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Current Sentry Widget */}
            <div className="relative">
              {!isEditingSentry ? (
                <button
                  id="sentry-info-btn"
                  type="button"
                  onClick={() => {
                    setSentryInput(currentSentry);
                    setPostInput(currentPost);
                    setIsEditingSentry(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-left hover:border-slate-700 transition-colors"
                  title="Alterar sentinela de serviço ou posto"
                >
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <div className="max-w-[130px] sm:max-w-[170px] truncate">
                    <div className="text-[9px] font-semibold uppercase text-slate-400 leading-tight">
                      {currentPost}
                    </div>
                    <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                      {currentSentry}
                    </div>
                  </div>
                  <Settings className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>
              ) : (
                <form
                  onSubmit={handleSaveSentry}
                  className="absolute right-0 top-0 z-40 flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl w-64"
                >
                  <div className="text-xs font-bold text-slate-200">Escala de Serviço</div>
                  <input
                    type="text"
                    value={postInput}
                    onChange={(e) => setPostInput(e.target.value)}
                    placeholder="Posto (Ex: Portão Principal)"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    value={sentryInput}
                    onChange={(e) => setSentryInput(e.target.value)}
                    placeholder="Sentinela (Ex: Cb. Moreira)"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingSentry(false)}
                      className="rounded px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Export Excel trigger in header */}
            <button
              id="header-export-excel-btn"
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors shadow-sm"
              title="Gerar e Baixar Relatório do Turno em Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Segmented Tabs (also synced with mobile bottom bar) */}
        <div className="hidden sm:flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSelectTab('leitura_rapida')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'leitura_rapida'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Aba 1: Leitura Rápida (Câmera)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cadastro_militar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'cadastro_militar'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Aba 2: Cadastro Militar</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cadastro_civil')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'cadastro_civil'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Aba 3: Cadastro Civil</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('historico_exportacao')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'historico_exportacao'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Aba 4: Histórico & Exportação ({totalEntries})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
