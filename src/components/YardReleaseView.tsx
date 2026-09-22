import React, { useState } from 'react';
import { LogOut, Search, Clock, Car, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { VehicleEntry } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface YardReleaseViewProps {
  entries: VehicleEntry[];
  onRegisterExit: (entryId: string, exitTime: string) => void;
}

export const YardReleaseView: React.FC<YardReleaseViewProps> = ({ entries, onRegisterExit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [justReleasedId, setJustReleasedId] = useState<string | null>(null);

  // Considera no pátio veículos que não possuem exitTime registrado
  const yardVehicles = entries.filter((e) => !e.exitTime);

  const filtered = yardVehicles.filter(
    (e) =>
      e.plate.toLowerCase().includes(searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      e.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.warName && e.warName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRelease = (entry: VehicleEntry) => {
    const now = new Date();
    const exitTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    onRegisterExit(entry.id, exitTimeStr);
    setJustReleasedId(entry.id);
    setTimeout(() => setJustReleasedId(null), 3000);
  };

  // Cálculo de tempo de permanência decorrido
  const calculateDuration = (entry: VehicleEntry) => {
    if (!entry.createdAt) return 'Ativo';
    const diffMinutes = Math.floor((Date.now() - entry.createdAt) / (1000 * 60));
    if (diffMinutes < 60) return `${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca e Contador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por placa, condutor ou nome de guerra..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] font-semibold text-slate-400">No Pátio:</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
            {yardVehicles.length} veículos
          </span>
        </div>
      </div>

      {/* Lista de Veículos Presentes */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6">
          <Car className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium">
            {searchTerm ? 'Nenhum veículo encontrado com esse termo.' : 'Nenhum veículo registrado atualmente no pátio da APMG.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((entry) => {
            const isReleased = justReleasedId === entry.id;
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BrazilianPlateBadge plate={entry.plate} format={entry.plateFormat} size="sm" />

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {entry.rankOrDoc && entry.warName ? `${entry.rankOrDoc} ${entry.warName}` : entry.driverName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {entry.brand} {entry.model} {entry.color ? `• ${entry.color}` : ''}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono">
                      <span className="flex items-center gap-0.5 text-emerald-400">
                        <Clock className="w-2.5 h-2.5" />
                        Entrada: {entry.entryTimeFormatted}
                      </span>
                      <span>• Perm: {calculateDuration(entry)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRelease(entry)}
                  disabled={isReleased}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow ${
                    isReleased
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 active:scale-95'
                  }`}
                  title="Registrar saída do veículo"
                >
                  {isReleased ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Liberado!</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Registrar Saída</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
