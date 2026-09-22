import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Keyboard,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Car,
  Shield,
  User,
  MapPin,
  RefreshCw,
  FileCheck,
  SwitchCamera,
  Zap,
  Volume2,
  VolumeX,
  Play,
  CheckCheck,
  Sliders
} from 'lucide-react';
import {
  VehicleEntry,
  PlateFormat,
  VehicleCategory,
  DriverType,
  EntryPurpose,
  RegisteredVehicle,
} from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface PlateScannerProps {
  onSaveEntry: (entry: VehicleEntry) => void;
  registeredVehicles: RegisteredVehicle[];
  currentSentry: string;
  currentPost: string;
}

export const PlateScanner: React.FC<PlateScannerProps> = ({
  onSaveEntry,
  registeredVehicles,
  currentSentry,
  currentPost,
}) => {
  // Mode: 'camera' | 'manual'
  const [entryMode, setEntryMode] = useState<'camera' | 'manual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // AUTOMATIC CAPTURE & REGISTRATION TRIGGER
  const [isAutoTriggerActive, setIsAutoTriggerActive] = useState<boolean>(true);
  const [autoCooldownSeconds, setAutoCooldownSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoSavedNotice, setAutoSavedNotice] = useState<string | null>(null);

  // Captured Photo & Scan status
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<boolean | null>(null);

  // Vehicle & Entry State
  const [plate, setPlate] = useState<string>('');
  const [plateFormat, setPlateFormat] = useState<PlateFormat>('mercosul');
  const [vehicleType, setVehicleType] = useState<VehicleCategory>('Carro');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [color, setColor] = useState<string>('');
  
  // Guard & Driver Info
  const [driverName, setDriverName] = useState<string>('');
  const [driverType, setDriverType] = useState<DriverType>('militar');
  const [rankOrDoc, setRankOrDoc] = useState<string>('');
  const [destination, setDestination] = useState<string>('1ª Companhia de Fuzileiros');
  const [purpose, setPurpose] = useState<EntryPurpose>('expediente');
  const [notes, setNotes] = useState<string>('');

  // Auto-captured Device Timestamp
  const [entryTimestamp, setEntryTimestamp] = useState<{
    iso: string;
    dateFormatted: string;
    timeFormatted: string;
  } | null>(null);

  // Matched from registered fleet
  const [matchedVehicle, setMatchedVehicle] = useState<RegisteredVehicle | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoopTimerRef = useRef<any>(null);

  // Web Audio API beep
  const playConfirmationBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1); // E6 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext might be blocked until user gesture
    }
  };

  // Initialize camera when camera mode is active
  useEffect(() => {
    if (entryMode === 'camera' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [entryMode, facingMode, capturedPhoto]);

  // Set initial timestamp on mount if empty
  useEffect(() => {
    if (!entryTimestamp) {
      captureCurrentDeviceTime();
    }
  }, []);

  const captureCurrentDeviceTime = () => {
    const now = new Date();
    setEntryTimestamp({
      iso: now.toISOString(),
      dateFormatted: now.toLocaleDateString('pt-BR'),
      timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  // Start Camera with Maximum Supported Resolution (1080p / 4K) & continuous focus
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
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
      console.warn('Camera HD access error, trying fallback constraints:', err);
      // Fallback with basic constraints if full HD is rejected
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
        console.warn('Camera fallback error:', fallbackErr);
        setIsCameraActive(false);
        setCameraError(
          'Não foi possível acessar a câmera diretamente. Você pode carregar uma foto, testar com as placas da base ou digitar manualmente.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Check if plate matches pre-registered fleet
  const lookupPlateInRegistry = (searchPlate: string) => {
    const clean = searchPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean || clean.length < 5) {
      setMatchedVehicle(null);
      return null;
    }

    const found = registeredVehicles.find((v) => {
      const vClean = v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return vClean === clean;
    });

    if (found) {
      setMatchedVehicle(found);
      setVehicleType(found.vehicleType);
      setBrand(found.brand);
      setModel(found.model);
      setColor(found.color);
      setDriverName(found.ownerName);
      setDriverType(found.driverType);
      setRankOrDoc(found.warName ? `${found.warName} (${found.rankOrDoc})` : found.rankOrDoc);
      setDestination(found.destination);
      setScanMessage(`Veículo cadastrado na OM: ${found.ownerName} (${found.warName || found.rankOrDoc})!`);
      return found;
    } else {
      setMatchedVehicle(null);
      return null;
    }
  };

  // Handle manual plate input with auto-formatting
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
    setPlate(val);

    const clean = val.replace('-', '');
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean)) {
      setPlateFormat('mercosul');
    } else if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
      setPlateFormat('antiga');
    } else if (clean.startsWith('EB') || clean.startsWith('FAB') || clean.startsWith('MB')) {
      setPlateFormat('outro');
    }

    lookupPlateInRegistry(val);
  };

  // Capture High-Definition Snapshot from Video Canvas
  const captureHighDefFrame = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.readyState < 2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw frame in full resolution
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // High quality 0.92 JPEG
      return canvas.toDataURL('image/jpeg', 0.92);
    }
    return null;
  };

  // Manual Trigger: Capture Snapshot Button
  const handleCaptureSnapshot = () => {
    captureCurrentDeviceTime();
    const dataUrl = captureHighDefFrame();
    if (dataUrl) {
      setCapturedPhoto(dataUrl);
      stopCamera();
      analyzePlateWithAI(dataUrl, false);
    }
  };

  // Handle file upload from device gallery/storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    captureCurrentDeviceTime();

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
      stopCamera();
      analyzePlateWithAI(dataUrl, false);
    };
    reader.readAsDataURL(file);
  };

  // AUTOMATIC EXECUTION: Commit Entry directly to system
  const executeAutoEntryCommit = (
    plateVal: string,
    detectedFormat: PlateFormat,
    vType: VehicleCategory,
    vBrand: string,
    vModel: string,
    vColor: string,
    photoDataUrl: string,
    matched: RegisteredVehicle | null
  ) => {
    const now = new Date();
    const finalTimestamp = {
      iso: now.toISOString(),
      dateFormatted: now.toLocaleDateString('pt-BR'),
      timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const dName = matched ? matched.ownerName : 'Condutor Não Cadastrado';
    const dType = matched ? matched.driverType : 'militar';
    const rDoc = matched
      ? matched.warName
        ? `${matched.warName} (${matched.rankOrDoc})`
        : matched.rankOrDoc
      : 'Identificação na Portaria';
    const dest = matched ? matched.destination : 'Corpo da Guarda';

    const newEntry: VehicleEntry = {
      id: `ent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      plate: plateVal.toUpperCase().trim(),
      plateFormat: detectedFormat,
      vehicleType: matched ? matched.vehicleType : vType || 'Carro',
      brand: (matched ? matched.brand : vBrand) || 'Não especificada',
      model: (matched ? matched.model : vModel) || 'Veículo',
      color: (matched ? matched.color : vColor) || 'Padrão',
      entryDateTime: finalTimestamp.iso,
      entryDateFormatted: finalTimestamp.dateFormatted,
      entryTimeFormatted: finalTimestamp.timeFormatted,
      photoBase64: photoDataUrl,
      inputMethod: 'camera_ai',
      driverName: dName,
      driverType: dType,
      rankOrDoc: rDoc,
      destination: dest,
      purpose: 'expediente',
      guardPost: currentPost,
      sentryName: currentSentry,
      status: matched?.authorizationLevel === 'bloqueado' ? 'bloqueado' : 'autorizado',
      notes: matched ? `Registro automático via Câmera IA • Cód. ${matched.idCode || ''}` : 'Registro automático via Câmera IA',
      createdAt: Date.now(),
    };

    // Play feedback tone
    playConfirmationBeep();

    // Call app-level save
    onSaveEntry(newEntry);

    // Show prominent HUD confirmation
    setAutoSavedNotice(`⚡ VEÍCULO PLACA ${plateVal} DETECTADO E REGISTRADO AUTOMATICAMENTE!`);
    setTimeout(() => {
      setAutoSavedNotice(null);
    }, 6000);
  };

  // Call Server AI to scan plate from photo
  const analyzePlateWithAI = async (photoBase64: string, isAutoScan: boolean = false) => {
    setIsAnalyzing(true);
    setScanMessage('Analisando caracteres da placa na resolução máxima...');
    setScanSuccess(null);

    try {
      const response = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photoBase64 }),
      });

      const data = await response.json();

      if (data.success && data.plate) {
        setPlate(data.plate);
        setPlateFormat(data.plateFormat || 'mercosul');
        if (data.vehicleType) setVehicleType(data.vehicleType);
        if (data.brand) setBrand(data.brand);
        if (data.model) setModel(data.model);
        if (data.color) setColor(data.color);

        setScanSuccess(true);
        setScanMessage(`Placa ${data.plate} identificada com precisão! (${data.brand} ${data.model} ${data.color})`);

        // Check against registered fleet
        const matched = lookupPlateInRegistry(data.plate);

        // If Auto-Trigger is active, freeze photo and automatically commit entry!
        if (isAutoTriggerActive) {
          setCapturedPhoto(photoBase64);
          stopCamera();
          executeAutoEntryCommit(
            data.plate,
            data.plateFormat || 'mercosul',
            data.vehicleType,
            data.brand,
            data.model,
            data.color,
            photoBase64,
            matched
          );
        }
      } else {
        if (!isAutoScan) {
          setScanSuccess(false);
          setScanMessage(
            data.message ||
              'Não foi possível ler a placa automaticamente. A foto foi anexada, por favor digite a placa manualmente.'
          );
        }
      }
    } catch (err: any) {
      console.error('Scan plate error:', err);
      if (!isAutoScan) {
        setScanSuccess(false);
        setScanMessage('Falha ao comunicar com a IA. Por favor, digite a placa manualmente.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Continuous Auto-Scanner Loop
  useEffect(() => {
    if (entryMode === 'camera' && isCameraActive && isAutoTriggerActive && !capturedPhoto && !isAnalyzing) {
      autoLoopTimerRef.current = setTimeout(() => {
        if (isCameraActive && !capturedPhoto && !isAnalyzing) {
          const frame = captureHighDefFrame();
          if (frame) {
            analyzePlateWithAI(frame, true);
          }
        }
      }, 2400);
    }

    return () => {
      if (autoLoopTimerRef.current) {
        clearTimeout(autoLoopTimerRef.current);
      }
    };
  }, [entryMode, isCameraActive, isAutoTriggerActive, capturedPhoto, isAnalyzing]);

  // Reset scanner to take another photo or next car
  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setScanSuccess(null);
    setScanMessage(null);
    setPlate('');
    setBrand('');
    setModel('');
    setColor('');
    setDriverName('');
    setRankOrDoc('');
    setNotes('');
    setMatchedVehicle(null);
    setAutoSavedNotice(null);
    captureCurrentDeviceTime();
    if (entryMode === 'camera') {
      startCamera();
    }
  };

  // Submit and save the entry manually
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate.trim()) {
      alert('Por favor, informe a placa do veículo.');
      return;
    }

    if (!driverName.trim()) {
      alert('Por favor, informe o nome do condutor / motorista.');
      return;
    }

    // Ensure timestamp is ready
    const now = new Date();
    const finalTimestamp = entryTimestamp || {
      iso: now.toISOString(),
      dateFormatted: now.toLocaleDateString('pt-BR'),
      timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const newEntry: VehicleEntry = {
      id: `ent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      plate: plate.toUpperCase().trim(),
      plateFormat: plateFormat,
      vehicleType: vehicleType,
      brand: brand.trim() || 'Não identificada',
      model: model.trim() || 'Veículo',
      color: color.trim() || 'Padrão',
      entryDateTime: finalTimestamp.iso,
      entryDateFormatted: finalTimestamp.dateFormatted,
      entryTimeFormatted: finalTimestamp.timeFormatted,
      photoBase64: capturedPhoto || undefined,
      inputMethod: capturedPhoto && scanSuccess ? 'camera_ai' : 'manual',
      driverName: driverName.trim(),
      driverType: driverType,
      rankOrDoc: rankOrDoc.trim() || (driverType === 'militar' ? 'Militar' : 'Civil'),
      destination: destination.trim() || 'Corpo da Guarda',
      purpose: purpose,
      guardPost: currentPost,
      sentryName: currentSentry,
      status: matchedVehicle?.authorizationLevel === 'bloqueado' ? 'bloqueado' : 'autorizado',
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSaveEntry(newEntry);
    handleRetakePhoto();
  };

  // Instant Test Simulation with Test Base Plates (Páginas 1 e 2 do PDF)
  const handleTestWithBaseVehicle = (v: RegisteredVehicle) => {
    captureCurrentDeviceTime();
    setPlate(v.plate);
    const isMerc = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v.plate.replace('-', ''));
    setPlateFormat(isMerc ? 'mercosul' : 'antiga');
    setVehicleType(v.vehicleType);
    setBrand(v.brand);
    setModel(v.model);
    setColor(v.color);
    setDriverName(v.ownerName);
    setDriverType(v.driverType);
    setRankOrDoc(v.warName ? `${v.warName} (${v.rankOrDoc})` : v.rankOrDoc);
    setDestination(v.destination);
    setMatchedVehicle(v);

    // Generate high-quality tactical license plate mock canvas photo
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark tarmac background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 720);

      // Plate container
      ctx.fillStyle = isMerc ? '#ffffff' : '#94a3b8';
      ctx.roundRect(400, 240, 480, 240, 16);
      ctx.fill();

      // Mercosul blue header
      if (isMerc) {
        ctx.fillStyle = '#003399';
        ctx.roundRect(400, 240, 480, 50, [16, 16, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BRASIL', 640, 275);
      }

      // Plate Text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 92px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(v.plate, 640, 410);

      // Military HUD watermark
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`GUARDA DO QUARTEL • BASE TESTE OM [CÓD. ${v.idCode}]`, 40, 680);

      const simPhoto = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedPhoto(simPhoto);
      setScanSuccess(true);
      setScanMessage(`Placa ${v.plate} lida com sucesso! Veículo de ${v.ownerName} (${v.warName || v.rankOrDoc}).`);

      if (isAutoTriggerActive) {
        executeAutoEntryCommit(
          v.plate,
          isMerc ? 'mercosul' : 'antiga',
          v.vehicleType,
          v.brand,
          v.model,
          v.color,
          simPhoto,
          v
        );
      }
    }
  };

  const quickDestinations = [
    'Comando / Subcomando',
    '1ª Companhia de Fuzileiros',
    'Aprovisionamento / Rancho',
    'Pelotão de Obras / Garagem',
    'Pelotão de Comunicações',
    'Formação Sanitária',
    'Corpo da Guarda',
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Module Title & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100 font-mono-military">
                Scanner Inteligente de Placas
              </h2>
              <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Resolução HD 1080p
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Captura contínua de alta definição com disparo e inclusão automática de dados
            </p>
          </div>
        </div>

        {/* Controls: Auto-Trigger Toggle & Sound & Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Trigger Mode Switch */}
          <button
            type="button"
            onClick={() => setIsAutoTriggerActive(!isAutoTriggerActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              isAutoTriggerActive
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Quando ativo, identifica a placa e registra a entrada instantaneamente sem necessidade de clique"
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoTriggerActive ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
            <span>{isAutoTriggerActive ? 'Modo Automático: Ligado' : 'Modo Automático: Desligado'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
            title={soundEnabled ? 'Som da Guarda Ativado' : 'Som Desativado'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Input Method Toggle */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-mode-camera"
              type="button"
              onClick={() => {
                setEntryMode('camera');
                if (!capturedPhoto) startCamera();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                entryMode === 'camera'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Câmera HD</span>
            </button>
            <button
              id="tab-mode-manual"
              type="button"
              onClick={() => {
                setEntryMode('manual');
                stopCamera();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                entryMode === 'manual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Saved Success Banner Overlay */}
      {autoSavedNotice && (
        <div className="bg-emerald-950 border-b border-emerald-500/40 px-5 py-3 text-xs font-bold text-emerald-200 flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{autoSavedNotice}</span>
          </div>
          <button
            type="button"
            onClick={handleRetakePhoto}
            className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white text-[11px] font-bold transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Próximo Veículo</span>
          </button>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* ONE-CLICK TEST STRIP (Base de Dados Teste IDs 101 a 110) */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono-military uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Base Teste Oficial do Quartel (Páginas 1 e 2 - IDs 101 a 110):</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Clique em qualquer placa para disparar e testar o sistema instantaneamente:
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {registeredVehicles.slice(0, 10).map((v) => (
              <button
                key={v.plate}
                type="button"
                onClick={() => handleTestWithBaseVehicle(v)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/60 px-2.5 py-1 text-xs text-slate-200 transition-all active:scale-95 group"
                title={`Testar Placa ${v.plate} - ${v.ownerName} (${v.warName || v.rankOrDoc})`}
              >
                <span className="font-mono font-bold text-emerald-400 text-[11px]">[{v.idCode}]</span>
                <span className="font-plate tracking-wider font-bold text-slate-100">{v.plate}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{v.warName || v.ownerName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Camera Feed / Photo Preview / Capture Actions */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                {capturedPhoto
                  ? 'Foto da Placa Capturada e Anexada'
                  : entryMode === 'camera'
                  ? 'Visor da Câmera em Alta Qualidade (1080p)'
                  : 'Foto do Veículo'}
                {isAutoTriggerActive && !capturedPhoto && entryMode === 'camera' && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Varredura Ativa
                  </span>
                )}
              </span>
              {entryTimestamp && (
                <span className="flex items-center gap-1 font-mono-military text-emerald-400 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
                  <Clock className="w-3 h-3" />
                  {entryTimestamp.timeFormatted} - {entryTimestamp.dateFormatted}
                </span>
              )}
            </div>

            {/* Viewfinder / Display Area */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center shadow-inner group">
              {capturedPhoto ? (
                // Captured Photo Preview
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Placa Capturada"
                    className="w-full h-full object-contain"
                  />
                  {/* Timestamp HUD badge on the photo */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] font-mono-military border border-emerald-500/40 text-emerald-300">
                    <div className="font-bold">HORÁRIO: {entryTimestamp?.dateFormatted} {entryTimestamp?.timeFormatted}</div>
                    <div className="text-[9px] text-slate-400">ANEXO OFICIAL • GUARDA DO QUARTEL • PLACA: {plate || '---'}</div>
                  </div>

                  {/* Retake button overlay */}
                  <button
                    id="retake-photo-btn"
                    type="button"
                    onClick={handleRetakePhoto}
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Liberar Próximo Veículo</span>
                  </button>
                </div>
              ) : entryMode === 'camera' ? (
                // Live Camera View
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Tactical License Plate Viewfinder Frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="relative w-72 sm:w-96 h-32 sm:h-36 border-2 border-dashed border-emerald-400/80 rounded-xl bg-emerald-500/5 flex flex-col items-center justify-between p-2 shadow-2xl">
                      {/* Top corners */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400"></div>
                      
                      <div className="text-[10px] font-mono-military text-emerald-300 tracking-wider font-bold uppercase bg-slate-950/90 px-2.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
                        <Camera className="w-3 h-3 text-emerald-400" />
                        <span>Enquadre a Placa do Veículo</span>
                      </div>

                      <div className="text-[9px] font-mono-military text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded">
                        {isAutoTriggerActive ? 'DISPARO & INCLUSÃO AUTOMÁTICA ATIVOS' : 'CLIQUE NO BOTÃO ABAIXO PARA CAPTURAR'}
                      </div>

                      {/* Bottom corners */}
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400"></div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400"></div>
                    </div>
                  </div>

                  {/* Switch Camera Button (Front/Rear) */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute top-3 right-3 rounded-full bg-slate-950/80 border border-slate-700 p-2 text-slate-300 hover:text-white transition-colors"
                    title="Alternar Câmera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Manual Mode Without Photo
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Keyboard className="w-12 h-12 text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-300">Modo de Entrada Manual Ativo</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Digite a placa diretamente nos campos ao lado. Se desejar, anexe uma foto tirada anteriormente.
                  </p>
                </div>
              )}

              {/* Scanning Radar Overlay if Analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                  <div className="relative w-16 h-16 mb-3">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping"></div>
                    <div className="w-16 h-16 rounded-full border-2 border-t-emerald-400 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono-military">
                    LENDO PLACA COM INTELIGÊNCIA ARTIFICIAL
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">
                    Processando caracteres em alta definição...
                  </div>
                </div>
              )}
            </div>

            {/* Camera Error Alert if camera not accessible */}
            {cameraError && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Aviso da Câmera:</span> {cameraError}
                </div>
              </div>
            )}

            {/* Scan Result Feedback Banner */}
            {scanMessage && !isAnalyzing && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 text-xs border ${
                  scanSuccess === true
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : scanSuccess === false
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                {scanSuccess === true ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : scanSuccess === false ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                )}
                <div className="flex-1">{scanMessage}</div>
              </div>
            )}

            {/* Camera Trigger & Upload Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {entryMode === 'camera' && !capturedPhoto && (
                <button
                  id="take-snapshot-btn"
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!isCameraActive || isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] py-2.5 px-4 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Foto Manualmente</span>
                </button>
              )}

              {/* Upload file from gallery / disk */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                id="upload-photo-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 px-3.5 text-xs font-semibold text-slate-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-300" />
                <span>Carregar Foto</span>
              </button>

              {/* Fallback manual button */}
              {(!plate || scanSuccess === false) && entryMode === 'camera' && (
                <button
                  id="switch-to-manual-btn"
                  type="button"
                  onClick={() => {
                    setEntryMode('manual');
                    stopCamera();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 py-2.5 px-3.5 text-xs font-semibold text-slate-300 transition-colors"
                >
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escrever Manualmente</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Vehicle Data, Driver, and Entry Details */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <form onSubmit={handleSubmitEntry} className="flex flex-col gap-4">
              {/* License Plate & Recognition Visualizer */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="plate-input" className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono-military flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-400" />
                    Placa do Veículo *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Mercosul, Padrão Antigo ou Militar
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    id="plate-input"
                    type="text"
                    value={plate}
                    onChange={handlePlateChange}
                    placeholder="Ex: ABC-1234 ou BRA2E19"
                    maxLength={8}
                    className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-base font-bold font-plate uppercase tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />

                  {/* Brazilian Plate preview badge */}
                  <div className="shrink-0">
                    <BrazilianPlateBadge plate={plate || '------'} format={plateFormat} size="md" />
                  </div>
                </div>

                {/* Pre-registered Fleet Match Banner */}
                {matchedVehicle && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-950/60 border border-emerald-500/40 p-2.5 text-xs text-emerald-300 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-200">
                          {matchedVehicle.ownerName} {matchedVehicle.warName ? `(${matchedVehicle.warName})` : ''}
                        </div>
                        <div className="text-[11px] text-emerald-400/90 font-mono">
                          CPF: {matchedVehicle.cpf || '---'} • RENAVAM: {matchedVehicle.renavam || '---'} • {matchedVehicle.destination}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      Cód. {matchedVehicle.idCode || 'OM'}
                    </span>
                  </div>
                )}
              </div>

              {/* Vehicle Characteristics (Marca, Modelo, Cor, Tipo) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="vehicle-type-select" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Tipo de Veículo
                  </label>
                  <select
                    id="vehicle-type-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleCategory)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Carro">Carro</option>
                    <option value="Moto">Moto</option>
                    <option value="Caminhão">Caminhão</option>
                    <option value="Viatura Militar">Viatura Militar</option>
                    <option value="Van">Van</option>
                    <option value="Ônibus">Ônibus</option>
                    <option value="Utilitário">Utilitário</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label htmlFor="vehicle-brand-input" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Marca
                  </label>
                  <input
                    id="vehicle-brand-input"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Toyota, VW"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="vehicle-model-input" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Modelo
                  </label>
                  <input
                    id="vehicle-model-input"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: Corolla, Gol"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="vehicle-color-input" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cor
                  </label>
                  <input
                    id="vehicle-color-input"
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Verde Oliva, Prata"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Driver & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label htmlFor="driver-name-input" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Condutor / Motorista *
                  </label>
                  <input
                    id="driver-name-input"
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Ex: Sd. Carlos Silva ou Ten. Oliveira"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-5">
                  <label htmlFor="driver-type-select" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    id="driver-type-select"
                    value={driverType}
                    onChange={(e) => setDriverType(e.target.value as DriverType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="militar">Militar da OM</option>
                    <option value="visitante">Visitante</option>
                    <option value="fornecedor">Fornecedor / Cargas</option>
                    <option value="civil">Servidor Civil</option>
                  </select>
                </div>
              </div>

              {/* Rank/Doc & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rank-doc-input" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Posto / Graduação / Nome de Guerra / CPF
                  </label>
                  <input
                    id="rank-doc-input"
                    type="text"
                    value={rankOrDoc}
                    onChange={(e) => setRankOrDoc(e.target.value)}
                    placeholder="Ex: Sd. E. Silva (Soldado) ou CPF"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="destination-input" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    Destino no Quartel
                  </label>
                  <input
                    id="destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: 1ª Companhia, Rancho, Comando"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick destination chips */}
              <div className="flex flex-wrap gap-1.5">
                {quickDestinations.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => setDestination(dest)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
                  >
                    {dest}
                  </button>
                ))}
              </div>

              {/* Purpose & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="purpose-select" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Finalidade da Entrada
                  </label>
                  <select
                    id="purpose-select"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as EntryPurpose)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="expediente">Expediente Normal</option>
                    <option value="servico">Escala de Serviço / Missão</option>
                    <option value="carga_descarga">Carga / Descarga / Entrega</option>
                    <option value="visita">Visita Oficial / Familiar</option>
                    <option value="instrucao">Instrução Militar / TFM</option>
                    <option value="particular">Particular</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes-input" className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Observações da Guarda (Opcional)
                  </label>
                  <input
                    id="notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Acompanhado de 2 civis, NF 9012..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="pt-2">
                <button
                  id="submit-vehicle-entry-btn"
                  type="submit"
                  disabled={!plate.trim() || !driverName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] py-3 px-4 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>REGISTRAR ENTRADA NA GUARDA DO QUARTEL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
