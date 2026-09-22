import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Users, ShieldAlert } from 'lucide-react';
import { AccordionCard } from './AccordionCard';
import { MilitaryRegistrationView } from './MilitaryRegistrationView';
import { CivilRegistrationView } from './CivilRegistrationView';
import { SecurityAlertsView } from './SecurityAlertsView';
import { RegisteredVehicle, VehicleEntry } from '../types';

interface ModuleCadastroViewProps {
  initialPlate?: string;
  currentSentry: string;
  currentPost: string;
  onSaveMilitaryVehicle: (newVeh: RegisteredVehicle, registerImmediateEntry?: boolean) => void;
  onRegisterCivilEntry: (entry: VehicleEntry) => void;
  onCancel: () => void;
  targetSubfunction?: string;
}

export const ModuleCadastroView: React.FC<ModuleCadastroViewProps> = ({
  initialPlate,
  currentSentry,
  currentPost,
  onSaveMilitaryVehicle,
  onRegisterCivilEntry,
  onCancel,
  targetSubfunction,
}) => {
  // Controle de expansão de cada subfunção (acordeão sanfona)
  const [openMilitar, setOpenMilitar] = useState<boolean>(true);
  const [openCivil, setOpenCivil] = useState<boolean>(false);
  const [openAlerts, setOpenAlerts] = useState<boolean>(false);

  useEffect(() => {
    if (targetSubfunction === 'cadastro_militar') {
      setOpenMilitar(true);
      setOpenCivil(false);
      setOpenAlerts(false);
    } else if (targetSubfunction === 'cadastro_civil') {
      setOpenMilitar(false);
      setOpenCivil(true);
      setOpenAlerts(false);
    } else if (targetSubfunction === 'veiculos_suspeitos') {
      setOpenMilitar(false);
      setOpenCivil(false);
      setOpenAlerts(true);
    }
  }, [targetSubfunction]);

  return (
    <div className="space-y-4">
      {/* Banner Hierárquico do MÓDULO 2 */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0F1E36] via-[#1B365D] to-[#0B1528] border border-[#2A4D7A] shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950/90 border border-blue-500/50 text-blue-400 shadow-md">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-400 font-mono tracking-widest uppercase">
                MÓDULO 2
              </span>
              <span className="text-[9px] bg-blue-950 border border-blue-500/40 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                CADASTRO & TRIAGEM
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide font-mono-military">
              Cadastro & Triagem de Efetivo/Civil
            </h2>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Inclusão e consulta cadastral de condutores e veículos da APMG, outras OPMs e visitantes.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUBFUNÇÃO 1: Cadastro Militar APMG
         ======================================================== */}
      <AccordionCard
        id="cadastro-militar-apmg"
        title="1. Cadastro Militar APMG (EsFO, EsFAEP, ABM, Adm, SMB, SEF, Outras OPMs)"
        subtitle="Vínculo de posto/graduação, nome de guerra, subunidade da APMG e registro de foto"
        badge="EFETIVO MILITAR"
        badgeColor="emerald"
        icon={<Shield className="h-5 w-5 text-emerald-400" />}
        isOpen={openMilitar}
        onToggle={() => setOpenMilitar(!openMilitar)}
      >
        <MilitaryRegistrationView
          initialPlate={initialPlate}
          onSaveMilitaryVehicle={onSaveMilitaryVehicle}
          onCancel={onCancel}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 2: Cadastro de Visitantes & Civis
         ======================================================== */}
      <AccordionCard
        id="cadastro-visitantes-civis"
        title="2. Cadastro de Visitantes & Civis (Com Motivo da Vinda)"
        subtitle="Triagem de público externo, prestadores, fornecedores, motivo da visita e destino interno"
        badge="VISITANTES"
        badgeColor="blue"
        icon={<Users className="h-5 w-5 text-blue-400" />}
        isOpen={openCivil}
        onToggle={() => setOpenCivil(!openCivil)}
      >
        <CivilRegistrationView
          initialPlate={initialPlate}
          currentSentry={currentSentry}
          currentPost={currentPost}
          onRegisterCivilEntry={onRegisterCivilEntry}
          onCancel={onCancel}
        />
      </AccordionCard>

      {/* ========================================================
          SUBFUNÇÃO 3: Consulta de Veículos Suspeitos / Alertas de Segurança
         ======================================================== */}
      <AccordionCard
        id="cadastro-veiculos-suspeitos"
        title="3. Consulta de Veículos Suspeitos / Alertas de Segurança"
        subtitle="Checagem preventiva de placas sob monitoramento, alerta de furto/roubo COPOM e restrições"
        badge="SEGURANÇA"
        badgeColor="red"
        icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
        isOpen={openAlerts}
        onToggle={() => setOpenAlerts(!openAlerts)}
      >
        <SecurityAlertsView />
      </AccordionCard>
    </div>
  );
};
