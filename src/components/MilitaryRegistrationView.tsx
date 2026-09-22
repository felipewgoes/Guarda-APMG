import React, { useState, useRef } from 'react';
import {
  Shield,
  User,
  Camera,
  CheckCircle2,
  Car,
  Upload,
  UserCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { APMGDivision, MilitaryRank, RegisteredVehicle, VehicleCategory } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface MilitaryRegistrationViewProps {
  initialPlate?: string;
  onSaveMilitaryVehicle: (vehicle: RegisteredVehicle, registerImmediateEntry?: boolean) => void;
  onCancel?: () => void;
}

const APMG_DIVISIONS: { id: APMGDivision; label: string; description: string }[] = [
  { id: 'EsFO', label: 'EsFO', description: 'Escola de Formação de Oficiais' },
  { id: 'EsFAEP', label: 'EsFAEP', description: 'Escola de Formação, Aperfeiçoamento e Especialização de Praças' },
  { id: 'ABM', label: 'ABM', description: 'Academia de Bombeiro Militar' },
  { id: 'Administração', label: 'Administração', description: 'Comando, Estado-Maior, Aprovisionamento e Almoxarifado' },
  { id: 'SMB', label: 'SMB', description: 'Seção de Material Bélico' },
  { id: 'SEF', label: 'SEF', description: 'Seção de Educação Física e Desportos' },
  { id: 'Outra OPM', label: 'Outra OPM', description: 'Militar visitante de outro Batalhão / Unidade da PMPR/BMPR' },
];

const MILITARY_RANKS: MilitaryRank[] = [
  'Cel',
  'Ten. Cel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aspirante a Oficial',
  'Cadete EsFO',
  'Subtenente',
  '1º Sgt',
  '2º Sgt',
  '3º Sgt',
  'Cabo',
  'Soldado 1ª Classe',
  'Soldado 2ª Cl. (Aluno EsFAEP)',
];

export const MilitaryRegistrationView: React.FC<MilitaryRegistrationViewProps> = ({
  initialPlate = '',
  onSaveMilitaryVehicle,
  onCancel,
}) => {
  // Campos do Formulário APMG
  const [rank, setRank] = useState<MilitaryRank>('Soldado 1ª Classe');
  const [fullName, setFullName] = useState<string>('');
  const [warName, setWarName] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [division, setDivision] = useState<APMGDivision>('EsFO');
  const [otherOpm, setOtherOpm] = useState<string>('');
  const [plate, setPlate] = useState<string>(initialPlate.toUpperCase());
  const [vehicleType, setVehicleType] = useState<VehicleCategory>('Carro');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [militaryPhoto, setMilitaryPhoto] = useState<string | null>(null);

  // Câmera ao vivo para Foto do Militar
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Máscara de CPF (000.000.000-00)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpf(val);
  };

  // Máscara de Placa (Mercosul ou Antiga)
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (val.length > 3) {
      const isMercosul = /^[A-Z]{3}[0-9][A-Z]/.test(val);
      if (!isMercosul && /^[A-Z]{3}[0-9]/.test(val)) {
        val = `${val.slice(0, 3)}-${val.slice(3)}`;
      }
    }
    setPlate(val);
  };

  // Câmera para Selfie / Foto do Militar
  const startSelfieCamera = async () => {
    setIsCapturingPhoto(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera error for photo capture:', err);
    }
  };

  const stopSelfieCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturingPhoto(false);
  };

  const takePhotoSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 480, 480);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setMilitaryPhoto(dataUrl);
      stopSelfieCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setMilitaryPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Campo obrigatório: Nome Completo do Militar.');
      return;
    }

    if (!warName.trim()) {
      alert('Campo obrigatório: Nome de Guerra do Militar.');
      return;
    }

    if (!cpf.trim() || cpf.replace(/\D/g, '').length < 11) {
      alert('Campo obrigatório: CPF válido com 11 dígitos.');
      return;
    }

    if (division === 'Outra OPM' && !otherOpm.trim()) {
      alert('Campo obrigatório: Especifique a OPM/Unidade do militar visitante.');
      return;
    }

    if (!plate.trim() || plate.replace(/[^A-Z0-9]/g, '').length < 7) {
      alert('Campo obrigatório: Placa do Veículo válida.');
      return;
    }

    if (!militaryPhoto) {
      const proceed = window.confirm(
        'Aviso: Nenhuma foto do militar foi capturada. Deseja tirar uma foto agora para compor o crachá e a imagem de evidência com Picture-in-Picture da guarda? Clique em Cancelar para tirar foto, ou OK para prosseguir provisoriamente com avatar sem foto.'
      );
      if (!proceed) return;
    }

    const cleanPlate = plate.toUpperCase().trim();
    const effectiveDivisionStr = division === 'Outra OPM' ? `${otherOpm.trim()} (Outra OPM)` : `${division} / APMG`;

    const newVehicle: RegisteredVehicle = {
      idCode: `APMG-${Math.floor(100 + Math.random() * 900)}`,
      ownerName: fullName.trim(),
      warName: warName.trim(),
      cpf: cpf.trim(),
      plate: cleanPlate,
      photoUrl: militaryPhoto || undefined,
      driverType: 'militar',
      rankOrDoc: rank,
      division: division,
      otherOpm: division === 'Outra OPM' ? otherOpm.trim() : undefined,
      vehicleType: vehicleType,
      brand: brand.trim() || 'Padrão',
      model: model.trim() || 'Veículo Particular',
      color: color.trim() || 'Padrão',
      destination: effectiveDivisionStr,
      authorizationLevel: 'permanente',
      source: 'manual',
      registeredAt: new Date().toLocaleDateString('pt-BR'),
    };

    // Salva na base, registra a entrada no histórico com a foto composta e retorna à Leitura Rápida
    onSaveMilitaryVehicle(newVehicle, true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header Banner - APMG */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PMPR • APMG
              </span>
              <span className="text-xs text-slate-400">Guatupê - São José dos Pinhais</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono-military uppercase tracking-wide mt-1">
              Aba 2: Cadastro de Militares (Efetivo / Alunos / Instrutores)
            </h2>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-5">
          
          {/* Section 1: Dados do Militar e Subunidade APMG */}
          <div>
            <div className="text-xs font-bold uppercase font-mono-military text-emerald-400 mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Identificação do Militar (Campos Obrigatórios)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* 1. Posto / Graduação */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  1. Posto / Graduação *
                </label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value as MilitaryRank)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-semibold"
                  required
                >
                  {MILITARY_RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Nome Completo */}
              <div className="sm:col-span-8">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  2. Nome Completo *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Alexandre Ribeiro de Souza"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* 3. Nome de Guerra (Obrigatório) */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  3. Nome de Guerra (Exibição na Guarda) *
                </label>
                <input
                  type="text"
                  value={warName}
                  onChange={(e) => setWarName(e.target.value)}
                  placeholder="Ex: Cap. Ribeiro ou Cadete Bruno"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono-military font-bold"
                  required
                />
              </div>

              {/* 4. CPF */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  4. CPF (000.000.000-00) *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono tracking-wider font-semibold"
                  required
                />
              </div>

              {/* 5. Subunidade / Divisão da APMG */}
              <div className="sm:col-span-12 pt-1">
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5. OPM / Divisão da APMG (Seleção Obrigatória) *</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {APMG_DIVISIONS.map((d) => {
                    const isSelected = division === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDivision(d.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono-military text-xs text-emerald-400">
                            {d.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-tight line-clamp-2">
                          {d.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Campo extra quando selecionar "Outra OPM" */}
                {division === 'Outra OPM' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 animate-in fade-in">
                    <label className="text-[11px] font-bold text-amber-300 block mb-1">
                      Especifique a OPM do Militar Visitante (ex: 1º BPM, 12º BPM, BOPE, BPRv, BMPR) *
                    </label>
                    <input
                      type="text"
                      value={otherOpm}
                      onChange={(e) => setOtherOpm(e.target.value)}
                      placeholder="Ex: BOPE / PMPR ou 17º BPM"
                      className="w-full rounded-xl border border-amber-600/60 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Dados do Veículo */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-bold uppercase font-mono-military text-emerald-400 mb-3 flex items-center gap-1.5">
              <Car className="w-4 h-4" />
              <span>6. Dados do Veículo Vinculado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Placa com Máscara */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Placa do Veículo *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={plate}
                    onChange={handlePlateChange}
                    placeholder="ABC-1234 ou BRA2E19"
                    maxLength={8}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-bold font-plate uppercase tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                  {plate.length >= 7 && (
                    <div className="scale-90 shrink-0">
                      <BrazilianPlateBadge plate={plate} size="sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Categoria */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoria do Veículo
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleCategory)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Carro">Carro</option>
                  <option value="Moto">Moto</option>
                  <option value="Viatura Militar">Viatura Ostensiva PMPR</option>
                  <option value="Caminhão">Caminhão</option>
                  <option value="Utilitário">Van / Utilitário</option>
                </select>
              </div>

              {/* Marca / Modelo / Cor */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Marca / Fabricante
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Toyota, Volkswagen, Honda"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Modelo e Cor
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: Corolla Prata"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Foto do Militar (Obrigatória para PiP e Crachá) */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-bold uppercase font-mono-military text-emerald-400 mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>7. Foto do Militar (Utilizada na Composição Picture-in-Picture) *</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              {/* Photo Preview Thumbnail */}
              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                {militaryPhoto ? (
                  <img
                    src={militaryPhoto}
                    alt="Foto do Militar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-600" />
                )}
              </div>

              {/* Capture / Upload Controls */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-300 font-medium">
                  {militaryPhoto
                    ? 'Foto cadastrada! Ela será inserida automaticamente como miniatura no canto inferior esquerdo das fotos de registro da guarda.'
                    : 'Tire uma foto ou selecione arquivo do militar para identificação visual e sobreposição pericial PiP.'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startSelfieCamera}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotografar com Câmera</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anexar da Galeria</span>
                  </button>

                  {militaryPhoto && (
                    <button
                      type="button"
                      onClick={() => setMilitaryPhoto(null)}
                      className="text-xs text-rose-400 hover:underline px-2 cursor-pointer"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Camera Snapshot Modal */}
        {isCapturingPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4 text-center">
              <div className="text-sm font-bold font-mono-military uppercase text-slate-100">
                Posicione o Rosto do Militar
              </div>

              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-full m-8 pointer-events-none"></div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={stopSelfieCamera}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={takePhotoSnapshot}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tirar Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {onCancel && (
            <button
              id="btn-cancel-militar"
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar e Retornar
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            <button
              id="btn-save-militar-return"
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Salvar, Autorizar e Retornar à Leitura Rápida</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
