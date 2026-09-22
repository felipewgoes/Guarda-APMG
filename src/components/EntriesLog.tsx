import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Eye,
  Camera,
  Calendar,
  Clock,
  Car,
  User,
  ShieldAlert,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { VehicleEntry, DriverType } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface EntriesLogProps {
  entries: VehicleEntry[];
  onSelectPhoto: (entry: VehicleEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export const EntriesLog: React.FC<EntriesLogProps> = ({
  entries,
  onSelectPhoto,
  onDeleteEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [copiedClipboard, setCopiedClipboard] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filter entries
  const filteredEntries = entries.filter((item) => {
    const matchesSearch =
      item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sentryName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'todos' ||
      (filterType === 'militar' && item.driverType === 'militar') ||
      (filterType === 'viatura' && item.vehicleType === 'Viatura Militar') ||
      (filterType === 'visitante' && item.driverType === 'visitante') ||
      (filterType === 'fornecedor' && item.driverType === 'fornecedor');

    return matchesSearch && matchesType;
  });

  // Direct CSV / Excel Export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: filteredEntries }),
      });

      if (!response.ok) throw new Error('Falha ao exportar planilha');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const todayStr = new Date().toISOString().slice(0, 10);
      a.download = `entradas_guarda_quartel_${todayStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.warn('Backend export fallback to client-side CSV generation:', err);
      // Client-side fallback export
      exportClientCSV(filteredEntries);
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side CSV generator fallback with UTF-8 BOM
  const exportClientCSV = (data: VehicleEntry[]) => {
    const headers = [
      'Data Entrada',
      'Hora Entrada',
      'Placa',
      'Tipo de Veículo',
      'Marca',
      'Modelo',
      'Cor',
      'Condutor / Motorista',
      'Categoria',
      'Posto / Graduação / Doc',
      'Destino / Seção',
      'Finalidade',
      'Sentinela de Serviço',
      'Posto da Guarda',
      'Método de Entrada',
      'Foto Anexada',
      'Observações',
    ].join(';');

    const rows = data.map((e) =>
      [
        `"${e.entryDateFormatted}"`,
        `"${e.entryTimeFormatted}"`,
        `"${e.plate}"`,
        `"${e.vehicleType}"`,
        `"${e.brand}"`,
        `"${e.model}"`,
        `"${e.color}"`,
        `"${e.driverName.replace(/"/g, '""')}"`,
        `"${e.driverType}"`,
        `"${e.rankOrDoc.replace(/"/g, '""')}"`,
        `"${e.destination.replace(/"/g, '""')}"`,
        `"${e.purpose}"`,
        `"${e.sentryName.replace(/"/g, '""')}"`,
        `"${e.guardPost.replace(/"/g, '""')}"`,
        `"${e.inputMethod === 'camera_ai' ? 'Câmera IA' : 'Manual'}"`,
        `"${e.photoBase64 ? 'Sim (Foto Salva)' : 'Não'}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(';')
    );

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const todayStr = new Date().toISOString().slice(0, 10);
    link.download = `entradas_guarda_quartel_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy as TSV (tab-separated) directly for pasting into Google Sheets or Excel
  const handleCopyToClipboard = async () => {
    const headers = [
      'Data',
      'Horário',
      'Placa',
      'Tipo',
      'Marca/Modelo',
      'Cor',
      'Condutor',
      'Posto/Doc',
      'Destino',
      'Finalidade',
      'Sentinela',
      'Foto',
    ].join('\t');

    const rows = filteredEntries.map((e) =>
      [
        e.entryDateFormatted,
        e.entryTimeFormatted,
        e.plate,
        e.vehicleType,
        `${e.brand} ${e.model}`.trim(),
        e.color,
        e.driverName,
        e.rankOrDoc,
        e.destination,
        e.purpose,
        e.sentryName,
        e.photoBase64 ? 'Anexada' : 'Sem foto',
      ].join('\t')
    );

    const tsvContent = [headers, ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Header Toolbar */}
      <div className="border-b border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono-military">
                Livro de Registro de Entradas ({filteredEntries.length})
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Histórico com foto da placa, horário do celular e dados do veículo
            </p>
          </div>

          {/* Export & Actions Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="copy-to-sheets-btn"
              type="button"
              onClick={handleCopyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
              title="Copia os dados formatados para colar direto no Google Sheets ou Excel"
            >
              {copiedClipboard ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiado para Área de Transferência!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copiar para Planilha</span>
                </>
              )}
            </button>

            <button
              id="export-spreadsheet-btn"
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || filteredEntries.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Gerando...' : 'Exportar Planilha (Excel / CSV)'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-800/80">
          <div className="sm:col-span-7 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="search-entries-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, condutor, destino ou sentinela..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-5 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-driver-type-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="todos">Todos os Acessos</option>
              <option value="militar">Apenas Militares</option>
              <option value="viatura">Viaturas Militares Oficiais</option>
              <option value="visitante">Apenas Visitantes</option>
              <option value="fornecedor">Apenas Fornecedores / Carga</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entries Table / List */}
      <div className="overflow-x-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Car className="mx-auto h-12 w-12 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Nenhum registro encontrado.</p>
            <p className="text-xs text-slate-500 mt-1">
              Capture a foto da placa acima ou digite manualmente para registrar uma nova entrada.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono-military">
              <tr>
                <th className="py-3 px-3.5">Foto Placa</th>
                <th className="py-3 px-3.5">Horário Entrada</th>
                <th className="py-3 px-3.5">Placa</th>
                <th className="py-3 px-3.5">Veículo</th>
                <th className="py-3 px-3.5">Condutor / Motorista</th>
                <th className="py-3 px-3.5">Destino / Finalidade</th>
                <th className="py-3 px-3.5">Sentinela</th>
                <th className="py-3 px-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  id={`entry-row-${entry.id}`}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Photo Thumbnail */}
                  <td className="py-2.5 px-3.5">
                    {entry.photoBase64 ? (
                      <button
                        type="button"
                        onClick={() => onSelectPhoto(entry)}
                        className="relative block h-10 w-16 overflow-hidden rounded border border-slate-700 bg-black group-hover:border-emerald-500/60 transition-colors"
                        title="Clique para ver a foto com carimbo de data e hora"
                      >
                        <img
                          src={entry.photoBase64}
                          alt={`Placa ${entry.plate}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ) : (
                      <div className="h-10 w-16 rounded border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center text-[9px] text-slate-500 text-center">
                        <span>Sem foto</span>
                      </div>
                    )}
                  </td>

                  {/* Device Entry Timestamp */}
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono-military font-semibold text-emerald-400 text-xs">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{entry.entryTimeFormatted}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{entry.entryDateFormatted}</span>
                    </div>
                  </td>

                  {/* Brazilian Plate Badge */}
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <BrazilianPlateBadge
                      plate={entry.plate}
                      format={entry.plateFormat}
                      size="sm"
                    />
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {entry.inputMethod === 'camera_ai' ? 'Captura IA' : 'Manual'}
                    </div>
                  </td>

                  {/* Vehicle Info */}
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-200">
                      {entry.brand} {entry.model}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
                      <span>{entry.color} • {entry.vehicleType}</span>
                    </div>
                  </td>

                  {/* Driver Info */}
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{entry.driverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {entry.rankOrDoc} •{' '}
                      <span
                        className={`inline-block font-semibold ${
                          entry.driverType === 'militar'
                            ? 'text-emerald-400'
                            : entry.driverType === 'fornecedor'
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {entry.driverType === 'militar'
                          ? 'Militar'
                          : entry.driverType === 'fornecedor'
                          ? 'Fornecedor'
                          : 'Visitante'}
                      </span>
                    </div>
                  </td>

                  {/* Destination & Purpose */}
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium text-slate-200">{entry.destination}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      Finalidade: {entry.purpose.replace('_', ' ')}
                    </div>
                  </td>

                  {/* Sentry on Duty */}
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="text-slate-300 font-medium">{entry.sentryName}</div>
                    <div className="text-[10px] text-slate-500">{entry.guardPost}</div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {entry.photoBase64 && (
                        <button
                          type="button"
                          onClick={() => onSelectPhoto(entry)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                          title="Visualizar foto da placa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja remover o registro da placa ${entry.plate}?`)) {
                            onDeleteEntry(entry.id);
                          }
                        }}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Spreadsheet Quick Info Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-3 font-mono-military">
          <span>Total: <strong className="text-slate-200">{entries.length}</strong></span>
          <span>•</span>
          <span>Com Foto da Placa: <strong className="text-emerald-400">{entries.filter((e) => e.photoBase64).length}</strong></span>
          <span>•</span>
          <span>Manual: <strong className="text-slate-300">{entries.filter((e) => !e.photoBase64).length}</strong></span>
        </div>

        <div className="text-[11px] text-slate-400">
          Formato Planilha: CSV (Padrão Excel Brasil) e Tabela Direta
        </div>
      </div>
    </div>
  );
};
