import React, { useState, useEffect } from 'react';
import { Camera, Keyboard, LogOut, Shield, Car, CheckCircle } from 'lucide-react';
import { AccordionCard } from './AccordionCard';
import { QuickScannerView } from './QuickScannerView';
import { QuickManualLaunchCard } from './QuickManualLaunchCard';
import { YardReleaseView } from './YardReleaseView';
import { VehicleEntry, RegisteredVehicle, PopUpToastState, AppTab } from '../types';

interface ModulePortariaViewProps {
  isActive: boolean;
  registeredVehicles: RegisteredVehicle[];
  currentSentry: string;
  currentPost: string;
  entries: VehicleEntry[];
  onSaveEntry: (entry: VehicleEntry) => void;
  onShowPopUp: (toast: PopUpToastState) => void;
  onNavigateToTab: (tab: AppTab, plate?: string) => void;
  onRegisterExit: (entryId: string, exitTime: string) => void;
  targetSubfunction?: string;
}

export const ModulePortariaView: React.FC<ModulePortariaViewProps> = ({
  isActive,
  registeredVehicles,
  currentSentry,
  currentPost,
  entries,
  onSaveEntry,
  onShowPopUp,
  onNavigateToTab,
  onRegisterExit,
  targetSubfunction,
}) => {
  // Controle de expansão de cada subfunção (acordeão sanfona)
  const [openScanner, setOpenScanner] = useState<boolean>(true);
  const [openManual, setOpenManual] = useState<boolean>(false);
  const [openYard, setOpenYard] = useState<boolean>(false);

  // Efeito ao navegar via Drawer para uma subfunção específica
  useEffect(() => {
    if (targetSubfunction === 'leitura_camera') {
      setOpenScanner(true);
      setOpenManual(false);
      setOpenYard(false);
    } else if (targetSubfunction === 'lancamento_manual') {
      setOpenScanner(false);
      setOpenManual(true);
      setOpenYard(false);
    } else if (targetSubfunction === 'liberacao_patio') {
      setOpenScanner(false);
      setOpenManual(false);
      setOpenYard(true);
    }
  }, [targetSubfunction]);

  // Contagem de veículos presentes no pátio
  const yardCount = entries.filter((e) => !e.exitTime).length;

  return (
    <div className="space-y-4">
      {/* Banner Hierárquico do MÓDULO 1 */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0F1E36] via-[#1B365D] to-[#0B1528] border border-[#2A4D7A] shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 shadow-md">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase">
                MÓDULO 1
              </span>
              <span className="text-[9px] bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                TEMPO REAL
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide font-mono-military">
              Controle de Acesso (Portaria)
            </h2>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Operação em tempo real no portão da guarda da Academia Policial Militar do Guatupê.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Pátio Ativo</div>
            <div className="text-xs sm:text-sm font-black text-amber-400 font-mono">
              {yardCount} veículos
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUBFUNÇÃO 1: Leitura Rápida de Placa (Câmera com OCR/Gemini)
         ======================================================== */}
      <AccordionCard
        id="portaria-leitura-rapida"
        title="1. Leitura Rápida de Placa (Câmera OCR / Gemini)"
        subtitle="Câmera automática com detecção de padrões Mercosul e Antigo (Cinza)"
        badge="AO VIVO"
        badgeColor="emerald"
        icon={<Camera className="h-5 w-5 text-emerald-400" />}
        isOpen={openScanner}
        onToggle={() => setOpenScanner(!openScanner)}
      >
        <QuickScannerView
          isActive={isActive && openScanner}
          registeredVehicles={registeredVehicles}
          currentSentry={currentSentry}
          currentPost={currentPost}
          onSaveEntry={onSaveEntry}
          onShowPopUp={onShowPopUp}
          onNavigateToTab={onNavigateToTab}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 2: Lançamento Manual de Veículo
         ======================================================== */}
      <AccordionCard
        id="portaria-lancamento-manual"
        title="2. Lançamento Manual de Veículo"
        subtitle="Entrada rápida por digitação direta de placa e busca instantânea na frota"
        badge="AGILIDADE"
        badgeColor="blue"
        icon={<Keyboard className="h-5 w-5 text-blue-400" />}
        isOpen={openManual}
        onToggle={() => setOpenManual(!openManual)}
      >
        <QuickManualLaunchCard
          registeredVehicles={registeredVehicles}
          currentSentry={currentSentry}
          currentPost={currentPost}
          onSaveEntry={onSaveEntry}
          onShowSuccess={(title, subtitle, plate) => {
            onShowPopUp({
              id: `${Date.now()}`,
              type: 'green',
              title,
              subtitle,
              plate,
              durationMs: 2500,
              statusText: 'ENTRADA REGISTRADA',
              entryTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            });
          }}
          onNavigateToRegister={(type, plate) => {
            if (type === 'militar') onNavigateToTab('cadastro_militar', plate);
            else onNavigateToTab('cadastro_civil', plate);
          }}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 3: Registro de Saída / Liberação de Pátio
         ======================================================== */}
      <AccordionCard
        id="portaria-liberacao-patio"
        title="3. Registro de Saída / Liberação de Pátio"
        subtitle="Controle de permanência no quartel e baixa de veículos no pátio interno"
        badge={`${yardCount} NO PÁTIO`}
        badgeColor="amber"
        icon={<LogOut className="h-5 w-5 text-amber-400" />}
        isOpen={openYard}
        onToggle={() => setOpenYard(!openYard)}
      >
        <YardReleaseView entries={entries} onRegisterExit={onRegisterExit} />
      </AccordionCard>
    </div>
  );
};
