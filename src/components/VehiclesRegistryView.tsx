import React, { useState, useMemo } from 'react';
import {
  Car,
  Search,
  Plus,
  Trash2,
  Edit2,
  Shield,
  FileCheck,
  Download,
  Upload,
  User,
  Hash,
  FileText,
  BadgeAlert,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { RegisteredVehicle, VehicleCategory, DriverType } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface VehiclesRegistryViewProps {
  vehicles: RegisteredVehicle[];
  onAddVehicle: (veh: RegisteredVehicle) => void;
  onDeleteVehicle: (plate: string) => void;
  onResetTestDatabase: () => void;
  onGoToDriveTab: () => void;
}

export const VehiclesRegistryView: React.FC<VehiclesRegistryViewProps> = ({
  vehicles,
  onAddVehicle,
  onDeleteVehicle,
  onResetTestDatabase,
  onGoToDriveTab,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New vehicle form state
  const [idCode, setIdCode] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [warName, setWarName] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [plate, setPlate] = useState<string>('');
  const [renavam, setRenavam] = useState<string>('');
  const [rankOrDoc, setRankOrDoc] = useState<string>('Soldado');
  const [driverType, setDriverType] = useState<DriverType>('militar');
  const [vehicleType, setVehicleType] = useState<VehicleCategory>('Carro');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [destination, setDestination] = useState<string>('1ª Cia de Fuzileiros');
  const [authorizationLevel, setAuthorizationLevel] = useState<'permanente' | 'temporaria' | 'bloqueado'>('permanente');
  const [notes, setNotes] = useState<string>('');

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.warName && v.warName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.cpf && v.cpf.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.idCode && v.idCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.renavam && v.renavam.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = filterType === 'all' || v.vehicleType === filterType;

      return matchSearch && matchType;
    });
  }, [vehicles, searchTerm, filterType]);

  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate.trim() || !ownerName.trim()) {
      alert('Placa e Nome Completo são obrigatórios.');
      return;
    }

    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();

    const newVeh: RegisteredVehicle = {
      idCode: idCode.trim() || `${Math.floor(100 + Math.random() * 900)}`,
      ownerName: ownerName.trim(),
      warName: warName.trim() || ownerName.trim(),
      cpf: cpf.trim() || '---',
      plate: cleanPlate,
      renavam: renavam.trim() || '---',
      rankOrDoc: rankOrDoc.trim(),
      driverType: driverType,
      vehicleType: vehicleType,
      brand: brand.trim() || 'Marca',
      model: model.trim() || 'Modelo',
      color: color.trim() || 'Padrão',
      destination: destination.trim() || 'Corpo da Guarda',
      authorizationLevel: authorizationLevel,
      notes: notes.trim() || undefined,
      source: 'manual',
      registeredAt: new Date().toLocaleDateString('pt-BR'),
    };

    onAddVehicle(newVeh);
    setIsAddModalOpen(false);

    // Reset fields
    setIdCode('');
    setOwnerName('');
    setWarName('');
    setCpf('');
    setPlate('');
    setRenavam('');
    setBrand('');
    setModel('');
    setColor('');
    setNotes('');
  };

  // Export CSV of registered fleet
  const handleExportFleetCsv = () => {
    const headers = [
      'ID / Cód.',
      'Nome Completo',
      'Nome de Guerra',
      'CPF',
      'Placa do Veículo',
      'RENAVAM',
      'Posto / Graduação',
      'Tipo de Veículo',
      'Marca',
      'Modelo',
      'Cor',
      'Destino no Quartel',
      'Autorização',
      'Observações',
      'Origem do Cadastro',
    ].join(';');

    const rows = vehicles.map((v) => {
      return [
        `"${v.idCode || ''}"`,
        `"${(v.ownerName || '').replace(/"/g, '""')}"`,
        `"${(v.warName || '').replace(/"/g, '""')}"`,
        `"${v.cpf || ''}"`,
        `"${v.plate}"`,
        `"${v.renavam || ''}"`,
        `"${v.rankOrDoc || ''}"`,
        `"${v.vehicleType}"`,
        `"${v.brand || ''}"`,
        `"${v.model || ''}"`,
        `"${v.color || ''}"`,
        `"${v.destination || ''}"`,
        `"${v.authorizationLevel}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`,
        `"${v.source || 'base_om'}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadastro_efetivo_veiculos_om_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-mono-military uppercase tracking-wide">
                  Cadastro de Veículos & Efetivo da OM
                </h2>
                <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  {vehicles.length} Veículos Cadastrados
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Base oficial de militares, civis e viaturas autorizadas a ingressar no Quartel (IDs 101 a 110 da base teste inclusos).
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="open-add-vehicle-modal-btn"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Veículo</span>
            </button>

            <button
              id="export-fleet-csv-btn"
              type="button"
              onClick={handleExportFleetCsv}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
              title="Baixar lista em Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Exportar Planilha</span>
            </button>

            <button
              id="nav-to-drive-tab-btn"
              type="button"
              onClick={onGoToDriveTab}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Vincular Google Forms / Drive</span>
            </button>

            <button
              id="reset-test-database-btn"
              type="button"
              onClick={onResetTestDatabase}
              className="flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              title="Restaurar a base original de teste oficial com os IDs 101 a 110"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurar Base Teste (101-110)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-4 border-t border-slate-800/80">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Placa, Nome Completo, Nome de Guerra, CPF, Cód. ID ou RENAVAM..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">Todos os tipos de veículos</option>
              <option value="Carro">Carros de Passeio</option>
              <option value="Moto">Motocicletas</option>
              <option value="Viatura Militar">Viaturas Militares</option>
              <option value="Caminhão">Caminhões / Transporte</option>
              <option value="Utilitário">Utilitários / Vans</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Matching the PDF Document Layout */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono-military text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center w-16">ID / Cód.</th>
                <th className="py-3 px-3">Nome Completo</th>
                <th className="py-3 px-3">Nome de Guerra</th>
                <th className="py-3 px-3">CPF</th>
                <th className="py-3 px-3 text-center">Placa do Veículo</th>
                <th className="py-3 px-3">RENAVAM</th>
                <th className="py-3 px-3">Veículo / Modelo</th>
                <th className="py-3 px-3">Destino na OM</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Nenhum veículo encontrado para a busca especificada.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((veh) => {
                  const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(veh.plate.replace('-', ''));
                  return (
                    <tr
                      key={veh.plate}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* ID / Cód. */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400 bg-slate-950/40">
                        {veh.idCode || '---'}
                      </td>

                      {/* Nome Completo */}
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{veh.ownerName}</span>
                          {veh.source === 'google_forms' && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-mono">
                              Forms
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nome de Guerra */}
                      <td className="py-3 px-3 font-mono-military text-slate-300">
                        {veh.warName || veh.rankOrDoc}
                      </td>

                      {/* CPF */}
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {veh.cpf || '---'}
                      </td>

                      {/* Placa do Veículo Badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-block scale-90">
                          <BrazilianPlateBadge
                            plate={veh.plate}
                            format={isMercosul ? 'mercosul' : 'antiga'}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* RENAVAM */}
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {veh.renavam || '---'}
                      </td>

                      {/* Veículo / Modelo */}
                      <td className="py-3 px-3 text-slate-300">
                        <div>
                          <span className="font-medium text-slate-200">{veh.brand} {veh.model}</span>
                          <span className="text-[11px] text-slate-500 block">{veh.color} • {veh.vehicleType}</span>
                        </div>
                      </td>

                      {/* Destino na OM */}
                      <td className="py-3 px-3 text-slate-400">
                        {veh.destination}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            veh.authorizationLevel === 'permanente'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : veh.authorizationLevel === 'temporaria'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {veh.authorizationLevel}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteVehicle(veh.plate)}
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remover Veículo"
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

      {/* Modal: Cadastrar Novo Veículo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold font-mono-military uppercase">
                  Cadastrar Veículo no Efetivo da OM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewVehicle} className="space-y-4">
              {/* Row 1: ID, Nome Completo, Nome de Guerra */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    ID / Cód.
                  </label>
                  <input
                    type="text"
                    value={idCode}
                    onChange={(e) => setIdCode(e.target.value)}
                    placeholder="Ex: 111"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: João Paulo Silva"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Nome de Guerra
                  </label>
                  <input
                    type="text"
                    value={warName}
                    onChange={(e) => setWarName(e.target.value)}
                    placeholder="Ex: Sd. J. Silva"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: CPF, Placa, RENAVAM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="ABC-1234 ou BRA2E19"
                    maxLength={8}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-plate uppercase tracking-wider"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    RENAVAM
                  </label>
                  <input
                    type="text"
                    value={renavam}
                    onChange={(e) => setRenavam(e.target.value)}
                    placeholder="11 dígitos"
                    maxLength={11}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Categoria, Posto/Graduação, Tipo de Veículo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={driverType}
                    onChange={(e) => setDriverType(e.target.value as DriverType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="militar">Militar da OM</option>
                    <option value="civil">Servidor Civil</option>
                    <option value="visitante">Visitante / Familiar</option>
                    <option value="fornecedor">Fornecedor / Prestador</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Posto / Graduação / Função
                  </label>
                  <input
                    type="text"
                    value={rankOrDoc}
                    onChange={(e) => setRankOrDoc(e.target.value)}
                    placeholder="Ex: Soldado, Sargento, Tenente"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Tipo do Veículo
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleCategory)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Carro">Carro</option>
                    <option value="Moto">Moto</option>
                    <option value="Viatura Militar">Viatura Militar</option>
                    <option value="Caminhão">Caminhão</option>
                    <option value="Van">Van</option>
                    <option value="Utilitário">Utilitário</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Marca, Modelo, Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Toyota, VW"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: Corolla, Onix"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Prata, Preto"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Destino & Autorização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Destino no Quartel
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: 1ª Companhia de Fuzileiros"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Nível de Autorização
                  </label>
                  <select
                    value={authorizationLevel}
                    onChange={(e) => setAuthorizationLevel(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="permanente">Permanente (Livre Acesso)</option>
                    <option value="temporaria">Temporária (Mediante Checagem)</option>
                    <option value="bloqueado">Bloqueado / Restrito</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Veículo na Base</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
