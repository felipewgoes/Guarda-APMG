import React from 'react';
import {
  Shield,
  Camera,
  Keyboard,
  LogOut,
  UserPlus,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  Settings,
  X,
  ChevronRight,
  Clock,
  UserCheck,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export type ActiveModule = 'modulo_portaria' | 'modulo_cadastro' | 'modulo_gestao';

export type SubfunctionId =
  // Módulo 1
  | 'leitura_camera'
  | 'lancamento_manual'
  | 'liberacao_patio'
  // Módulo 2
  | 'cadastro_militar'
  | 'cadastro_civil'
  | 'veiculos_suspeitos'
  // Módulo 3
  | 'livro_muro'
  | 'fechamento_pdf'
  | 'configuracoes_permissoes';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule, subfunction?: SubfunctionId) => void;
  currentSentry: string;
  currentPost: string;
  entriesCount: number;
  yardCount: number;
  alertsCount: number;
  onOpenPermissions: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeModule,
  onSelectModule,
  currentSentry,
  currentPost,
  entriesCount,
  yardCount,
  alertsCount,
  onOpenPermissions,
}) => {
  if (!isOpen) return null;

  const handleSelect = (module: ActiveModule, subfunction?: SubfunctionId) => {
    onSelectModule(module, subfunction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop escuro com desfoque */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Lateral Tático */}
      <div className="relative w-full max-w-[340px] sm:max-w-sm bg-[#0B132B] text-slate-100 h-full shadow-2xl border-r border-[#1B365D] flex flex-col z-10 animate-in slide-in-from-left duration-300">
        {/* Cabeçalho Militar Oficial (Dark Navy Blue & Ouro) */}
        <div className="bg-gradient-to-br from-[#0F1E36] via-[#1B365D] to-[#0A192F] p-4 sm:p-5 border-b border-[#2A4D7A] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B132B] border border-[#D4AF37]/60 text-[#D4AF37] shadow-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#D4AF37] font-mono tracking-widest uppercase">
                  ESTADO DO PARANÁ • PMPR
                </div>
                <h2 className="text-sm font-black text-white tracking-wide uppercase font-mono-military">
                  Guarda APMG
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar menu lateral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cartão de Informação do Sentinela e Posto */}
          <div className="rounded-xl border border-[#2A4D7A] bg-[#0A192F]/90 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 truncate">
                  {currentPost}
                </div>
                <div className="text-xs font-bold text-slate-200 truncate">
                  {currentSentry}
                </div>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              EM SERVIÇO
            </span>
          </div>
        </div>

        {/* Corpo do Menu Lateral: EXATAMENTE 3 MÓDULOS PRINCIPAIS */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          <div className="text-[10px] font-black text-[#D4AF37] tracking-wider uppercase px-2 font-mono">
            Módulos da Guarda do Quartel
          </div>

          {/* ========================================================
              MÓDULO 1: CONTROLE DE ACESSO (PORTARIA)
             ======================================================== */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              activeModule === 'modulo_portaria'
                ? 'border-emerald-500/50 bg-[#0F223D]/90 shadow-lg ring-1 ring-emerald-500/30'
                : 'border-slate-800 bg-[#0B1528]/80 hover:border-slate-700'
            }`}
          >
            {/* Título do Módulo 1 */}
            <div
              onClick={() => handleSelect('modulo_portaria')}
              className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer border-b border-slate-800/80 bg-gradient-to-r from-[#0F1E36] to-transparent hover:bg-slate-800/40"
              role="button"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase font-mono tracking-wider">
                    MÓDULO 1
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                    Controle de Acesso (Portaria)
                  </h3>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  activeModule === 'modulo_portaria' ? 'text-emerald-400 rotate-90' : 'text-slate-500'
                }`}
              />
            </div>

            {/* Subfunções do Módulo 1 */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleSelect('modulo_portaria', 'leitura_camera')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Leitura Rápida (OCR/Gemini)</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  AO VIVO
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_portaria', 'lancamento_manual')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="h-3.5 w-3.5 text-blue-400" />
                  <span>Lançamento Manual de Veículo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_portaria', 'liberacao_patio')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5 text-amber-400" />
                  <span>Registro de Saída / Liberação</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {yardCount} no pátio
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================
              MÓDULO 2: CADASTRO & TRIAGEM DE EFETIVO/CIVIL
             ======================================================== */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              activeModule === 'modulo_cadastro'
                ? 'border-blue-500/50 bg-[#0F223D]/90 shadow-lg ring-1 ring-blue-500/30'
                : 'border-slate-800 bg-[#0B1528]/80 hover:border-slate-700'
            }`}
          >
            {/* Título do Módulo 2 */}
            <div
              onClick={() => handleSelect('modulo_cadastro')}
              className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer border-b border-slate-800/80 bg-gradient-to-r from-[#0F1E36] to-transparent hover:bg-slate-800/40"
              role="button"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950 border border-blue-500/40 text-blue-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-blue-400 uppercase font-mono tracking-wider">
                    MÓDULO 2
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                    Cadastro & Triagem de Efetivo/Civil
                  </h3>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  activeModule === 'modulo_cadastro' ? 'text-blue-400 rotate-90' : 'text-slate-500'
                }`}
              />
            </div>

            {/* Subfunções do Módulo 2 */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleSelect('modulo_cadastro', 'cadastro_militar')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Cadastro Militar APMG</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">EsFO/EsFAEP/ABM</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_cadastro', 'cadastro_civil')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <span>Visitantes & Civis (Com Motivo)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_cadastro', 'veiculos_suspeitos')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  <span>Veículos Suspeitos & Alertas</span>
                </div>
                {alertsCount > 0 && (
                  <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/30">
                    {alertsCount} alertas
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================
              MÓDULO 3: GESTÃO DO SERVIÇO & RELATÓRIOS
             ======================================================== */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              activeModule === 'modulo_gestao'
                ? 'border-amber-500/50 bg-[#0F223D]/90 shadow-lg ring-1 ring-amber-500/30'
                : 'border-slate-800 bg-[#0B1528]/80 hover:border-slate-700'
            }`}
          >
            {/* Título do Módulo 3 */}
            <div
              onClick={() => handleSelect('modulo_gestao')}
              className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer border-b border-slate-800/80 bg-gradient-to-r from-[#0F1E36] to-transparent hover:bg-slate-800/40"
              role="button"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950 border border-amber-500/40 text-amber-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-amber-400 uppercase font-mono tracking-wider">
                    MÓDULO 3
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                    Gestão do Serviço & Relatórios
                  </h3>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  activeModule === 'modulo_gestao' ? 'text-amber-400 rotate-90' : 'text-slate-500'
                }`}
              />
            </div>

            {/* Subfunções do Módulo 3 */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleSelect('modulo_gestao', 'livro_muro')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Livro de Muro / Histórico</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                  {entriesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_gestao', 'fechamento_pdf')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span>Fechamento & Relatório PDF</span>
                </div>
                <span className="text-[9px] font-mono text-[#D4AF37] font-bold">OFICIAL</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('modulo_gestao', 'configuracoes_permissoes')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Configurações & Permissões</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Tático do Drawer */}
        <div className="p-3 border-t border-[#1B365D] bg-[#0A192F] space-y-2">
          <button
            type="button"
            onClick={() => {
              onOpenPermissions();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-blue-500/40 bg-blue-950/40 hover:bg-blue-900/40 text-blue-200 text-xs font-bold transition-all shadow"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Permissões Nativas do Celular</span>
          </button>

          <div className="text-[9px] text-center text-slate-500 font-mono">
            APMG • PMPR • Guatupê / São José dos Pinhais
          </div>
        </div>
      </div>
    </div>
  );
};
