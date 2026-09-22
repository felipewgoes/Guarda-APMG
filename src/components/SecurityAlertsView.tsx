import React, { useState } from 'react';
import { ShieldAlert, Search, PlusCircle, AlertTriangle, Eye, Car, Trash2, CheckCircle2 } from 'lucide-react';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface SecurityAlert {
  id: string;
  plate: string;
  type: 'furto_roubo' | 'mandado' | 'suspeito' | 'bloqueado';
  reason: string;
  reportedBy: string;
  date: string;
  vehicleDescription: string;
}

const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'alt-1',
    plate: 'KZW9912',
    type: 'furto_roubo',
    reason: 'Alerta SESP/COPOM: Veículo com indicativo de roubo na região de São José dos Pinhais.',
    reportedBy: 'COPOM / PMPR',
    date: '22/09/2026',
    vehicleDescription: 'VW Gol G5 Preto',
  },
  {
    id: 'alt-2',
    plate: 'BCX8H99',
    type: 'suspeito',
    reason: 'Veículo avistado filmando a guarda das armas e o muro da EsFO em dias consecutivos.',
    reportedBy: 'Serviço de Inteligência (P2/APMG)',
    date: '21/09/2026',
    vehicleDescription: 'Chevrolet Onix Prata',
  },
  {
    id: 'alt-3',
    plate: 'MKO4310',
    type: 'bloqueado',
    reason: 'Condutor civil com restrição administrativa de acesso às dependências da APMG.',
    reportedBy: 'Comando da APMG',
    date: '18/09/2026',
    vehicleDescription: 'Fiat Palio Branco',
  },
];

export const SecurityAlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() => {
    try {
      const saved = localStorage.getItem('apmg_security_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_ALERTS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<SecurityAlert['type']>('suspeito');
  const [newReason, setNewReason] = useState('');
  const [newVehicle, setNewVehicle] = useState('');

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    const clean = newPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const alertItem: SecurityAlert = {
      id: `alt-${Date.now()}`,
      plate: clean,
      type: newType,
      reason: newReason.trim() || 'Alerta inserido pelo Sentinela de Serviço.',
      reportedBy: 'Sentinela Portaria APMG',
      date: new Date().toLocaleDateString('pt-BR'),
      vehicleDescription: newVehicle.trim() || 'Veículo Não Especificado',
    };

    const updated = [alertItem, ...alerts];
    setAlerts(updated);
    try {
      localStorage.setItem('apmg_security_alerts', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    setNewPlate('');
    setNewReason('');
    setNewVehicle('');
    setIsAddingAlert(false);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    try {
      localStorage.setItem('apmg_security_alerts', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
  };

  const filtered = alerts.filter(
    (a) =>
      a.plate.toLowerCase().includes(searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      a.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.vehicleDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Ações Rápidas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Consultar placa sob alerta ou suspeita..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddingAlert(!isAddingAlert)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 hover:bg-red-900/60 text-xs font-bold transition-all shadow cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-red-400" />
          <span>{isAddingAlert ? 'Fechar Formulário' : 'Novo Alerta de Segurança'}</span>
        </button>
      </div>

      {/* Formulário de Inserção de Novo Alerta */}
      {isAddingAlert && (
        <form
          onSubmit={handleSaveAlert}
          className="p-4 rounded-xl border border-red-500/40 bg-red-950/20 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-red-300 uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Cadastrar Alerta na Base da Guarda</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">PLACA SOB ALERTA</label>
              <input
                type="text"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                placeholder="Ex: ABC1D23"
                maxLength={8}
                required
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-100 uppercase"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">NÍVEL DE ALERTA</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                <option value="suspeito">Veículo Suspeito (Observação)</option>
                <option value="furto_roubo">Indicativo de Roubo / Furto</option>
                <option value="bloqueado">Acesso Bloqueado / Restrição</option>
                <option value="mandado">Mandado / P2 Monitoramento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">DESCRIÇÃO DO VEÍCULO</label>
              <input
                type="text"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                placeholder="Ex: Onix Prata / Hilux Preta"
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">MOTIVO DO ALERTA / ORIENTAÇÃO AO SENTINELA</label>
            <textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Descreva o motivo da restrição ou ação a ser tomada (Ex: Acionar o Oficial de Dia imediatamente)..."
              rows={2}
              required
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingAlert(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold shadow"
            >
              Salvar Alerta
            </button>
          </div>
        </form>
      )}

      {/* Lista de Alertas Ativos */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-red-900/60 bg-gradient-to-r from-red-950/40 via-slate-950 to-slate-900 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <BrazilianPlateBadge plate={item.plate} format="mercosul" size="sm" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-100">{item.vehicleDescription}</span>
                  <span className="rounded bg-red-900/60 border border-red-500/40 px-1.5 py-0.2 text-[9px] font-bold text-red-200 uppercase font-mono">
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">• {item.date}</span>
                </div>

                <p className="text-xs text-red-200/90 mt-1 leading-snug">{item.reason}</p>

                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  Origem: <strong className="text-slate-300">{item.reportedBy}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteAlert(item.id)}
              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 transition-colors"
              title="Excluir alerta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
