import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  Car,
  Users,
  Truck,
  UserCheck,
  Settings,
  FileSpreadsheet,
  FileText,
  Camera,
  Menu,
  UserPlus,
} from 'lucide-react';
import { VehicleEntry } from '../types';
import { ActiveModule } from './NavigationDrawer';

interface HeaderProps {
  entries: VehicleEntry[];
  currentSentry: string;
  currentPost: string;
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenDrawer: () => void;
  onChangeSentry: (sentry: string, post: string) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  entries,
  currentSentry,
  currentPost,
  activeModule,
  onSelectModule,
  onOpenDrawer,
  onChangeSentry,
  onExportExcel,
  onExportPdf,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isEditingSentry, setIsEditingSentry] = useState<boolean>(false);
  const [sentryInput, setSentryInput] = useState<string>(currentSentry);
  const [postInput, setPostInput] = useState<string>(currentPost);

  // Relógio militar sincronizado
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

  const totalEntries = entries.length;

  return (
    <header className="border-b border-[#1B365D] bg-slate-950/95 backdrop-blur-md sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Menu Lateral Tático & Identidade Oficial da APMG */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão do Menu Lateral (Drawer) */}
            <button
              type="button"
              id="tactical-menu-drawer-btn"
              onClick={onOpenDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-[#0F1E36] to-[#1B365D] hover:from-[#1B365D] hover:to-[#2A4D7A] border border-[#2A4D7A] text-slate-100 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
              title="Abrir Dashboard Lateral dos 3 Módulos"
            >
              <Menu className="h-4 w-4 text-[#D4AF37]" />
              <span className="hidden sm:inline font-mono tracking-wider text-[11px] text-[#D4AF37]">
                MENU TÁTICO
              </span>
            </button>

            {/* Brasão & Título */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#0F1E36] border border-[#D4AF37]/50 text-[#D4AF37] shadow-md">
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
          </div>

          {/* HUD do Sentinela, Relógio e Ações Rápidas */}
          <div className="flex items-center gap-2">
            {/* Relógio HUD */}
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 shadow-sm">
              <Clock className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <div className="font-mono-military text-right">
                <div className="text-xs font-bold text-slate-100 tracking-wider">
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Widget do Sentinela */}
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
                  <div className="max-w-[110px] sm:max-w-[150px] truncate">
                    <div className="text-[9px] font-semibold uppercase text-slate-400 leading-tight truncate">
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

            {/* Botão de Exportação PDF Oficial */}
            <button
              id="header-export-pdf-btn"
              type="button"
              onClick={onExportPdf}
              className="flex items-center gap-1.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-blue-200 transition-colors shadow-sm cursor-pointer"
              title="Gerar e Baixar Relatório Oficial do Turno em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">PDF Oficial</span>
            </button>

            {/* Botão de Exportação Excel */}
            <button
              id="header-export-excel-btn"
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors shadow-sm cursor-pointer"
              title="Gerar e Baixar Relatório do Turno em Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Segmented Modules Selector (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSelectModule('modulo_portaria')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeModule === 'modulo_portaria'
                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Módulo 1: Controle de Acesso (Portaria)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('modulo_cadastro')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeModule === 'modulo_cadastro'
                ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Módulo 2: Cadastro & Triagem de Efetivo/Civil</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('modulo_gestao')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeModule === 'modulo_gestao'
                ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Módulo 3: Gestão do Serviço & Relatórios ({totalEntries})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
