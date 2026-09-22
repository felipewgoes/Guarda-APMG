import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NavigationDrawer, ActiveModule, SubfunctionId } from './components/NavigationDrawer';
import { ModulePortariaView } from './components/ModulePortariaView';
import { ModuleCadastroView } from './components/ModuleCadastroView';
import { ModuleGestaoView } from './components/ModuleGestaoView';
import { BottomNavBar } from './components/BottomNavBar';
import { MilitaryPopUpToast } from './components/MilitaryPopUpToast';
import { PhotoModal } from './components/PhotoModal';
import { PermissionsModal } from './components/PermissionsModal';
import { VehicleEntry, RegisteredVehicle, AppTab, PopUpToastState } from './types';
import { INITIAL_ENTRIES, INITIAL_REGISTERED_VEHICLES } from './data/mockVehicles';
import { generateGuardCompositePhoto } from './utils/compositePhotoGenerator';
import { downloadOrShareOfficialPdf } from './utils/officialPdfGenerator';

export default function App() {
  // Estado dos 3 MÓDULOS PRINCIPAIS
  const [activeModule, setActiveModule] = useState<ActiveModule>('modulo_portaria');

  // Subfunção ativa / expandida alvo (ao clicar via Navigation Drawer)
  const [targetSubfunction, setTargetSubfunction] = useState<SubfunctionId | undefined>('leitura_camera');

  // Estado do Menu Lateral / Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Modal de Permissões Nativas (Aberto na inicialização se ainda não concedidas)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(() => {
    try {
      const permCamera = localStorage.getItem('apmg_perm_camera');
      const permStorage = localStorage.getItem('apmg_perm_storage');
      return !(permCamera === 'granted' && permStorage === 'granted');
    } catch {
      return true;
    }
  });

  // Placa pré-preenchida para redirecionamento rápido ao cadastro
  const [redirectPrefillPlate, setRedirectPrefillPlate] = useState<string>('');

  // Toast Flutuante Militar (2.5s)
  const [currentToast, setCurrentToast] = useState<PopUpToastState | null>(null);

  // Lista de Entradas (Livro de Muro da Guarda)
  const [entries, setEntries] = useState<VehicleEntry[]>(() => {
    try {
      const saved = localStorage.getItem('quartel_vehicle_entries');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load entries from localStorage', e);
    }
    return INITIAL_ENTRIES;
  });

  // Frota e Efetivo Militar Cadastrado
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('quartel_registered_vehicles');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load fleet from localStorage', e);
    }
    return INITIAL_REGISTERED_VEHICLES;
  });

  // Sentinela de Serviço e Posto da Guarda
  const [currentSentry, setCurrentSentry] = useState<string>(() => {
    return localStorage.getItem('quartel_sentry') || 'Cb. Moreira / Sd. Rocha';
  });
  const [currentPost, setCurrentPost] = useState<string>(() => {
    return localStorage.getItem('quartel_post') || 'Portão Principal (Guarda das Armas)';
  });

  // Modal de visualização de foto pericial ampliada
  const [selectedPhotoEntry, setSelectedPhotoEntry] = useState<VehicleEntry | null>(null);

  // Sincronização com o localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quartel_vehicle_entries', JSON.stringify(entries));
    } catch (e) {
      console.warn('Sync entries error', e);
    }
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem('quartel_registered_vehicles', JSON.stringify(registeredVehicles));
    } catch (e) {
      console.warn('Sync fleet error', e);
    }
  }, [registeredVehicles]);

  // Salvar nova entrada
  const handleSaveEntry = (newEntry: VehicleEntry) => {
    setEntries((prev) => [newEntry, ...prev]);

    fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    }).catch((err) => console.warn('Server sync tick:', err));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    fetch(`/api/entries/${id}`, { method: 'DELETE' }).catch((err) => console.warn(err));
  };

  // Subfunção de Registro de Saída / Liberação de Pátio
  const handleRegisterExit = (entryId: string, exitTime: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              exitTime,
              status: 'saida_liberada',
              notes: `${e.notes || ''} • Saída registrada às ${exitTime}`.trim(),
            }
          : e
      )
    );
  };

  // Salvar Cadastro de Militar da APMG ou Outra OPM
  const handleSaveMilitaryVehicle = async (
    newVeh: RegisteredVehicle,
    registerImmediateEntry?: boolean
  ) => {
    setRegisteredVehicles((prev) => [newVeh, ...prev.filter((v) => v.plate !== newVeh.plate)]);

    const divFormatted = newVeh.division
      ? newVeh.division === 'Outra OPM'
        ? `${newVeh.otherOpm || 'Outra OPM'}`
        : `${newVeh.division} / APMG`
      : 'APMG';

    if (registerImmediateEntry) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let compositeUrl: string | undefined = undefined;
      try {
        compositeUrl = await generateGuardCompositePhoto({
          platePhotoUrl: newVeh.photoUrl,
          driverPhotoUrl: newVeh.photoUrl,
          plate: newVeh.plate,
          dateTimeStr: `${dateStr} - ${timeStr}`,
          guardPost: currentPost,
          driverName: newVeh.ownerName,
          rankOrDoc: newVeh.rankOrDoc,
          warName: newVeh.warName,
          division: divFormatted,
          vehicleDescription: `${newVeh.brand} ${newVeh.model} (${newVeh.color})`.trim(),
          statusText: 'ENTRADA REGISTRADA',
          sentryName: currentSentry,
        });
      } catch (err) {
        console.warn('Erro ao gerar foto composta militar:', err);
      }

      const newEntry: VehicleEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        plate: newVeh.plate,
        plateFormat: /^[A-Z]{3}[0-9][A-Z]/.test(newVeh.plate.replace('-', '')) ? 'mercosul' : 'antiga',
        fontPattern: /^[A-Z]{3}[0-9][A-Z]/.test(newVeh.plate.replace('-', '')) ? 'MERCOSUL' : 'ANTIGO_BRASIL',
        vehicleType: newVeh.vehicleType,
        brand: newVeh.brand,
        model: newVeh.model,
        color: newVeh.color,
        entryDateTime: now.toISOString(),
        entryDateFormatted: dateStr,
        entryTimeFormatted: timeStr,
        photoBase64: newVeh.photoUrl,
        compositePhotoUrl: compositeUrl,
        driverPhotoUrl: newVeh.photoUrl,
        inputMethod: 'manual',
        driverName: newVeh.ownerName,
        driverType: 'militar',
        rankOrDoc: newVeh.rankOrDoc,
        warName: newVeh.warName,
        division: newVeh.division,
        otherOpm: newVeh.otherOpm,
        destination: newVeh.destination || divFormatted,
        purpose: 'expediente',
        guardPost: currentPost,
        sentryName: currentSentry,
        status: 'autorizado',
        notes: `Cadastro Militar Portaria APMG • ${divFormatted}`,
        createdAt: Date.now(),
      };
      handleSaveEntry(newEntry);
    }

    setCurrentToast({
      id: `${Date.now()}`,
      type: 'green',
      title: `${newVeh.rankOrDoc} ${newVeh.warName || newVeh.ownerName}`,
      subtitle: `Placa ${newVeh.plate} cadastrada e entrada autorizada!`,
      plate: newVeh.plate,
      durationMs: 2500,
      personPhotoUrl: newVeh.photoUrl,
      rankOrDoc: newVeh.rankOrDoc,
      warName: newVeh.warName || newVeh.ownerName,
      division: divFormatted,
      statusText: 'ENTRADA REGISTRADA',
      vehicleInfo: `${newVeh.brand || ''} ${newVeh.model || ''} (${newVeh.color || ''})`.trim(),
      entryTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    setRedirectPrefillPlate('');
    setActiveModule('modulo_portaria');
    setTargetSubfunction('leitura_camera');
  };

  // Salvar Cadastro de Visitante & Civil
  const handleRegisterCivilEntry = async (newEntry: VehicleEntry) => {
    let compositeUrl: string | undefined = undefined;
    try {
      compositeUrl = await generateGuardCompositePhoto({
        platePhotoUrl: newEntry.driverPhotoUrl || newEntry.photoBase64,
        driverPhotoUrl: newEntry.driverPhotoUrl,
        plate: newEntry.plate,
        dateTimeStr: `${newEntry.entryDateFormatted} - ${newEntry.entryTimeFormatted}`,
        guardPost: currentPost,
        driverName: newEntry.driverName,
        rankOrDoc: 'Visitante',
        warName: newEntry.warName || newEntry.driverName,
        division: 'Público Civil / Visitante',
        vehicleDescription: `${newEntry.brand} ${newEntry.model} (${newEntry.color})`.trim(),
        statusText: 'ENTRADA REGISTRADA',
        sentryName: currentSentry,
      });
    } catch (err) {
      console.warn('Erro ao gerar foto composta civil:', err);
    }

    const entryToSave = {
      ...newEntry,
      compositePhotoUrl: compositeUrl,
    };

    handleSaveEntry(entryToSave);

    setCurrentToast({
      id: `${Date.now()}`,
      type: 'green',
      title: `Visitante ${newEntry.driverName}`,
      subtitle: `Placa ${newEntry.plate} • Destino: ${newEntry.destination}`,
      plate: newEntry.plate,
      durationMs: 2500,
      personPhotoUrl: newEntry.driverPhotoUrl || newEntry.photoBase64,
      rankOrDoc: 'Visitante Civil',
      warName: newEntry.warName || newEntry.driverName,
      division: 'Visitante Civil',
      statusText: 'ENTRADA REGISTRADA',
      vehicleInfo: `${newEntry.brand || ''} ${newEntry.model || ''} (${newEntry.color || ''})`.trim(),
      entryTime: newEntry.entryTimeFormatted,
    });

    setRedirectPrefillPlate('');
    setActiveModule('modulo_portaria');
    setTargetSubfunction('leitura_camera');
  };

  // Navegação disparada a partir do Alerta Vermelho ou botões de cadastro
  const handleRedirectToCadastroMilitar = (plate?: string) => {
    if (plate) setRedirectPrefillPlate(plate);
    setCurrentToast(null);
    setActiveModule('modulo_cadastro');
    setTargetSubfunction('cadastro_militar');
  };

  const handleRedirectToCadastroCivil = (plate?: string) => {
    if (plate) setRedirectPrefillPlate(plate);
    setCurrentToast(null);
    setActiveModule('modulo_cadastro');
    setTargetSubfunction('cadastro_civil');
  };

  // Navegação genérica compatível com AppTab
  const handleNavigateToTab = (tab: AppTab, plate?: string) => {
    if (plate) setRedirectPrefillPlate(plate);
    if (tab === 'leitura_rapida') {
      setActiveModule('modulo_portaria');
      setTargetSubfunction('leitura_camera');
    } else if (tab === 'cadastro_militar') {
      setActiveModule('modulo_cadastro');
      setTargetSubfunction('cadastro_militar');
    } else if (tab === 'cadastro_civil') {
      setActiveModule('modulo_cadastro');
      setTargetSubfunction('cadastro_civil');
    } else if (tab === 'historico_exportacao') {
      setActiveModule('modulo_gestao');
      setTargetSubfunction('livro_muro');
    }
  };

  const handleChangeSentry = (sentry: string, post: string) => {
    setCurrentSentry(sentry);
    setCurrentPost(post);
    localStorage.setItem('quartel_sentry', sentry);
    localStorage.setItem('quartel_post', post);
  };

  // Exportação rápida de PDF do cabeçalho
  const handleExportPdfOfficial = async () => {
    try {
      const today = new Date().toLocaleDateString('pt-BR');
      const officer = localStorage.getItem('apmg_officer_on_duty') || 'Cap. QOPM Silva';
      await downloadOrShareOfficialPdf({
        entries,
        shiftStartDateTime: `${today} - 07:00`,
        shiftEndDateTime: `${today} - 19:00`,
        guardPost: currentPost,
        sentryName: currentSentry,
        officerOnDuty: officer,
      });
    } catch (err: any) {
      alert('Erro ao gerar relatório PDF oficial: ' + err.message);
    }
  };

  // Exportação Excel rápida do cabeçalho
  const handleExportExcelTrigger = () => {
    setActiveModule('modulo_gestao');
    setTargetSubfunction('livro_muro');
    setTimeout(() => {
      const btn = document.getElementById('export-excel-btn');
      if (btn) btn.click();
    }, 150);
  };

  // Contadores para o Navigation Drawer
  const yardCount = entries.filter((e) => !e.exitTime).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 sm:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Pop-up Flutuante Militar (2.5s) */}
      <MilitaryPopUpToast
        toast={currentToast}
        onDismiss={() => setCurrentToast(null)}
        onSelectMilitar={handleRedirectToCadastroMilitar}
        onSelectCivil={handleRedirectToCadastroCivil}
        onOpenManualInput={() => {
          setCurrentToast(null);
          setActiveModule('modulo_portaria');
          setTargetSubfunction('lancamento_manual');
        }}
      />

      {/* Menu Lateral Tático (Navigation Drawer / Dashboard Lateral) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeModule={activeModule}
        onSelectModule={(mod, sub) => {
          setActiveModule(mod);
          if (sub) setTargetSubfunction(sub);
        }}
        currentSentry={currentSentry}
        currentPost={currentPost}
        entriesCount={entries.length}
        yardCount={yardCount}
        alertsCount={3}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
      />

      {/* Tela de Verificação e Solicitação de Permissões Nativas do Celular */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onAllGranted={() => setIsPermissionsModalOpen(false)}
        onDismiss={() => setIsPermissionsModalOpen(false)}
      />

      {/* Cabeçalho Oficial Militar */}
      <Header
        entries={entries}
        currentSentry={currentSentry}
        currentPost={currentPost}
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          setTargetSubfunction(undefined);
        }}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onChangeSentry={handleChangeSentry}
        onExportExcel={handleExportExcelTrigger}
        onExportPdf={handleExportPdfOfficial}
      />

      {/* Espaço Principal de Trabalho: EXATAMENTE OS 3 MÓDULOS PRINCIPAIS COM CARDS RETRÁTEIS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* ========================================================
            MÓDULO 1: "CONTROLE DE ACESSO (PORTARIA)"
           ======================================================== */}
        {activeModule === 'modulo_portaria' && (
          <section id="modulo-1-portaria" aria-label="Módulo 1: Controle de Acesso (Portaria)">
            <ModulePortariaView
              isActive={activeModule === 'modulo_portaria'}
              registeredVehicles={registeredVehicles}
              currentSentry={currentSentry}
              currentPost={currentPost}
              entries={entries}
              onSaveEntry={handleSaveEntry}
              onShowPopUp={(toast) => setCurrentToast(toast)}
              onNavigateToTab={handleNavigateToTab}
              onRegisterExit={handleRegisterExit}
              targetSubfunction={targetSubfunction}
            />
          </section>
        )}

        {/* ========================================================
            MÓDULO 2: "CADASTRO & TRIAGEM DE EFETIVO/CIVIL"
           ======================================================== */}
        {activeModule === 'modulo_cadastro' && (
          <section id="modulo-2-cadastro" aria-label="Módulo 2: Cadastro & Triagem de Efetivo/Civil">
            <ModuleCadastroView
              initialPlate={redirectPrefillPlate}
              currentSentry={currentSentry}
              currentPost={currentPost}
              onSaveMilitaryVehicle={handleSaveMilitaryVehicle}
              onRegisterCivilEntry={handleRegisterCivilEntry}
              onCancel={() => {
                setRedirectPrefillPlate('');
                setActiveModule('modulo_portaria');
                setTargetSubfunction('leitura_camera');
              }}
              targetSubfunction={targetSubfunction}
            />
          </section>
        )}

        {/* ========================================================
            MÓDULO 3: "GESTÃO DO SERVIÇO & RELATÓRIOS"
           ======================================================== */}
        {activeModule === 'modulo_gestao' && (
          <section id="modulo-3-gestao" aria-label="Módulo 3: Gestão do Serviço & Relatórios">
            <ModuleGestaoView
              entries={entries}
              currentSentry={currentSentry}
              currentPost={currentPost}
              onSelectPhoto={(entry) => setSelectedPhotoEntry(entry)}
              onDeleteEntry={handleDeleteEntry}
              onChangeSentry={handleChangeSentry}
              onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
              targetSubfunction={targetSubfunction}
            />
          </section>
        )}
      </main>

      {/* Barra de Navegação Inferior para Smartphones */}
      <BottomNavBar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          setTargetSubfunction(undefined);
        }}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        entriesCount={entries.length}
      />

      {/* Modal de Exibição de Foto Pericial */}
      <PhotoModal
        entry={selectedPhotoEntry}
        onClose={() => setSelectedPhotoEntry(null)}
      />
    </div>
  );
}
