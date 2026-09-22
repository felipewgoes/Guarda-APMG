import React, { useState } from 'react';
import { Keyboard, Car, User, Search, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { VehicleEntry, RegisteredVehicle } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface QuickManualLaunchCardProps {
  registeredVehicles: RegisteredVehicle[];
  currentSentry: string;
  currentPost: string;
  onSaveEntry: (entry: VehicleEntry) => void;
  onShowSuccess: (title: string, subtitle: string, plate: string) => void;
  onNavigateToRegister?: (type: 'militar' | 'civil', plate: string) => void;
}

export const QuickManualLaunchCard: React.FC<QuickManualLaunchCardProps> = ({
  registeredVehicles,
  currentSentry,
  currentPost,
  onSaveEntry,
  onShowSuccess,
  onNavigateToRegister,
}) => {
  const [plate, setPlate] = useState('');
  const [format, setFormat] = useState<'MERCOSUL' | 'ANTIGO_BRASIL'>('MERCOSUL');
  const [foundVehicle, setFoundVehicle] = useState<RegisteredVehicle | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Campos manuais para veículos civis ou não cadastrados
  const [driverName, setDriverName] = useState('');
  const [vehicleDesc, setVehicleDesc] = useState('');
  const [destination, setDestination] = useState('');
  const [driverType, setDriverType] = useState<'militar' | 'visitante' | 'fornecedor'>('militar');

  const handlePlateChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlate(clean);
    setHasSearched(false);

    if (clean.length >= 7) {
      const match = registeredVehicles.find(
        (v) => v.plate.replace(/[^A-Z0-9]/g, '') === clean
      );
      if (match) {
        setFoundVehicle(match);
        setDriverName(match.ownerName);
        setVehicleDesc(`${match.brand} ${match.model} (${match.color})`);
        setDestination(match.division ? `${match.division} / APMG` : 'APMG');
        setDriverType('militar');
      } else {
        setFoundVehicle(null);
      }
      setHasSearched(true);
    } else {
      setFoundVehicle(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || plate.length < 7) {
      alert('Digite uma placa válida com 7 caracteres.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newEntry: VehicleEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      plate: plate,
      plateFormat: format === 'MERCOSUL' ? 'mercosul' : 'antiga',
      fontPattern: format,
      vehicleType: 'Carro',
      brand: foundVehicle ? foundVehicle.brand : (vehicleDesc.split(' ')[0] || 'Veículo'),
      model: foundVehicle ? foundVehicle.model : (vehicleDesc.split(' ').slice(1).join(' ') || 'Manual'),
      color: foundVehicle ? foundVehicle.color : 'Padrão',
      entryDateTime: now.toISOString(),
      entryDateFormatted: dateStr,
      entryTimeFormatted: timeStr,
      inputMethod: 'manual',
      driverName: foundVehicle ? foundVehicle.ownerName : (driverName || 'Condutor Manual'),
      driverType: foundVehicle ? 'militar' : driverType,
      rankOrDoc: foundVehicle ? foundVehicle.rankOrDoc : (driverType === 'militar' ? 'Militar' : 'Civil'),
      warName: foundVehicle ? foundVehicle.warName : undefined,
      division: foundVehicle ? foundVehicle.division : undefined,
      destination: destination || 'APMG - Quartel',
      purpose: 'expediente',
      guardPost: currentPost,
      sentryName: currentSentry,
      status: foundVehicle ? 'autorizado' : 'visitante_aguardando',
      notes: foundVehicle ? 'Lançamento Manual (Base APMG)' : 'Lançamento Manual Portaria',
      ocrConfidence: 'ALTA',
      createdAt: Date.now(),
    };

    onSaveEntry(newEntry);
    onShowSuccess(
      `Entrada Registrada: ${plate}`,
      `${newEntry.rankOrDoc} ${newEntry.warName || newEntry.driverName} • ${newEntry.destination}`,
      plate
    );

    // Limpa o formulário
    setPlate('');
    setFoundVehicle(null);
    setHasSearched(false);
    setDriverName('');
    setVehicleDesc('');
    setDestination('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Seletor de Padrão Tipográfico */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 block mb-1">
          PADRÃO TIPOGRÁFICO DA CHAPA METÁLICA:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormat('MERCOSUL')}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              format === 'MERCOSUL'
                ? 'border-blue-500 bg-blue-950/70 text-blue-200 ring-2 ring-blue-500/40'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            <span>Mercosul (FE-Schrift)</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('ANTIGO_BRASIL')}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              format === 'ANTIGO_BRASIL'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-2 ring-zinc-400/40'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-400"></span>
            <span>Antigo / Cinza (Mandatory)</span>
          </button>
        </div>
      </div>

      {/* Input de Placa com Badge Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1">
            PLACA DO VEÍCULO (7 CARACTERES)
          </label>
          <input
            type="text"
            value={plate}
            onChange={(e) => handlePlateChange(e.target.value)}
            placeholder="Ex: ABC1D23 ou ABC1234"
            maxLength={8}
            required
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-mono font-bold text-slate-100 uppercase tracking-widest focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <BrazilianPlateBadge
            plate={plate || 'ABC1D23'}
            format={format === 'MERCOSUL' ? 'mercosul' : 'antiga'}
            size="md"
          />
        </div>
      </div>

      {/* Resultado da Busca Automática na Frota APMG */}
      {hasSearched && (
        <div
          className={`p-3.5 rounded-xl border animate-in fade-in ${
            foundVehicle
              ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200'
              : 'border-amber-500/50 bg-amber-950/30 text-amber-200'
          }`}
        >
          {foundVehicle ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-300">
                    {foundVehicle.rankOrDoc} {foundVehicle.warName || foundVehicle.ownerName}
                  </div>
                  <div className="text-[11px] text-emerald-200/80">
                    {foundVehicle.division} • {foundVehicle.brand} {foundVehicle.model} ({foundVehicle.color})
                  </div>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-900 border border-emerald-500/40 px-2 py-0.5 rounded text-emerald-100 font-mono font-bold">
                CADASTRADO
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-300">Veículo Não Cadastrado na Frota</div>
                  <div className="text-[10px] text-amber-200/80">
                    Preencha os campos abaixo para registrar como visitante ou direcione ao cadastro.
                  </div>
                </div>
              </div>

              {onNavigateToRegister && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigateToRegister('militar', plate)}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                  >
                    + Militar
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToRegister('civil', plate)}
                    className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-[10px] font-bold"
                  >
                    + Civil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Campos de Detalhamento se não for cadastrado */}
      {!foundVehicle && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">CONDUTOR</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Nome do motorista..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">VEÍCULO / MODELO</label>
            <input
              type="text"
              value={vehicleDesc}
              onChange={(e) => setVehicleDesc(e.target.value)}
              placeholder="Ex: Corolla Prata"
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">DESTINO NA APMG</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex: EsFO / Seção Pessoal"
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>
        </div>
      )}

      {/* Botão de Envio de Toque Amplo */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Confirmar Entrada na Guarda</span>
        </button>
      </div>
    </form>
  );
};
