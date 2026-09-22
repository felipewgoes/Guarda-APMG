import React, { useState } from 'react';
import { X, Search, Plus, Truck, Check, Car, User, Trash2 } from 'lucide-react';
import { RegisteredVehicle, VehicleCategory, DriverType } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface RegisteredVehiclesModalProps {
  vehicles: RegisteredVehicle[];
  onClose: () => void;
  onAddVehicle: (newVehicle: RegisteredVehicle) => void;
  onDeleteVehicle: (plate: string) => void;
}

export const RegisteredVehiclesModal: React.FC<RegisteredVehiclesModalProps> = ({
  vehicles,
  onClose,
  onAddVehicle,
  onDeleteVehicle,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New vehicle form state
  const [plate, setPlate] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [rankOrDoc, setRankOrDoc] = useState<string>('');
  const [driverType, setDriverType] = useState<DriverType>('militar');
  const [vehicleType, setVehicleType] = useState<VehicleCategory>('Carro');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [destination, setDestination] = useState<string>('Pavilhão de Comando');
  const [notes, setNotes] = useState<string>('');

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.plate.toLowerCase().includes(term) ||
      v.ownerName.toLowerCase().includes(term) ||
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.destination.toLowerCase().includes(term)
    );
  });

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !ownerName.trim()) {
      alert('Preencha a placa e o nome do responsável.');
      return;
    }

    const newVeh: RegisteredVehicle = {
      plate: plate.toUpperCase().trim(),
      ownerName: ownerName.trim(),
      rankOrDoc: rankOrDoc.trim() || 'Militar',
      driverType: driverType,
      vehicleType: vehicleType,
      brand: brand.trim() || 'Padrão',
      model: model.trim() || 'Veículo',
      color: color.trim() || 'Padrão',
      destination: destination.trim() || 'Comando',
      authorizationLevel: 'permanente',
      notes: notes.trim() || undefined,
    };

    onAddVehicle(newVeh);
    setIsAddingNew(false);
    setPlate('');
    setOwnerName('');
    setRankOrDoc('');
    setBrand('');
    setModel('');
    setColor('');
  };

  return (
    <div
      id="registered-vehicles-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="registered-vehicles-modal-content"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono-military uppercase">
                Veículos Cadastrados na OM ({vehicles.length})
              </h3>
              <p className="text-xs text-slate-400">
                Oficiais, praças, viaturas militares e permissionários autorizados
              </p>
            </div>
          </div>
          <button
            id="close-fleet-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar & Add New Button */}
        <div className="border-b border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="search-fleet-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar placa, militar ou destino..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              id="toggle-add-vehicle-btn"
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingNew ? 'Cancelar Cadastro' : 'Cadastrar Novo Veículo'}</span>
            </button>
          </div>

          {/* New Vehicle Form */}
          {isAddingNew && (
            <form onSubmit={handleSaveNew} className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-bold text-slate-200 mb-3 font-mono-military uppercase">
                Novo Cadastro de Veículo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Placa *</label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: BRA2E19 ou EB09821"
                    maxLength={8}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-bold font-plate text-slate-100 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Responsável / Militar *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: Cap. Silveira"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Posto / Graduação / Doc</label>
                  <input
                    type="text"
                    value={rankOrDoc}
                    onChange={(e) => setRankOrDoc(e.target.value)}
                    placeholder="Ex: Capitão"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tipo de Veículo</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleCategory)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="Carro">Carro</option>
                    <option value="Moto">Moto</option>
                    <option value="Viatura Militar">Viatura Militar</option>
                    <option value="Caminhão">Caminhão</option>
                    <option value="Van">Van</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Toyota"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: Corolla"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Cor</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Preto"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Destino / Seção habitual</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: Comando"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Observações</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Vaga reservada..."
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Vehicles List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredVehicles.map((v) => (
            <div
              key={v.plate}
              id={`registered-vehicle-${v.plate}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BrazilianPlateBadge plate={v.plate} size="sm" />
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>{v.ownerName}</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {v.rankOrDoc}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {v.brand} {v.model} ({v.color}) • Destino: {v.destination}
                  </div>
                  {v.notes && (
                    <div className="text-[10px] text-slate-500 italic mt-0.5">
                      Obs: {v.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onDeleteVehicle(v.plate)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Excluir cadastro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
