import React, { useState, useRef } from 'react';
import {
  Users,
  User,
  Car,
  CheckCircle2,
  Building,
  Camera,
  Upload
} from 'lucide-react';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface CivilRegistrationViewProps {
  initialPlate?: string;
  currentSentry: string;
  currentPost: string;
  onRegisterCivilEntry: (entry: any) => void;
  onCancel?: () => void;
}

const APMG_CIVIL_DESTINATIONS = [
  'Instrução',
  'Visita à EsFO',
  'Entrega SMB',
  'Atendimento SEF',
  'Comando / Subcomando APMG',
  'EsFAEP (Escola de Formação de Praças)',
  'ABM (Academia de Bombeiro Militar)',
  'Administração / Aprovisionamento',
  'Complexo Poliesportivo / Pista de Atletismo',
  'Estande de Tiro Policial',
  'Formação Sanitária / Ambulatório',
  'Outro (Especificar)',
];

export const CivilRegistrationView: React.FC<CivilRegistrationViewProps> = ({
  initialPlate = '',
  currentSentry,
  currentPost,
  onRegisterCivilEntry,
  onCancel,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [plate, setPlate] = useState<string>(initialPlate.toUpperCase());
  const [destination, setDestination] = useState<string>('Visita à EsFO');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [visitorPhoto, setVisitorPhoto] = useState<string | null>(null);

  // Câmera para foto do visitante
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-mask CPF
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

  // Auto-mask Placa
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
      console.warn('Camera error for visitor photo capture:', err);
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
      setVisitorPhoto(dataUrl);
      stopSelfieCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setVisitorPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Campo obrigatório: Nome Completo do Visitante.');
      return;
    }

    if (!cpf.trim() || cpf.replace(/\D/g, '').length < 11) {
      alert('Campo obrigatório: CPF válido (11 dígitos).');
      return;
    }

    if (!plate.trim() || plate.replace(/[^A-Z0-9]/g, '').length < 7) {
      alert('Campo obrigatório: Placa do Veículo válida.');
      return;
    }

    const finalDest = destination === 'Outro (Especificar)' ? customDestination.trim() : destination;
    if (!finalDest) {
      alert('Campo obrigatório: Motivo da Vinda / Seção de Destino na APMG.');
      return;
    }

    const now = new Date();
    const isMerc = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate.replace('-', ''));

    const newEntry = {
      id: `civ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      plate: plate.toUpperCase().trim(),
      plateFormat: isMerc ? 'mercosul' : 'antiga',
      vehicleType: 'Carro',
      brand: 'Particular',
      model: vehicleModel.trim() || 'Veículo Civil',
      color: 'Padrão',
      entryDateTime: now.toISOString(),
      entryDateFormatted: now.toLocaleDateString('pt-BR'),
      entryTimeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      inputMethod: 'manual',
      driverName: fullName.trim(),
      driverType: 'visitante',
      rankOrDoc: `Visitante • CPF: ${cpf.trim()}`,
      warName: fullName.trim().split(' ')[0] + ' ' + (fullName.trim().split(' ').slice(-1)[0] || ''),
      division: 'Visitante Civil',
      driverPhotoUrl: visitorPhoto || undefined,
      destination: finalDest,
      purpose: 'visita',
      guardPost: currentPost || 'Guarda das Armas - Portão Principal (APMG)',
      sentryName: currentSentry || 'Sentinela de Serviço',
      status: 'autorizado',
      notes: `Visitante APMG • Destino: ${finalDest}`,
      createdAt: Date.now(),
    };

    onRegisterCivilEntry(newEntry);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                PÚBLICO EXTERNO • APMG
              </span>
              <span className="text-xs text-slate-400">Controle de Portaria</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono-military uppercase tracking-wide mt-1">
              Aba 3: Cadastro Civil / Visitante & Prestadores
            </h2>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-5">
          {/* Section 1: Dados do Visitante */}
          <div>
            <div className="text-xs font-bold uppercase font-mono-military text-sky-400 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>Dados do Visitante (Campos Obrigatórios)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* 1. Nome Completo */}
              <div className="sm:col-span-7">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  1. Nome Completo do Visitante *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Mariana Ferreira de Souza"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* 2. CPF com Máscara */}
              <div className="sm:col-span-5">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  2. CPF (000.000.000-00) *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none font-mono tracking-wider font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dados do Veículo */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-bold uppercase font-mono-military text-sky-400 mb-3 flex items-center gap-1.5">
              <Car className="w-4 h-4" />
              <span>3. Placa do Veículo (Campo Obrigatório) *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Placa do Veículo */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Placa do Veículo (ABC-1234 ou ABC1D23) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={plate}
                    onChange={handlePlateChange}
                    placeholder="ABC-1234 ou BRA2E19"
                    maxLength={8}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-bold font-plate uppercase tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    required
                  />
                  {plate.length >= 7 && (
                    <div className="scale-90 shrink-0">
                      <BrazilianPlateBadge plate={plate} size="sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Modelo / Cor (opcional) */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Modelo / Cor do Veículo
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Fiat Uno Prata, HB20 Branco"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Motivo da Vinda / Seção de Destino na APMG */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-bold uppercase font-mono-military text-sky-400 mb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              <span>4. Motivo da Vinda / Seção de Destino na APMG *</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Selecione o Destino na APMG *
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      if (e.target.value !== 'Outro (Especificar)') {
                        setCustomDestination('');
                      }
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none font-semibold"
                  >
                    {APMG_CIVIL_DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {destination === 'Outro (Especificar)' ? (
                  <div>
                    <label className="text-[11px] font-bold text-sky-300 block mb-1">
                      Especifique o Motivo / Destino *
                    </label>
                    <input
                      type="text"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      placeholder="Ex: Entrega de suprimentos na cantina"
                      className="w-full rounded-xl border border-sky-500 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                ) : (
                  <div className="flex items-end pb-1">
                    <p className="text-xs text-slate-400">
                      Destino selecionado: <span className="font-bold text-sky-300">{destination}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Foto do Visitante (Opcional/Recomendado para PiP) */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-bold uppercase font-mono-military text-sky-400 mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>5. Foto do Visitante (Para Composição Picture-in-Picture na Entrada)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                {visitorPhoto ? (
                  <img
                    src={visitorPhoto}
                    alt="Foto do Visitante"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-300">
                  {visitorPhoto
                    ? 'Foto registrada! Aparecerá no canto inferior esquerdo do registro de evidência da portaria.'
                    : 'Fotografe o visitante para carimbo visual com PiP no registro de acesso.'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startSelfieCamera}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 px-3 py-1.5 text-xs font-bold text-sky-300 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotografar</span>
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
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Galeria</span>
                  </button>

                  {visitorPhoto && (
                    <button
                      type="button"
                      onClick={() => setVisitorPhoto(null)}
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

        {/* Live Camera Snapshot Modal for Visitor Photo */}
        {isCapturingPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4 text-center">
              <div className="text-sm font-bold font-mono-military uppercase text-slate-100">
                Posicione o Rosto do Visitante
              </div>

              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-sky-500/50 rounded-full m-8 pointer-events-none"></div>
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
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {onCancel && (
            <button
              id="btn-cancel-civil"
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar e Retornar
            </button>
          )}

          <button
            id="btn-save-civil-return"
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-sky-950/50 transition-all cursor-pointer ml-auto"
          >
            <CheckCircle2 className="w-4 h-4 text-sky-200" />
            <span>Salvar, Autorizar e Retornar à Leitura Rápida</span>
          </button>
        </div>
      </form>
    </div>
  );
};
