import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Clock,
  Car,
  Shield,
  User,
  Trash2,
  Eye,
  Filter,
  Printer,
  Building2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { VehicleEntry } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface HistoryExportViewProps {
  entries: VehicleEntry[];
  onSelectPhoto: (entry: VehicleEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export const HistoryExportView: React.FC<HistoryExportViewProps> = ({
  entries,
  onSelectPhoto,
  onDeleteEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'last_hour' | 'morning' | 'afternoon' | 'night'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'militar' | 'visitante'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');

  // Filtragem
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return entries.filter((e) => {
      // Search term
      const search = searchTerm.toLowerCase();
      const matchSearch =
        e.plate.toLowerCase().includes(search) ||
        e.driverName.toLowerCase().includes(search) ||
        (e.warName && e.warName.toLowerCase().includes(search)) ||
        e.rankOrDoc.toLowerCase().includes(search) ||
        (e.division && e.division.toLowerCase().includes(search)) ||
        (e.destination && e.destination.toLowerCase().includes(search)) ||
        (e.model && e.model.toLowerCase().includes(search));

      if (!matchSearch) return false;

      // Type filter
      if (typeFilter !== 'all' && e.driverType !== typeFilter) {
        return false;
      }

      // Division filter
      if (divisionFilter !== 'all') {
        if (divisionFilter === 'Outra OPM') {
          if (e.division !== 'Outra OPM') return false;
        } else if (e.division !== divisionFilter) {
          return false;
        }
      }

      // Time filter
      if (timeFilter === 'all') return true;

      const entryDate = new Date(e.entryDateTime);
      if (isNaN(entryDate.getTime())) return true;

      if (timeFilter === 'last_hour') {
        return entryDate >= oneHourAgo;
      }

      const hour = entryDate.getHours();
      if (timeFilter === 'morning') {
        return hour >= 6 && hour < 12;
      }
      if (timeFilter === 'afternoon') {
        return hour >= 12 && hour < 18;
      }
      if (timeFilter === 'night') {
        return hour >= 18 || hour < 6;
      }

      return true;
    });
  }, [entries, searchTerm, timeFilter, typeFilter, divisionFilter]);

  // Exportação para Excel (.xlsx) com campos completos da APMG
  const handleExportToExcel = () => {
    if (entries.length === 0) {
      alert('Nenhum registro no histórico para exportar.');
      return;
    }

    const dataToExport = entries.map((entry, index) => {
      const isMilitar = entry.driverType === 'militar';
      const statusText = entry.status === 'bloqueado' ? 'BLOQUEADO' : 'AUTORIZADO';
      const hasPhoto = entry.compositePhotoUrl
        ? 'SIM (Foto Composta PiP)'
        : entry.photoBase64
        ? 'SIM (Foto Simples)'
        : 'NÃO';

      const divStr = entry.division
        ? (entry.division === 'Outra OPM' ? `${entry.otherOpm || 'Outra OPM'}` : `${entry.division} / APMG`)
        : (isMilitar ? 'APMG' : 'Visitante Civil');

      return {
        'Nº': index + 1,
        'Data da Entrada': entry.entryDateFormatted,
        'Horário Exato': entry.entryTimeFormatted,
        'Placa do Veículo': entry.plate,
        'Padrão da Placa': entry.plateFormat.toUpperCase(),
        'Posto / Graduação': entry.rankOrDoc,
        'Nome de Guerra': entry.warName || entry.driverName,
        'Nome Completo': entry.driverName,
        'Divisão / OPM (APMG)': divStr,
        'Tipo de Cadastro': isMilitar ? 'MILITAR' : 'CIVIL / VISITANTE',
        'Veículo': `${entry.brand} ${entry.model} (${entry.color})`,
        'Tipo de Veículo': entry.vehicleType,
        'Destino / Seção': entry.destination,
        'Finalidade': entry.purpose,
        'Evidência Fotográfica': hasPhoto,
        'Status do Acesso': statusText,
        'Sentinela de Serviço': entry.sentryName,
        'Posto da Guarda': entry.guardPost,
        'Observações': entry.notes || '---',
        'Registro Timestamp ISO': entry.entryDateTime,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const colWidths = [
      { wch: 6 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 22 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 24 },
      { wch: 30 },
      { wch: 24 },
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Livro da Guarda APMG');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `apmg_livro_da_guarda_${dateStr}.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  APMG • LIVRO DA GUARDA
                </span>
                <span className="text-xs text-slate-400">Auditoria & Registros Periciais</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono-military uppercase tracking-wide mt-1">
                Aba 4: Histórico, Evidências & Exportação
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrintReport}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
              title="Imprimir relatório da parte diária da guarda"
            >
              <Printer className="h-4 w-4 text-slate-400" />
              <span>Imprimir Parte</span>
            </button>

            <button
              id="export-excel-btn"
              type="button"
              onClick={handleExportToExcel}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Total de Acessos</span>
            <span className="text-xl font-bold font-mono-military text-slate-100">{entries.length}</span>
          </div>

          <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Militares APMG / Outras</span>
            <span className="text-xl font-bold font-mono-military text-emerald-400">
              {entries.filter((e) => e.driverType === 'militar').length}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Visitantes Civis</span>
            <span className="text-xl font-bold font-mono-military text-sky-400">
              {entries.filter((e) => e.driverType === 'visitante').length}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Com Foto Composta PiP</span>
            <span className="text-xl font-bold font-mono-military text-amber-400">
              {entries.filter((e) => e.compositePhotoUrl || e.photoBase64).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por placa, nome, guerra, OPM, divisão..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Subunidade APMG */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Todas as Divisões</option>
                <option value="EsFO">EsFO</option>
                <option value="EsFAEP">EsFAEP</option>
                <option value="ABM">ABM</option>
                <option value="Administração">Administração</option>
                <option value="SMB">SMB</option>
                <option value="SEF">SEF</option>
                <option value="Outra OPM">Outra OPM</option>
              </select>
            </div>
          </div>

          {/* Time Slot Filter */}
          <div className="sm:col-span-2">
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Todo o Turno</option>
                <option value="last_hour">Última 1h</option>
                <option value="morning">Manhã (06-12h)</option>
                <option value="afternoon">Tarde (12-18h)</option>
                <option value="night">Noite (18-06h)</option>
              </select>
            </div>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="militar">Militares</option>
                <option value="visitante">Civis</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Entries Table (Livro da Guarda) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono-military text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center w-14">Evidência</th>
                <th className="py-3 px-3">Horário</th>
                <th className="py-3 px-3 text-center">Placa</th>
                <th className="py-3 px-3">Condutor / Guerra</th>
                <th className="py-3 px-3">Divisão / OPM APMG</th>
                <th className="py-3 px-3">Veículo</th>
                <th className="py-3 px-3">Destino na APMG</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Nenhuma entrada registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isMilitar = entry.driverType === 'militar';
                  const displayImg = entry.compositePhotoUrl || entry.photoBase64;
                  const divLabel = entry.division
                    ? (entry.division === 'Outra OPM' ? `${entry.otherOpm || 'Outra OPM'}` : `${entry.division}`)
                    : (isMilitar ? 'APMG' : 'Civil');

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Thumbnail com PiP indicator */}
                      <td className="py-2.5 px-3 text-center">
                        {displayImg ? (
                          <button
                            type="button"
                            onClick={() => onSelectPhoto(entry)}
                            className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 transition-all inline-block group/img shadow cursor-pointer"
                            title="Clique para ver o Registro Fotográfico com Carimbo e PiP"
                          >
                            <img
                              src={displayImg}
                              alt="Placa"
                              className="w-full h-full object-cover"
                            />
                            {entry.compositePhotoUrl && (
                              <div className="absolute bottom-0 left-0 bg-emerald-500 text-[8px] font-black text-black px-1 rounded-tr">
                                PiP
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-11 h-11 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mx-auto">
                            <Car className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Horário & Data */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono-military font-bold text-emerald-400 text-xs">
                          {entry.entryTimeFormatted}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {entry.entryDateFormatted}
                        </div>
                      </td>

                      {/* Placa */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-block scale-90">
                          <BrazilianPlateBadge plate={entry.plate} format={entry.plateFormat} size="sm" />
                        </div>
                      </td>

                      {/* Condutor */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-100 font-mono-military">
                          {entry.rankOrDoc} {entry.warName || entry.driverName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {entry.driverName}
                        </div>
                      </td>

                      {/* Divisão / OPM APMG */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isMilitar
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {isMilitar ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          <span>{divLabel}</span>
                        </span>
                      </td>

                      {/* Veículo */}
                      <td className="py-2.5 px-3 text-slate-300">
                        <div>{entry.brand} {entry.model}</div>
                        <div className="text-[10px] text-slate-500">{entry.color} • {entry.vehicleType}</div>
                      </td>

                      {/* Destino */}
                      <td className="py-2.5 px-3 text-slate-400">
                        {entry.destination}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            entry.status === 'bloqueado'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
