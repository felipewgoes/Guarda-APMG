import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickScannerView } from './components/QuickScannerView';
import { MilitaryRegistrationView } from './components/MilitaryRegistrationView';
import { CivilRegistrationView } from './components/CivilRegistrationView';
import { HistoryExportView } from './components/HistoryExportView';
import { BottomNavBar } from './components/BottomNavBar';
import { MilitaryPopUpToast } from './components/MilitaryPopUpToast';
import { PhotoModal } from './components/PhotoModal';
import { VehicleEntry, RegisteredVehicle, AppTab, PopUpToastState } from './types';
import { INITIAL_ENTRIES, INITIAL_REGISTERED_VEHICLES } from './data/mockVehicles';
import { generateGuardCompositePhoto } from './utils/compositePhotoGenerator';

export default function App() {
  // Active tab state: 4 tabs as specified by the user
  const [activeTab, setActiveTab] = useState<AppTab>('leitura_rapida');

  // Pre-filled plate for quick registration redirection
  const [redirectPrefillPlate, setRedirectPrefillPlate] = useState<string>('');

  // Float Pop-up state (2.5s timer)
  const [currentToast, setCurrentToast] = useState<PopUpToastState | null>(null);

  // Vehicle entries list (Shift log) with persistent storage
  const [entries, setEntries] = useState<VehicleEntry[]>(() => {
    try {
      const saved = localStorage.getItem('quartel_vehicle_entries');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load entries from localStorage', e);
    }
    return INITIAL_ENTRIES;
  });

  // Registered Military & Fleet database with persistence
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('quartel_registered_vehicles');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load fleet from localStorage', e);
    }
    return INITIAL_REGISTERED_VEHICLES;
  });

  // Active Sentry and Guard Post
  const [currentSentry, setCurrentSentry] = useState<string>(() => {
    return localStorage.getItem('quartel_sentry') || 'Cb. Moreira / Sd. Rocha';
  });
  const [currentPost, setCurrentPost] = useState<string>(() => {
    return localStorage.getItem('quartel_post') || 'Portão Principal (Guarda das Armas)';
  });

  // Photo viewer modal
  const [selectedPhotoEntry, setSelectedPhotoEntry] = useState<VehicleEntry | null>(null);

  // Sync entries to local storage
  useEffect(() => {
    try {
      localStorage.setItem('quartel_vehicle_entries', JSON.stringify(entries));
    } catch (e) {
      console.warn('Sync entries error', e);
    }
  }, [entries]);

  // Sync registered fleet to local storage
  useEffect(() => {
    try {
      localStorage.setItem('quartel_registered_vehicles', JSON.stringify(registeredVehicles));
    } catch (e) {
      console.warn('Sync fleet error', e);
    }
  }, [registeredVehicles]);

  // Handle new entry recorded (via camera AI or manual entry)
  const handleSaveEntry = (newEntry: VehicleEntry) => {
    setEntries((prev) => [newEntry, ...prev]);

    // Async sync to server
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

  // ABA 2 Action: Save Military Vehicle to Base with APMG sub-units & composite photo
  const handleSaveMilitaryVehicle = async (
    newVeh: RegisteredVehicle,
    registerImmediateEntry?: boolean
  ) => {
    setRegisteredVehicles((prev) => [newVeh, ...prev.filter((v) => v.plate !== newVeh.plate)]);

    const divFormatted = newVeh.division
      ? (newVeh.division === 'Outra OPM' ? `${newVeh.otherOpm || 'Outra OPM'}` : `${newVeh.division} / APMG`)
      : 'APMG';

    if (registerImmediateEntry) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Gera foto de registro da guarda composta (com carimbo e PiP do militar)
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

    // Trigger Green Pop-up notification with photo and 2.5s auto-dismiss
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

    // Return to quick scanning immediately for high operational agility
    setRedirectPrefillPlate('');
    setActiveTab('leitura_rapida');
  };

  // ABA 3 Action: Register Civil / Visitor Entry with Composite Photo
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

    // Trigger Green Pop-up notification with 2.5s dismiss
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

    // Return to quick scanning immediately
    setRedirectPrefillPlate('');
    setActiveTab('leitura_rapida');
  };

  // Redirection when Red Pop-up is clicked or operator chooses to register
  const handleRedirectToCadastroMilitar = (plate?: string) => {
    if (plate) {
      setRedirectPrefillPlate(plate);
    }
    setCurrentToast(null);
    setActiveTab('cadastro_militar');
  };

  const handleRedirectToCadastroCivil = (plate?: string) => {
    if (plate) {
      setRedirectPrefillPlate(plate);
    }
    setCurrentToast(null);
    setActiveTab('cadastro_civil');
  };

  const handleChangeSentry = (sentry: string, post: string) => {
    setCurrentSentry(sentry);
    setCurrentPost(post);
    localStorage.setItem('quartel_sentry', sentry);
    localStorage.setItem('quartel_post', post);
  };

  // Trigger Excel export from header button
  const handleExportExcelTrigger = () => {
    if (activeTab !== 'historico_exportacao') {
      setActiveTab('historico_exportacao');
      setTimeout(() => {
        const btn = document.getElementById('export-excel-btn');
        if (btn) btn.click();
      }, 150);
    } else {
      const btn = document.getElementById('export-excel-btn');
      if (btn) btn.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 sm:pb-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 3s Auto-disappearing Floating Military Pop-up Toast (Green) or Alert (Red with direct buttons) */}
      <MilitaryPopUpToast
        toast={currentToast}
        onDismiss={() => setCurrentToast(null)}
        onSelectMilitar={handleRedirectToCadastroMilitar}
        onSelectCivil={handleRedirectToCadastroCivil}
        onOpenManualInput={() => {
          setCurrentToast(null);
          setActiveTab('leitura_rapida');
          setTimeout(() => {
            const manualBtn = document.getElementById('quick-manual-input-btn');
            if (manualBtn) manualBtn.click();
          }, 100);
        }}
      />

      {/* Top Header */}
      <Header
        entries={entries}
        currentSentry={currentSentry}
        currentPost={currentPost}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onChangeSentry={handleChangeSentry}
        onExportExcel={handleExportExcelTrigger}
      />

      {/* Main Workspace: 4 ABAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* ABA 1: LEITURA RÁPIDA (Tela Inicial de Operação - Câmera Automática com Ciclo de Vida) */}
        <section
          id="aba-1-leitura-rapida"
          aria-label="Aba 1: Leitura Rápida"
          className={activeTab === 'leitura_rapida' ? 'block' : 'hidden'}
        >
          <QuickScannerView
            isActive={activeTab === 'leitura_rapida'}
            registeredVehicles={registeredVehicles}
            currentSentry={currentSentry}
            currentPost={currentPost}
            onSaveEntry={handleSaveEntry}
            onShowPopUp={(toast) => setCurrentToast(toast)}
            onNavigateToTab={(tab, plate) => {
              if (plate) setRedirectPrefillPlate(plate);
              setActiveTab(tab);
            }}
          />
        </section>

        {/* ABA 2: CADASTRO MILITAR */}
        {activeTab === 'cadastro_militar' && (
          <section id="aba-2-cadastro-militar" aria-label="Aba 2: Cadastro Militar">
            <MilitaryRegistrationView
              initialPlate={redirectPrefillPlate}
              onSaveMilitaryVehicle={handleSaveMilitaryVehicle}
              onCancel={() => {
                setRedirectPrefillPlate('');
                setActiveTab('leitura_rapida');
              }}
            />
          </section>
        )}

        {/* ABA 3: CADASTRO CIVIL */}
        {activeTab === 'cadastro_civil' && (
          <section id="aba-3-cadastro-civil" aria-label="Aba 3: Cadastro Civil">
            <CivilRegistrationView
              initialPlate={redirectPrefillPlate}
              currentSentry={currentSentry}
              currentPost={currentPost}
              onRegisterCivilEntry={handleRegisterCivilEntry}
              onCancel={() => {
                setRedirectPrefillPlate('');
                setActiveTab('leitura_rapida');
              }}
            />
          </section>
        )}

        {/* ABA 4: HISTÓRICO & EXPORTAÇÃO */}
        {activeTab === 'historico_exportacao' && (
          <section id="aba-4-historico-exportacao" aria-label="Aba 4: Histórico & Exportação">
            <HistoryExportView
              entries={entries}
              onSelectPhoto={(entry) => setSelectedPhotoEntry(entry)}
              onDeleteEntry={handleDeleteEntry}
            />
          </section>
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar with 4 Operational Tabs */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        entriesCount={entries.length}
      />

      {/* Photo Preview Modal with Date/Time Watermark */}
      <PhotoModal
        entry={selectedPhotoEntry}
        onClose={() => setSelectedPhotoEntry(null)}
      />
    </div>
  );
}
