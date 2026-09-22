import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Keyboard,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  SwitchCamera,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Clock,
  Car,
  Shield,
  Send,
  Eye
} from 'lucide-react';
import {
  VehicleEntry,
  PlateFormat,
  VehicleCategory,
  RegisteredVehicle,
  PopUpToastState,
} from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';
import { generateGuardCompositePhoto } from '../utils/compositePhotoGenerator';

interface QuickScannerViewProps {
  registeredVehicles: RegisteredVehicle[];
  currentSentry: string;
  currentPost: string;
  onSaveEntry: (entry: VehicleEntry) => void;
  onShowPopUp: (toast: PopUpToastState) => void;
  onNavigateToTab: (tab: 'cadastro_militar' | 'cadastro_civil', prefillPlate?: string) => void;
}

export const QuickScannerView: React.FC<QuickScannerViewProps> = ({
  registeredVehicles,
  currentSentry,
  currentPost,
  onSaveEntry,
  onShowPopUp,
  onNavigateToTab,
}) => {
  // Continuous camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanning loop & status
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Quick Manual Input Modal/Overlay
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualPlate, setManualPlate] = useState<string>('');

  // Last captured plate and timestamp for UI feedback
  const [lastDetectedPlate, setLastDetectedPlate] = useState<string | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopTimerRef = useRef<any>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const recentPlatesScannedRef = useRef<Map<string, number>>(new Map());

  // Real-time ticking time from device
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveTimestamp(
        `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio feedback tone
  const playTone = (type: 'success' | 'alert' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
      } else if (type === 'alert') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      }

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.24);
    } catch (e) {
      // Audio might need interaction
    }
  };

  // Camera Initialization
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          advanced: [
            { focusMode: 'continuous' } as any,
            { exposureMode: 'continuous' } as any,
          ],
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Full HD camera rejected, trying generic stream:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play();
          setIsCameraActive(true);
        }
      } catch (fallbackErr: any) {
        console.warn('Camera failed:', fallbackErr);
        setIsCameraActive(false);
        setCameraError('Câmera indisponível no dispositivo. Digitação manual liberada abaixo.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture High-Quality Frame from Live Stream
  const grabCurrentFrame = (): string | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    }
    return null;
  };

  // Cross reference plate with Registered Vehicles Database
  const lookupPlateInFleet = (searchPlate: string): RegisteredVehicle | null => {
    const clean = searchPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean || clean.length < 5) return null;

    return (
      registeredVehicles.find((v) => {
        const vClean = v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return vClean === clean;
      }) || null
    );
  };

  // Core Processing Routine: Process Plate -> Composite Photo (Watermark + PiP) -> Auto Register -> 2.5s Pop-up
  const processRecognizedPlate = async (
    plateDetected: string,
    photoDataUrl?: string,
    detectedFormat?: PlateFormat,
    vBrand?: string,
    vModel?: string,
    vColor?: string
  ) => {
    const cleanPlate = plateDetected.toUpperCase().trim();
    setLastDetectedPlate(cleanPlate);

    const now = new Date();
    const currentDeviceIso = now.toISOString();
    const currentDeviceDate = now.toLocaleDateString('pt-BR');
    const currentDeviceTime = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Check if plate exists in registered database
    const matched = lookupPlateInFleet(cleanPlate);

    if (matched) {
      // 1. POP-UP VERDE COMPACTO (CARD HUD) - DESAPARECE AUTOMATICAMENTE APÓS 2,5 SEGUNDOS
      const rankTitle = matched.rankOrDoc || 'Militar';
      const warNameTitle = matched.warName || matched.ownerName;
      const divisionFormatted = matched.division
        ? (matched.division === 'Outra OPM' ? `${matched.otherOpm || 'Outra OPM'}` : `${matched.division} / APMG`)
        : 'APMG';

      playTone('success');

      // Disparar Pop-up imediatamente (sem aguardar processamento gráfico)
      onShowPopUp({
        id: `${Date.now()}`,
        type: 'green',
        title: `${rankTitle} ${warNameTitle}`,
        subtitle: `Placa ${cleanPlate} • ${currentDeviceTime}`,
        plate: cleanPlate,
        durationMs: 2500, // 2.5 segundos conforme requisito
        personPhotoUrl: matched.photoUrl,
        rankOrDoc: rankTitle,
        warName: warNameTitle,
        division: divisionFormatted,
        statusText: 'ENTRADA REGISTRADA',
        vehicleInfo: `${matched.brand || vBrand || ''} ${matched.model || vModel || ''} (${matched.color || vColor || ''})`.trim(),
        entryTime: currentDeviceTime,
      });

      // 2. PROCESSAMENTO E COMPOSIÇÃO DA "FOTO DE REGISTRO DA GUARDA"
      // Gera imagem composta com carimbo oficial, data/hora e miniatura PiP do condutor
      let compositeEvidenceUrl: string | undefined = undefined;
      try {
        compositeEvidenceUrl = await generateGuardCompositePhoto({
          platePhotoUrl: photoDataUrl,
          driverPhotoUrl: matched.photoUrl,
          plate: cleanPlate,
          dateTimeStr: `${currentDeviceDate} - ${currentDeviceTime}`,
          guardPost: currentPost,
          driverName: matched.ownerName,
          rankOrDoc: rankTitle,
          warName: warNameTitle,
          division: divisionFormatted,
          vehicleDescription: `${matched.brand || vBrand || ''} ${matched.model || vModel || ''} (${matched.color || vColor || ''})`.trim(),
          statusText: 'ENTRADA REGISTRADA',
          sentryName: currentSentry,
        });
      } catch (err) {
        console.warn('Erro ao gerar foto composta:', err);
      }

      // Criar registro persistido
      const newEntry: VehicleEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        plate: cleanPlate,
        plateFormat: detectedFormat || (/^[A-Z]{3}[0-9][A-Z]/.test(cleanPlate.replace('-', '')) ? 'mercosul' : 'antiga'),
        vehicleType: matched.vehicleType || 'Carro',
        brand: matched.brand || vBrand || 'Não especificada',
        model: matched.model || vModel || 'Veículo',
        color: matched.color || vColor || 'Padrão',
        entryDateTime: currentDeviceIso,
        entryDateFormatted: currentDeviceDate,
        entryTimeFormatted: currentDeviceTime,
        photoBase64: photoDataUrl || matched.photoUrl,
        compositePhotoUrl: compositeEvidenceUrl,
        driverPhotoUrl: matched.photoUrl,
        inputMethod: photoDataUrl ? 'camera_ai' : 'manual',
        driverName: matched.ownerName,
        driverType: matched.driverType || 'militar',
        rankOrDoc: rankTitle,
        warName: warNameTitle,
        division: matched.division,
        otherOpm: matched.otherOpm,
        destination: matched.destination || divisionFormatted,
        purpose: 'expediente',
        guardPost: currentPost,
        sentryName: currentSentry,
        status: matched.authorizationLevel === 'bloqueado' ? 'bloqueado' : 'autorizado',
        notes: `Entrada Automática • ${divisionFormatted} • Cód. ${matched.idCode || 'APMG'}`,
        createdAt: Date.now(),
      };

      onSaveEntry(newEntry);
    } else {
      // 2. SE O VEÍCULO / PESSOA NÃO ESTIVER CADASTRADA:
      // Alerta em Destaque Vermelho com opções imediatas:
      // [ MILITAR / EFETIVO ] -> Redireciona para ABA 2 ("CADASTRO MILITAR")
      // [ CIVIL / VISITANTE ] -> Redireciona para ABA 3 ("CADASTRO CIVIL")
      playTone('alert');

      onShowPopUp({
        id: `${Date.now()}`,
        type: 'red',
        title: 'VEÍCULO / PESSOA NÃO CADASTRADA',
        subtitle: `Placa ${cleanPlate} não consta na base militar da APMG. Selecione para direcionamento imediato.`,
        plate: cleanPlate,
        durationMs: 15000,
      });
    }
  };

  // Continuous Camera Loop (Every 2.2s grabs frame and evaluates with AI)
  const performContinuousScan = useCallback(async () => {
    if (isAnalyzingRef.current || !isCameraActive || isManualModalOpen) return;

    const frame = grabCurrentFrame();
    if (!frame) return;

    isAnalyzingRef.current = true;
    setIsScanning(true);

    try {
      const response = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: frame }),
      });

      const data = await response.json();

      if (data.success && data.plate && data.plate.trim().length >= 6) {
        const clean = data.plate.toUpperCase().trim();

        // Prevent repeated triggers on the exact same plate within 8 seconds
        const lastScanTime = recentPlatesScannedRef.current.get(clean) || 0;
        const now = Date.now();

        if (now - lastScanTime > 8000) {
          recentPlatesScannedRef.current.set(clean, now);
          processRecognizedPlate(
            clean,
            frame,
            data.plateFormat,
            data.brand,
            data.model,
            data.color
          );
        }
      }
    } catch (err) {
      console.warn('Continuous scan network tick:', err);
    } finally {
      isAnalyzingRef.current = false;
      setIsScanning(false);
    }
  }, [isCameraActive, isManualModalOpen, registeredVehicles, currentPost, currentSentry]);

  // Hook scan loop
  useEffect(() => {
    scanLoopTimerRef.current = setInterval(() => {
      performContinuousScan();
    }, 2200);

    return () => {
      if (scanLoopTimerRef.current) clearInterval(scanLoopTimerRef.current);
    };
  }, [performContinuousScan]);

  // Handle Manual Trigger from Button or Yellow Pop-up
  const handleManualPlateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlate.trim()) return;

    const clean = manualPlate.toUpperCase().trim();
    setIsManualModalOpen(false);
    setManualPlate('');

    processRecognizedPlate(clean);
  };

  // Quick Action: Simulate Read Failure (AMARELO: "FALHA NA LEITURA - Digitação manual liberada")
  const handleTriggerReadFailure = () => {
    playTone('alert');
    onShowPopUp({
      id: `${Date.now()}`,
      type: 'yellow',
      title: 'FALHA NA LEITURA - Digitação manual liberada',
      subtitle: 'Placa não identificada ou ilegível. Toque em Digitar.',
      durationMs: 2500,
    });
    setIsManualModalOpen(true);
  };

  // Instant 1-Touch Test with Official Database Plates (IDs 101 to 110)
  const handleTestPassage = (v: RegisteredVehicle) => {
    processRecognizedPlate(v.plate);
  };

  return (
    <div className="space-y-4">
      {/* Viewport Card: Continuous Camera Operation */}
      <div className="relative aspect-[16/10] sm:aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
        {/* Live Camera Video Feed */}
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-950">
            <Camera className="w-12 h-12 text-slate-700 mb-2 animate-pulse" />
            <div className="text-sm font-bold text-slate-300">Câmera em Inicialização</div>
            <div className="text-xs text-slate-500 mt-1 max-w-xs">
              Aponte o dispositivo para o veículo que se aproxima do portão da guarda.
            </div>
          </div>
        )}

        {/* Tactical Crosshair / Viewfinder Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
          <div className="relative w-72 sm:w-96 h-28 sm:h-36 border-2 border-dashed border-emerald-400/70 rounded-2xl bg-emerald-500/5 flex flex-col items-center justify-between p-2 shadow-2xl">
            {/* Top-left & Top-right brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>

            {/* Viewfinder HUD Label */}
            <div className="text-[10px] font-mono-military text-emerald-300 font-bold uppercase bg-slate-950/85 px-3 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${isScanning ? 'text-amber-400 animate-spin' : 'text-emerald-400 fill-emerald-400'}`} />
              <span>{isScanning ? 'Varrendo Placa...' : 'Câmera Contínua Ativa'}</span>
            </div>

            {/* Bottom-left & Bottom-right brackets */}
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>
          </div>
        </div>

        {/* Top Floating Telemetry & Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          {/* Post & Live Time */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono-military text-slate-200 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-emerald-300">{currentPost}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{liveTimestamp || '---'}</span>
          </div>

          {/* Quick Camera & Sound Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Alternar Câmera Traseira/Frontal"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Floating Bar on Camera: Instant Manual Input & Simulation */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
          {/* Last plate badge */}
          {lastDetectedPlate ? (
            <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/50 shadow">
              <span className="text-[10px] uppercase font-bold text-slate-400">Última:</span>
              <span className="font-plate font-bold text-slate-100 text-xs tracking-wider">{lastDetectedPlate}</span>
            </div>
          ) : (
            <div className="text-[10px] font-mono-military text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg">
              Aproxime o veículo da cancela
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Fail test trigger */}
            <button
              type="button"
              onClick={handleTriggerReadFailure}
              className="hidden sm:flex items-center gap-1 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-amber-300 transition-colors"
              title="Simular falha de leitura da câmera para liberar digitação manual"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simular Falha</span>
            </button>

            {/* Quick manual keyboard trigger */}
            <button
              id="quick-manual-input-btn"
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-lg transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Digitar Placa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1-TOUCH TEST PASSAGE STRIP (Base Teste Militar IDs 101 a 110) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase font-mono-military text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Simulador de Passagem do Portão (Base Teste Oficial IDs 101-110):</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Toque em qualquer militar para simular a passagem instantânea pela câmera:
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {registeredVehicles.slice(0, 10).map((v) => (
            <button
              key={v.plate}
              type="button"
              onClick={() => handleTestPassage(v)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-emerald-500/60 px-2.5 py-1.5 text-xs text-slate-200 transition-all active:scale-95 group"
            >
              <span className="font-mono text-emerald-400 font-bold text-[11px]">[{v.idCode}]</span>
              <span className="font-plate font-bold tracking-wider">{v.plate}</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">{v.warName || v.ownerName}</span>
            </button>
          ))}

          {/* Test non-registered car (Simula carro não cadastrado -> dispara vermelho) */}
          <button
            type="button"
            onClick={() => processRecognizedPlate('ZZZ-9999')}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-2.5 py-1.5 text-xs text-rose-300 transition-all active:scale-95"
            title="Simular veículo desconhecido (ZZZ-9999) para testar o Pop-up Vermelho"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-plate font-bold">ZZZ-9999</span>
            <span className="text-[10px] text-rose-400 font-bold">(Desconhecido)</span>
          </button>
        </div>
      </div>

      {/* Manual Input Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100 font-mono-military font-bold text-sm uppercase">
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>Digitação Manual da Placa</span>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Caso a câmera não tenha conseguido ler devido à sujeira ou chuva, informe a placa para cruzamento imediato com a base.
            </p>

            <form onSubmit={handleManualPlateSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Placa do Veículo (Mercosul ou Antiga)
                </label>
                <input
                  type="text"
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))}
                  placeholder="Ex: ABC-1234 ou BRA2E19"
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-base font-bold font-plate tracking-widest text-slate-100 uppercase focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-md transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Validar e Registrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
