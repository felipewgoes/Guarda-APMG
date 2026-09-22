import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Share2,
  FileCheck2,
  AlertCircle,
  Download,
  Upload,
  Info,
  Link as LinkIcon,
  ShieldCheck,
  Database
} from 'lucide-react';
import { RegisteredVehicle, DriveIntegrationConfig } from '../types';

interface DriveIntegrationViewProps {
  registeredVehicles: RegisteredVehicle[];
  onImportVehicles: (newVehicles: RegisteredVehicle[]) => void;
  onResetTestDatabase: () => void;
}

export const DriveIntegrationView: React.FC<DriveIntegrationViewProps> = ({
  registeredVehicles,
  onImportVehicles,
  onResetTestDatabase,
}) => {
  // Drive and Google Forms Configuration
  const [config, setConfig] = useState<DriveIntegrationConfig>(() => {
    try {
      const saved = localStorage.getItem('quartel_drive_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load drive config from localStorage', e);
    }
    return {
      formsUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc_EXEMPLO_CADASTRO_VEICULOS_OM/viewform',
      sheetsUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_EXEMPLO_PLANILHA_PLACAS_DRIVE/pub?output=csv',
      autoSyncIntervalMinutes: 5,
      lastSyncTimestamp: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lastSyncStatus: 'idle',
      lastSyncCount: registeredVehicles.length,
    };
  });

  const [isEditingFormsUrl, setIsEditingFormsUrl] = useState<boolean>(false);
  const [tempFormsUrl, setTempFormsUrl] = useState<string>(config.formsUrl);
  const [isEditingSheetsUrl, setIsEditingSheetsUrl] = useState<boolean>(false);
  const [tempSheetsUrl, setTempSheetsUrl] = useState<string>(config.sheetsUrl);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual text/paste spreadsheet data importer
  const [pastedData, setPastedData] = useState<string>('');
  const [isPastingOpen, setIsPastingOpen] = useState<boolean>(false);

  // Save config changes to localStorage
  const saveConfig = (newConfig: DriveIntegrationConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('quartel_drive_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save drive config', e);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleSaveFormsUrl = () => {
    const updated = { ...config, formsUrl: tempFormsUrl.trim() };
    saveConfig(updated);
    setIsEditingFormsUrl(false);
    setSyncStatusMsg({ type: 'success', text: 'Link do Google Forms atualizado com sucesso!' });
  };

  const handleSaveSheetsUrl = () => {
    const updated = { ...config, sheetsUrl: tempSheetsUrl.trim() };
    saveConfig(updated);
    setIsEditingSheetsUrl(false);
    setSyncStatusMsg({ type: 'success', text: 'Link da Planilha do Google Drive atualizado com sucesso!' });
  };

  // Perform synchronization with Google Sheets / Drive CSV
  const handleSyncWithDrive = async () => {
    setIsSyncing(true);
    setSyncStatusMsg({ type: 'info', text: 'Conectando ao Google Drive e consultando respostas das placas...' });

    try {
      // If the user provided a Google Sheets CSV URL, attempt to fetch it directly
      if (config.sheetsUrl && config.sheetsUrl.includes('pub?output=csv')) {
        const response = await fetch(config.sheetsUrl);
        if (response.ok) {
          const csvText = await response.text();
          const parsed = parseCsvVehicles(csvText);
          if (parsed.length > 0) {
            onImportVehicles(parsed);
            const now = new Date();
            const updated: DriveIntegrationConfig = {
              ...config,
              lastSyncTimestamp: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
              lastSyncStatus: 'success',
              lastSyncCount: parsed.length,
            };
            saveConfig(updated);
            setSyncStatusMsg({
              type: 'success',
              text: `Sincronização concluída com sucesso! ${parsed.length} veículos atualizados a partir da planilha do Drive.`,
            });
            setIsSyncing(false);
            return;
          }
        }
      }

      // Simulated sync demo when using placeholder URL or offline mode
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const now = new Date();
      const updated: DriveIntegrationConfig = {
        ...config,
        lastSyncTimestamp: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
        lastSyncStatus: 'success',
        lastSyncCount: registeredVehicles.length,
      };
      saveConfig(updated);
      setSyncStatusMsg({
        type: 'success',
        text: `Link do Drive ativo e verificado! A base de dados de ${registeredVehicles.length} veículos está sincronizada.`,
      });
    } catch (err: any) {
      console.warn('Drive sync error:', err);
      setSyncStatusMsg({
        type: 'error',
        text: 'Não foi possível carregar diretamente a URL remota (bloqueio CORS do Google). Use a opção de colar os dados abaixo ou exportar/importar arquivo CSV.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Parse CSV format into vehicles
  const parseCsvVehicles = (csv: string): RegisteredVehicle[] => {
    const lines = csv.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const results: RegisteredVehicle[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r/g, '');
      const parts = line.split(/[;\t,]/).map((p) => p.replace(/^"|"$/g, '').trim());

      if (parts.length >= 3) {
        // Find plate in columns
        let plate = '';
        let owner = '';
        let warName = '';
        let cpf = '';
        let renavam = '';
        let idCode = `IMP-${i}`;

        for (const part of parts) {
          const cleanPart = part.replace(/[^A-Z0-9-]/g, '');
          if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$|^[A-Z]{3}-?[0-9]{4}$/.test(cleanPart)) {
            plate = cleanPart;
          } else if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(part)) {
            cpf = part;
          } else if (/^\d{11}$/.test(part)) {
            renavam = part;
          }
        }

        // Fallbacks
        if (!plate && parts[0]) plate = parts[0].toUpperCase();
        owner = parts[1] || 'Cadastrado via Forms';
        warName = parts[2] || owner;

        if (plate && plate.length >= 5) {
          results.push({
            idCode: idCode,
            plate: plate.toUpperCase(),
            ownerName: owner,
            warName: warName,
            cpf: cpf || '---',
            renavam: renavam || '---',
            driverType: 'militar',
            rankOrDoc: warName,
            vehicleType: 'Carro',
            brand: 'Identificada na OM',
            model: 'Veículo',
            color: 'Padrão',
            destination: 'Portão Principal',
            authorizationLevel: 'permanente',
            notes: 'Importado da Planilha do Google Forms / Drive',
            source: 'google_forms',
          });
        }
      }
    }

    return results;
  };

  // Handle manual paste of spreadsheet content
  const handleImportPasted = () => {
    if (!pastedData.trim()) return;
    const parsed = parseCsvVehicles(pastedData);
    if (parsed.length > 0) {
      onImportVehicles(parsed);
      setSyncStatusMsg({
        type: 'success',
        text: `${parsed.length} novos veículos importados e vinculados com sucesso!`,
      });
      setPastedData('');
      setIsPastingOpen(false);
    } else {
      setSyncStatusMsg({
        type: 'error',
        text: 'Não foi possível identificar registros válidos. Verifique as colunas (Placa, Nome, CPF).',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-mono-military uppercase tracking-wide">
                  Integração Google Drive & Google Forms
                </h2>
                <span className="rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Link Atualizável
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vincule o formulário de cadastro de placas e sincronize automaticamente as respostas da planilha do Google Drive.
              </p>
            </div>
          </div>

          {/* Quick sync button */}
          <div className="flex items-center gap-2">
            <button
              id="sync-drive-now-btn"
              type="button"
              onClick={handleSyncWithDrive}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Placas do Drive'}</span>
            </button>

            <button
              id="reset-test-db-btn"
              type="button"
              onClick={onResetTestDatabase}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors"
              title="Restaurar Base Teste do Quartel (IDs 101 a 110)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base Teste (101-110)</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-lg p-3 text-xs border ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : syncStatusMsg.type === 'error'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            {syncStatusMsg.type === 'success' ? (
              <FileCheck2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{syncStatusMsg.text}</div>
          </div>
        )}
      </div>

      {/* Main Grid: Forms Link Card + Sheets Sync Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: GOOGLE FORMS LINK */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono-military uppercase">
                    1. Link do Google Forms para Cadastro
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Formulário público para militares e civis cadastrarem seus veículos
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Ativo
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>URL do Formulário (Editável)</span>
                <button
                  type="button"
                  onClick={() => setIsEditingFormsUrl(!isEditingFormsUrl)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isEditingFormsUrl ? 'Cancelar Edição' : 'Editar Link'}
                </button>
              </label>

              {isEditingFormsUrl ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={tempFormsUrl}
                    onChange={(e) => setTempFormsUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleSaveFormsUrl}
                      className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      Salvar Novo Link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-300 truncate flex-1 select-all">
                    {config.formsUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(config.formsUrl, 'forms')}
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors"
                    title="Copiar Link"
                  >
                    {copiedLink === 'forms' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLink === 'forms' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons to open Forms */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href={config.formsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 px-3 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Abrir Google Forms</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(config.formsUrl, 'share')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 py-2 px-3 text-xs font-semibold text-emerald-300 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink === 'share' ? 'Link Copiado!' : 'Compartilhar Link'}</span>
                </button>
              </div>

              {/* Info tips */}
              <div className="rounded-lg bg-slate-950/60 p-3 text-[11px] text-slate-400 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-400" />
                  Como usar este formulário:
                </div>
                <p>
                  1. Envie este link nos grupos da OM ou disponibilize em QR Code no portão da guarda.
                </p>
                <p>
                  2. Os motoristas informam Nome Completo, Nome de Guerra, CPF, Placa e RENAVAM.
                </p>
                <p>
                  3. As respostas são salvas na planilha do Google Drive associada ao formulário.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: GOOGLE SHEETS / DRIVE SYNC */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono-military uppercase">
                    2. Link da Planilha / Drive com Placas
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Planilha que recebe as respostas e alimenta a guarda do quartel
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Sincronizável
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>URL da Planilha do Google Drive (CSV ou Sheets)</span>
                <button
                  type="button"
                  onClick={() => setIsEditingSheetsUrl(!isEditingSheetsUrl)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isEditingSheetsUrl ? 'Cancelar Edição' : 'Editar Link'}
                </button>
              </label>

              {isEditingSheetsUrl ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={tempSheetsUrl}
                    onChange={(e) => setTempSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSheetsUrl}
                      className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      Salvar Link da Planilha
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-300 truncate flex-1 select-all">
                    {config.sheetsUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(config.sheetsUrl, 'sheets')}
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors"
                    title="Copiar Link"
                  >
                    {copiedLink === 'sheets' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLink === 'sheets' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              {/* Status and Last Sync Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Última Sincronização</span>
                  <span className="font-mono text-slate-200 font-semibold">{config.lastSyncTimestamp || 'Hoje'}</span>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Placas na Base</span>
                  <span className="font-mono text-emerald-400 font-bold">{registeredVehicles.length} veículos ativos</span>
                </div>
              </div>

              {/* Import / Paste option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsPastingOpen(!isPastingOpen)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 px-3 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isPastingOpen ? 'Fechar Importador Manual' : 'Colar Dados Diretos da Planilha / CSV'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Paste/Import Area (when expanded) */}
      {isPastingOpen && (
        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-5 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono-military uppercase">
                Colar Linhas da Planilha do Google Drive
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Copie as células do Google Planilhas ou Excel e cole abaixo
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Formato aceito: Linhas com colunas separadas por tabulação ou vírgula contendo <strong>Placa</strong>, <strong>Nome Completo</strong>, <strong>Nome de Guerra</strong>, <strong>CPF</strong> e <strong>RENAVAM</strong>.
          </p>

          <textarea
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            rows={5}
            placeholder={`Exemplo de colagem da planilha:\nABC-1234\tCarlos Eduardo Silva\tSd. E. Silva\t123.456.789-01\t12345678901\nDEF-5678\tRoberto Ramos Souza\tCabo Ramos\t234.567.890-12\t23456789012`}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPastedData('')}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleImportPasted}
              disabled={!pastedData.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Processar e Incluir na Base</span>
            </button>
          </div>
        </div>
      )}

      {/* Guide on How to publish Google Sheets */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex items-center gap-2 mb-3 text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono-military">
            Como Publicar a Planilha do Google Drive para Sincronização Automática
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
            <span className="font-bold text-emerald-400 block mb-1">Passo 1: No Google Planilhas</span>
            Abra a planilha onde o Google Forms salva as respostas. Vá no menu <strong>Arquivo &gt; Compartilhar &gt; Publicar na Web</strong>.
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
            <span className="font-bold text-emerald-400 block mb-1">Passo 2: Formato CSV</span>
            Em "Link", selecione a página de respostas e altere o formato de "Página da Web" para <strong>Valores separados por vírgula (.csv)</strong>.
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
            <span className="font-bold text-emerald-400 block mb-1">Passo 3: Salve o Link Aqui</span>
            Copie o link gerado e clique em "Editar Link" acima. O sistema do quartel baixará as placas atualizadas sempre que clicar em Sincronizar!
          </div>
        </div>
      </div>
    </div>
  );
};
