import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Keyboard,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  SwitchCamera,
  AlertOctagon,
  AlertTriangle,
  Sun,
  Moon,
  CloudRain,
  Sliders,
  Flashlight,
  Shield,
  Send,
  RefreshCw,
  Focus,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Play,
  Pause,
} from 'lucide-react';
import {
  VehicleEntry,
  PlateFormat,
  RegisteredVehicle,
  PopUpToastState,
} from '../types';
import { generateGuardCompositePhoto } from '../utils/compositePhotoGenerator';
import { useMilitaryCamera } from '../hooks/useMilitaryCamera';
import { EnvironmentPreset } from '../utils/hardwareCameraManager';

interface QuickScannerViewProps {
  isActive?: boolean;
  registeredVehicles: RegisteredVehicle[];
  currentSentry: string;
  currentPost: string;
  onSaveEntry: (entry: VehicleEntry) => void;
  onShowPopUp: (toast: PopUpToastState) => void;
  onNavigateToTab: (tab: 'cadastro_militar' | 'cadastro_civil', prefillPlate?: string) => void;
}

interface FlutterToastStatus {
  sucesso: boolean;
  mensagem: string;
  placa: string | null;
  horaCaptura: string;
}

export const QuickScannerView: React.FC<QuickScannerViewProps> = ({
  isActive = true,
  registeredVehicles,
  currentSentry,
  currentPost,
  onSaveEntry,
  onShowPopUp,
  onNavigateToTab,
}) => {
  // Gerenciamento de Hardware de Câmera com Ciclo de Vida Móvel (WidgetsBindingObserver)
  const {
    setVideoRef,
    cameraState,
    tapFocusCoords,
    toggleFacingMode,
    toggleTorch,
    setExposureOffset,
    applyEnvironmentPreset,
    handleTapToFocus,
    captureHighQualityFrame,
    retryPermissions,
  } = useMilitaryCamera({ isActive });

  // Estado de processamento Gemini AI Studio (_isProcessing do Flutter)
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showEvControls, setShowEvControls] = useState<boolean>(false);

  // Quick Manual Input Modal/Overlay (_manualPlacaController / _exibirDialogoEntradaManual)
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualPlate, setManualPlate] = useState<string>('');
  const [manualFormat, setManualFormat] = useState<'MERCOSUL' | 'ANTIGO_BRASIL'>('MERCOSUL');

  // Toast / SnackBar Status (_exibirToastStatus do Flutter)
  const [flutterToast, setFlutterToast] = useState<FlutterToastStatus | null>(null);

  // Last captured plate and timestamp for UI feedback
  const [lastDetectedPlate, setLastDetectedPlate] = useState<string | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');

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

  // Exibição de Toast / SnackBar no padrão do Flutter (_exibirToastStatus)
  const exibirToastStatus = (sucesso: boolean, mensagem: string, placa: string | null = null) => {
    const now = new Date();
    const horaAtual = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setFlutterToast({
      sucesso,
      mensagem,
      placa,
      horaCaptura: horaAtual,
    });

    // Auto-dismiss após 3.5 segundos
    setTimeout(() => {
      setFlutterToast((prev) => (prev?.horaCaptura === horaAtual ? null : prev));
    }, 3500);
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
    vColor?: string,
    fontPattern?: 'MERCOSUL' | 'ANTIGO_BRASIL' | 'NAO_IDENTIFICADO',
    readConfidence?: 'ALTA' | 'MEDIA' | 'BAIXA'
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

    // Dedução do padrão caso venha genérico
    let effectiveFormat: PlateFormat = detectedFormat || 'MERCOSUL';
    if (!effectiveFormat || effectiveFormat === 'NAO_IDENTIFICADO' || effectiveFormat === 'outro') {
      if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanPlate.replace('-', ''))) {
        effectiveFormat = 'MERCOSUL';
      } else if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate.replace('-', ''))) {
        effectiveFormat = 'ANTIGO_BRASIL';
      } else {
        effectiveFormat = 'MERCOSUL';
      }
    }

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
        subtitle: `Placa ${cleanPlate} [${effectiveFormat}] • ${currentDeviceTime}`,
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
      // Gera imagem composta com carimbo oficial pericial e Picture-in-Picture
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
        plateFormat: effectiveFormat,
        fontPattern: (fontPattern && fontPattern !== 'NAO_IDENTIFICADO' ? fontPattern : (effectiveFormat as any)) || 'MERCOSUL',
        readConfidence: readConfidence || (cleanPlate.length >= 7 ? 'ALTA' : 'MEDIA'),
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
        notes: `Entrada Automática • ${divisionFormatted} • Padrão ${effectiveFormat} • Cód. ${matched.idCode || 'APMG'}`,
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
        subtitle: `Placa ${cleanPlate} [${effectiveFormat}] não consta na base militar da APMG. Selecione para direcionamento imediato.`,
        plate: cleanPlate,
        durationMs: 15000,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // PROCESSAMENTO VIA GOOGLE AI STUDIO (GEMINI API) - Flutter `_capturarEProcessar`
  // ---------------------------------------------------------------------------
  const capturarEProcessar = async () => {
    if (isProcessing || !cameraState.isStreaming) return;

    setIsProcessing(true);
    playTone('alert');

    try {
      // Captura o quadro nativo em altíssima qualidade (JPEG 100% não compactado)
      const frame = captureHighQualityFrame();
      if (!frame) {
        exibirToastStatus(false, 'Câmera não pronta para captura.');
        return;
      }

      // Envia para o backend que executa o Gemini 3.8 Flash do Google AI Studio
      const response = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: frame }),
      });

      const data = await response.json();
      const cleanPlate = (data.placa_transcrita || data.plate || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const padraoFonte: 'MERCOSUL' | 'ANTIGO_BRASIL' | 'NAO_IDENTIFICADO' =
        data.padrao_fonte || (data.plateFormat === 'mercosul' ? 'MERCOSUL' : data.plateFormat === 'antiga' ? 'ANTIGO_BRASIL' : 'NAO_IDENTIFICADO');
      const confianca: 'ALTA' | 'MEDIA' | 'BAIXA' = data.confianca_leitura || 'BAIXA';

      if (data.success && cleanPlate.length >= 6 && padraoFonte !== 'NAO_IDENTIFICADO' && confianca !== 'BAIXA') {
        // Sucesso: Exibe Toast verde com hora de captura, placa e padrão tipográfico
        exibirToastStatus(true, `Placa Identificada: ${cleanPlate} [${padraoFonte}]`, cleanPlate);
        await processRecognizedPlate(
          cleanPlate,
          frame,
          padraoFonte,
          data.brand,
          data.model,
          data.color,
          padraoFonte,
          confianca
        );
      } else {
        // Falha no reconhecimento ou reflexo/sujeira (NAO_IDENTIFICADO):
        // 1. Aciona aviso sonoro/visual de falha
        playTone('alert');
        // 2. Notificação visual de falha com Toast
        exibirToastStatus(
          false,
          'Placa Não Identificada ou Padrão Ilegível. Redirecionando para digitação manual...',
          null
        );
        // 3. Exibe caixa de digitação manual de placa imediatamente
        setIsManualModalOpen(true);
      }
    } catch (e) {
      console.error('Erro no envio para o Google AI Studio:', e);
      playTone('alert');
      exibirToastStatus(
        false,
        'Erro na leitura visual da placa. Redirecionando para digitação manual...',
        null
      );
      setIsManualModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Continuous Camera Loop (Opcional - varredura automática a cada 2.5s)
  const performContinuousScan = useCallback(async () => {
    if (
      isAnalyzingRef.current ||
      isProcessing ||
      !cameraState.isStreaming ||
      cameraState.isLoading ||
      isManualModalOpen ||
      !isActive ||
      !isAutoScanActive
    ) {
      return;
    }

    const frame = captureHighQualityFrame();
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
      const clean = (data.placa_transcrita || data.plate || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const padraoFonte = data.padrao_fonte || 'MERCOSUL';
      const confianca = data.confianca_leitura || 'ALTA';

      if (data.success && clean.length >= 6 && padraoFonte !== 'NAO_IDENTIFICADO' && confianca !== 'BAIXA') {
        // Evita disparos repetidos na mesma placa dentro de 8 segundos
        const lastScanTime = recentPlatesScannedRef.current.get(clean) || 0;
        const now = Date.now();

        if (now - lastScanTime > 8000) {
          recentPlatesScannedRef.current.set(clean, now);
          exibirToastStatus(true, `Placa Identificada: ${clean} [${padraoFonte}]`, clean);
          processRecognizedPlate(
            clean,
            frame,
            padraoFonte,
            data.brand,
            data.model,
            data.color,
            padraoFonte,
            confianca
          );
        }
      }
    } catch (err) {
      // silent background tick
    } finally {
      isAnalyzingRef.current = false;
      setIsScanning(false);
    }
  }, [cameraState.isStreaming, cameraState.isLoading, isProcessing, isManualModalOpen, isActive, isAutoScanActive, captureHighQualityFrame]);

  // Hook scan loop
  useEffect(() => {
    if (!isActive || !isAutoScanActive) return;

    scanLoopTimerRef.current = setInterval(() => {
      performContinuousScan();
    }, 2500);

    return () => {
      if (scanLoopTimerRef.current) clearInterval(scanLoopTimerRef.current);
    };
  }, [isActive, isAutoScanActive, performContinuousScan]);

  // Handle Manual Trigger (_exibirDialogoEntradaManual do Flutter)
  const handleManualPlateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlate.trim()) return;

    const clean = manualPlate.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
    setIsManualModalOpen(false);
    setManualPlate('');

    exibirToastStatus(true, `Entrada Manual: ${clean} [${manualFormat}]`, clean);
    processRecognizedPlate(
      clean,
      undefined,
      manualFormat,
      undefined,
      undefined,
      undefined,
      manualFormat,
      'ALTA'
    );
  };

  // Instant 1-Touch Test with Official Database Plates (IDs 101 to 110)
  const handleTestPassage = (v: RegisteredVehicle) => {
    exibirToastStatus(true, `Simulação de Passagem: ${v.plate}`, v.plate);
    processRecognizedPlate(v.plate);
  };

  const actualRes = cameraState.capabilities.actualWidth
    ? `${cameraState.capabilities.actualWidth}x${cameraState.capabilities.actualHeight}`
    : 'Full HD';

  return (
    <div className="space-y-4">
      {/* Viewport Card: Continuous Ultra-High Quality Camera */}
      <div
        className="relative aspect-[16/10] sm:aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl select-none"
        onClick={handleTapToFocus}
      >
        {/* Live Camera Video Feed */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraState.isStreaming ? 'opacity-100' : 'opacity-20'
          }`}
        />

        {/* 1. Indicador de Inicialização da Câmera (Iniciando Câmera da Guarda...) */}
        {cameraState.isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-3 border-emerald-500/20 animate-ping"></div>
              <div className="h-10 w-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin"></div>
              <Camera className="absolute h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-military text-slate-100 tracking-wide">
              Iniciando Câmera da Guarda...
            </div>
            <div className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
              Calibrando ResolutionPreset.max e Foco Contínuo...
            </div>
          </div>
        )}

        {/* 2. OVERLAY DE PROCESSAMENTO DO FLUTTER (_isProcessing) */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6 text-center animate-in fade-in">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin"></div>
              <Camera className="w-6 h-6 text-emerald-300 absolute" />
            </div>
            <div className="text-base sm:text-xl font-bold font-mono-military text-white tracking-wide uppercase">
              Analisando Placa via AI Studio...
            </div>
            <div className="text-xs text-emerald-400 mt-1.5 font-mono font-semibold">
              Google Gemini • Extração de Caracteres em Alta Resolução
            </div>
          </div>
        )}

        {/* 3. Tratamento de Permissão de Câmera ou Erro do Sensor */}
        {cameraState.error && !cameraState.isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold font-mono-military text-slate-100 uppercase">
              Permissão de Câmera Necessária
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mb-4 leading-relaxed">
              {cameraState.error}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retryPermissions}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Autorizar e Conectar Câmera</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>Digitar Placa Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* Tactical Crosshair / Viewfinder Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
          <div className="relative w-72 sm:w-96 h-28 sm:h-36 border-2 border-dashed border-emerald-400/70 rounded-2xl bg-emerald-500/5 flex flex-col items-center justify-between p-2 shadow-2xl">
            {/* Brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>

            {/* Viewfinder HUD Label */}
            <div className="text-[10px] font-mono-military text-emerald-300 font-bold uppercase bg-slate-950/85 px-3 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow">
              <Zap className={`w-3 h-3 ${isScanning ? 'text-amber-400 animate-spin' : 'text-emerald-400 fill-emerald-400'}`} />
              <span>{isScanning ? 'Varrendo Placa...' : 'Autofoco Contínuo Ativo'}</span>
            </div>

            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>
          </div>
        </div>

        {/* Tap-To-Focus Tactical Reticle Animation */}
        {tapFocusCoords && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-200"
            style={{ left: tapFocusCoords.x, top: tapFocusCoords.y }}
          >
            <div className="relative w-12 h-12 flex items-center justify-center animate-pulse">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75"></div>
              <div className="w-8 h-8 rounded-lg border-2 border-emerald-300 flex items-center justify-center">
                <Focus className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <span className="block text-[9px] font-mono-military text-center font-bold text-emerald-300 mt-1 uppercase bg-slate-950/90 px-1 rounded">
              Foco Travado
            </span>
          </div>
        )}

        {/* Top Floating Telemetry & Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
          <div className="flex items-center gap-2 bg-[#1B365D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400/30 text-[11px] font-mono-military text-slate-200 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-emerald-300">{currentPost}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-200 hidden sm:inline">{liveTimestamp || '---'}</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
              {actualRes}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Continuous Auto-scan Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoScanActive(!isAutoScanActive)}
              className={`p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
                isAutoScanActive
                  ? 'bg-emerald-600/90 text-white border-emerald-400'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={isAutoScanActive ? 'Varredura automática ativa (a cada 2.5s)' : 'Varredura automática pausada (somente via botão)'}
            >
              {isAutoScanActive ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Torch / Flash Toggle */}
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
                cameraState.torchActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title={cameraState.torchActive ? 'Desativar Lanterna' : 'Ativar Lanterna (Flash)'}
            >
              <Flashlight className="w-4 h-4" />
            </button>

            {/* EV Controls Toggle */}
            <button
              type="button"
              onClick={() => setShowEvControls(!showEvControls)}
              className={`p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
                showEvControls
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Ajuste de Compensação de Exposição (EV)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Switch Camera */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Alternar Câmera Traseira/Frontal"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            {/* Sound Mute */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic EV & Exposure Controls Drawer */}
        {showEvControls && (
          <div className="absolute top-14 right-3 z-20 w-64 bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-700 p-3 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono-military text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Compensação de Luz (EV)
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {cameraState.exposureOffset > 0 ? `+${cameraState.exposureOffset.toFixed(1)}` : cameraState.exposureOffset.toFixed(1)} EV
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">-2.0</span>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.2"
                value={cameraState.exposureOffset}
                onChange={(e) => setExposureOffset(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">+2.0</span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => setExposureOffset(-1.0)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 text-center"
              >
                -1.0 (Sol)
              </button>
              <button
                type="button"
                onClick={() => setExposureOffset(0.0)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 text-center"
              >
                0.0 (Auto)
              </button>
              <button
                type="button"
                onClick={() => setExposureOffset(0.6)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 text-center"
              >
                +0.6 (Noite)
              </button>
            </div>
          </div>
        )}

        {/* Bottom Floating Bar on Camera: Última Placa & Informações */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto z-10">
          {lastDetectedPlate ? (
            <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/50 shadow">
              <span className="text-[10px] uppercase font-bold text-slate-400">Última:</span>
              <span className="font-plate font-bold text-slate-100 text-xs tracking-wider">{lastDetectedPlate}</span>
            </div>
          ) : (
            <div className="text-[10px] font-mono-military text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg">
              Toque na tela para focar • Clique em Fotografar Placa
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-military text-slate-400 hidden sm:inline bg-slate-950/70 px-2 py-1 rounded">
              Auto-scan: {isAutoScanActive ? 'ATIVO' : 'PAUSADO'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* PAINEL DE BOTÕES FLUTUANTES PRINCIPAIS DO FLUTTER (`Align(bottomCenter)`) */}
      {/* ------------------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          {/* BOTÃO PRINCIPAL: FOTOGRAFAR PLACA (FloatingActionButton.extended do Flutter) */}
          <button
            type="button"
            onClick={capturarEProcessar}
            disabled={isProcessing || !cameraState.isStreaming}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 rounded-2xl bg-[#1B365D] hover:bg-[#25497d] active:scale-95 text-white font-bold px-8 py-3.5 shadow-xl border border-blue-400/40 transition-all cursor-pointer text-sm sm:text-base tracking-wide uppercase font-mono-military disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Camera className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>FOTOGRAFAR PLACA</span>
          </button>

          {/* BOTÃO SECUNDÁRIO: Digitar Manual (ElevatedButton.icon do Flutter) */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-bold px-6 py-3.5 shadow-lg border border-slate-200 transition-all cursor-pointer text-sm sm:text-base"
          >
            <Keyboard className="w-5 h-5 text-slate-800" />
            <span>Digitar Manual</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* TOAST / SNACKBAR DO FLUTTER (_exibirToastStatus)                          */}
      {/* ------------------------------------------------------------------------- */}
      {flutterToast && (
        <div
          className={`rounded-2xl p-4 shadow-2xl border transition-all animate-in slide-in-from-top-2 duration-200 ${
            flutterToast.sucesso
              ? 'bg-emerald-950/95 border-emerald-500 text-white'
              : 'bg-rose-950/95 border-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {flutterToast.sucesso ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight">
                {flutterToast.mensagem}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 font-mono">
                Horário de captura: {flutterToast.horaCaptura}
              </div>
            </div>
            {flutterToast.placa && (
              <span className="font-plate font-bold text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 tracking-wider">
                {flutterToast.placa}
              </span>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE MODOS AMBIENTAIS ESPECÍFICOS (SOL FORTE / NOTURNO / CHUVA / PADRÃO) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase font-mono-military text-slate-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Condição Ambiental da Portaria:</span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => applyEnvironmentPreset('padrao')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                cameraState.environmentPreset === 'padrao'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Padrão (Auto)</span>
            </button>

            <button
              type="button"
              onClick={() => applyEnvironmentPreset('sol_forte')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                cameraState.environmentPreset === 'sol_forte'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Anti-Reflexo: reduz EV em -1.0 para evitar estouro de branco em placas Mercosul sob sol forte"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Sol Forte / Anti-Reflexo</span>
            </button>

            <button
              type="button"
              onClick={() => applyEnvironmentPreset('noturno')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                cameraState.environmentPreset === 'noturno'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Compensação para faróis à noite com lanterna assistida"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Noturno / Farol</span>
            </button>

            <button
              type="button"
              onClick={() => applyEnvironmentPreset('chuva')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                cameraState.environmentPreset === 'chuva'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Aumento de contraste e nitidez para placas molhadas ou sob chuva"
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Chuva / Contraste</span>
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
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-emerald-500/60 px-2.5 py-1.5 text-xs text-slate-200 transition-all active:scale-95 group cursor-pointer"
            >
              <span className="font-mono text-emerald-400 font-bold text-[11px]">[{v.idCode}]</span>
              <span className="font-plate font-bold tracking-wider">{v.plate}</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">{v.warName || v.ownerName}</span>
            </button>
          ))}

          {/* Test non-registered car */}
          <button
            type="button"
            onClick={() => {
              exibirToastStatus(false, 'Placa Desconhecida: ZZZ-9999', 'ZZZ-9999');
              processRecognizedPlate('ZZZ-9999');
            }}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-2.5 py-1.5 text-xs text-rose-300 transition-all active:scale-95 cursor-pointer"
            title="Simular veículo desconhecido (ZZZ-9999) para testar o Pop-up Vermelho"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-plate font-bold">ZZZ-9999</span>
            <span className="text-[10px] text-rose-400 font-bold">(Desconhecido)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* DIÁLOGO DE ENTRADA MANUAL DE PLACA (_exibirDialogoEntradaManual do Flutter)*/}
      {/* ------------------------------------------------------------------------- */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-amber-400" />
                <span>Entrada Manual de Placa</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite a placa do veículo para consultar na base da APMG:
            </p>

            <form onSubmit={handleManualPlateSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))}
                  placeholder="Ex: ABC1D23"
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-bold font-plate tracking-widest text-slate-100 uppercase focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Seletor de Padrão Tipográfico da Placa: [ Mercosul ] ou [ Antigo/Cinza ] */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Padrão Tipográfico da Placa:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualFormat('MERCOSUL')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      manualFormat === 'MERCOSUL'
                        ? 'border-blue-500 bg-blue-950/70 text-blue-200 ring-2 ring-blue-500/40'
                        : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      <span>Mercosul</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">FE-Schrift (LLLNLNN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualFormat('ANTIGO_BRASIL')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      manualFormat === 'ANTIGO_BRASIL'
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-2 ring-zinc-400/40'
                        : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
                      <span>Antigo / Cinza</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">Mandatory (LLLNNNN)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer uppercase font-mono-military"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
