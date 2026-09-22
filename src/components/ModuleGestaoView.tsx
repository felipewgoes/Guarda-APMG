import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Settings, Shield, Clock } from 'lucide-react';
import { AccordionCard } from './AccordionCard';
import { HistoryExportView } from './HistoryExportView';
import { ShiftCloseoutView } from './ShiftCloseoutView';
import { SystemSettingsView } from './SystemSettingsView';
import { VehicleEntry } from '../types';

interface ModuleGestaoViewProps {
  entries: VehicleEntry[];
  currentSentry: string;
  currentPost: string;
  onSelectPhoto: (entry: VehicleEntry) => void;
  onDeleteEntry: (id: string) => void;
  onChangeSentry: (sentry: string, post: string) => void;
  onOpenPermissionsModal: () => void;
  targetSubfunction?: string;
}

export const ModuleGestaoView: React.FC<ModuleGestaoViewProps> = ({
  entries,
  currentSentry,
  currentPost,
  onSelectPhoto,
  onDeleteEntry,
  onChangeSentry,
  onOpenPermissionsModal,
  targetSubfunction,
}) => {
  // Controle de expansão de cada subfunção (acordeão sanfona)
  const [openLivro, setOpenLivro] = useState<boolean>(true);
  const [openPdf, setOpenPdf] = useState<boolean>(false);
  const [openConfig, setOpenConfig] = useState<boolean>(false);

  useEffect(() => {
    if (targetSubfunction === 'livro_muro') {
      setOpenLivro(true);
      setOpenPdf(false);
      setOpenConfig(false);
    } else if (targetSubfunction === 'fechamento_pdf') {
      setOpenLivro(false);
      setOpenPdf(true);
      setOpenConfig(false);
    } else if (targetSubfunction === 'configuracoes_permissoes') {
      setOpenLivro(false);
      setOpenPdf(false);
      setOpenConfig(true);
    }
  }, [targetSubfunction]);

  return (
    <div className="space-y-4">
      {/* Banner Hierárquico do MÓDULO 3 */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0F1E36] via-[#1B365D] to-[#0B1528] border border-[#2A4D7A] shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-400 shadow-md">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase">
                MÓDULO 3
              </span>
              <span className="text-[9px] bg-amber-950 border border-amber-500/40 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                ADMINISTRAÇÃO
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide font-mono-military">
              Gestão do Serviço & Relatórios
            </h2>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Controle administrativo do turno da guarda, livro de muro e exportação do relatório oficial da PMPR.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Registros</div>
            <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
              {entries.length} veículos
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUBFUNÇÃO 1: Livro de Muro / Histórico de Entradas do Dia
         ======================================================== */}
      <AccordionCard
        id="gestao-livro-muro"
        title="1. Livro de Muro / Histórico de Entradas do Dia"
        subtitle="Registro completo dos acessos com fotos periciais compostas, horários e filtros avançados"
        badge={`${entries.length} REGISTROS`}
        badgeColor="emerald"
        icon={<FileSpreadsheet className="h-5 w-5 text-emerald-400" />}
        isOpen={openLivro}
        onToggle={() => setOpenLivro(!openLivro)}
      >
        <HistoryExportView
          entries={entries}
          onSelectPhoto={onSelectPhoto}
          onDeleteEntry={onDeleteEntry}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 2: Fechamento de Turno & Exportação do Relatório Oficial em PDF
         ======================================================== */}
      <AccordionCard
        id="gestao-fechamento-pdf"
        title="2. Fechamento de Turno & Exportação do Relatório Oficial em PDF"
        subtitle="Layout oficial PMPR/APMG com brasão, tabela de acessos, estatísticas e assinatura do Oficial de Dia"
        badge="PDF OFICIAL"
        badgeColor="gold"
        icon={<FileText className="h-5 w-5 text-amber-400" />}
        isOpen={openPdf}
        onToggle={() => setOpenPdf(!openPdf)}
      >
        <ShiftCloseoutView
          entries={entries}
          currentSentry={currentSentry}
          currentPost={currentPost}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 3: Configurações do Sistema e Permissões do Celular
         ======================================================== */}
      <AccordionCard
        id="gestao-configuracoes-permissoes"
        title="3. Configurações do Sistema e Permissões do Celular"
        subtitle="Verificação de sensores de hardware (Câmera, Armazenamento, GPS), escala de sentinela e manutenção"
        badge="SISTEMA"
        badgeColor="blue"
        icon={<Settings className="h-5 w-5 text-blue-400" />}
        isOpen={openConfig}
        onToggle={() => setOpenConfig(!openConfig)}
      >
        <SystemSettingsView
          currentSentry={currentSentry}
          currentPost={currentPost}
          onChangeSentry={onChangeSentry}
          onOpenPermissionsModal={onOpenPermissionsModal}
        />
      </AccordionCard>
    </div>
  );
};
