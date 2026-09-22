import React, { useState, useEffect } from 'react';
import { Camera, HardDrive, MapPin, ShieldAlert, CheckCircle2, XCircle, Settings, RefreshCw, AlertTriangle, Smartphone, ExternalLink } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onAllGranted: () => void;
  onDismiss?: () => void;
  forceShowSettings?: boolean;
}

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  storage: 'granted' | 'denied' | 'prompt';
  location: 'granted' | 'denied' | 'prompt';
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onAllGranted,
  onDismiss,
  forceShowSettings = false,
}) => {
  const [status, setStatus] = useState<PermissionStatus>({
    camera: 'prompt',
    storage: 'prompt',
    location: 'prompt',
  });
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'app' | 'flutter_code'>('app');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Verifica estado salvo de permissões
  useEffect(() => {
    try {
      const savedCamera = localStorage.getItem('apmg_perm_camera');
      const savedStorage = localStorage.getItem('apmg_perm_storage');
      const savedLocation = localStorage.getItem('apmg_perm_location');

      if (savedCamera === 'granted' && savedStorage === 'granted' && !forceShowSettings) {
        setStatus({
          camera: 'granted',
          storage: 'granted',
          location: savedLocation === 'granted' ? 'granted' : 'prompt',
        });
        onAllGranted();
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage de permissões', e);
    }
  }, [forceShowSettings, onAllGranted]);

  const requestAllPermissions = async () => {
    setIsRequesting(true);
    setErrorMessage('');
    let cameraGranted = false;
    let storageGranted = false;
    let locationGranted = false;

    // 1. Permissão de Câmera (CAMERA)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        // Desliga o stream de teste imediatamente para liberar o hardware
        stream.getTracks().forEach((track) => track.stop());
        cameraGranted = true;
        localStorage.setItem('apmg_perm_camera', 'granted');
      } else {
        throw new Error('Dispositivo sem suporte a MediaDevices/Câmera.');
      }
    } catch (err: any) {
      console.warn('Permissão de câmera negada ou erro:', err);
      cameraGranted = false;
      localStorage.setItem('apmg_perm_camera', 'denied');
    }

    // 2. Permissão de Armazenamento / Mídia (STORAGE)
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        storageGranted = isPersisted || true;
      } else {
        storageGranted = true; // Navegador padrão tem storage local habilitado
      }
      localStorage.setItem('apmg_perm_storage', 'granted');
    } catch (err) {
      storageGranted = true;
      localStorage.setItem('apmg_perm_storage', 'granted');
    }

    // 3. Permissão de Localização / Hora de Rede (TIMESTAMP/GPS)
    try {
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              locationGranted = true;
              localStorage.setItem('apmg_perm_location', 'granted');
              resolve();
            },
            () => {
              locationGranted = false;
              localStorage.setItem('apmg_perm_location', 'denied');
              resolve();
            },
            { timeout: 4000 }
          );
        });
      }
    } catch {
      locationGranted = false;
    }

    setStatus({
      camera: cameraGranted ? 'granted' : 'denied',
      storage: storageGranted ? 'granted' : 'denied',
      location: locationGranted ? 'granted' : 'denied',
    });

    setIsRequesting(false);

    if (cameraGranted && storageGranted) {
      setIsBlocked(false);
      onAllGranted();
    } else {
      // Bloqueio operacional se faltar câmera ou armazenamento
      setIsBlocked(true);
      setErrorMessage(
        'O acesso à Câmera ou ao Armazenamento foi recusado. O leitor ALPR e a emissão de relatórios oficiais não podem operar sem essas autorizações.'
      );
    }
  };

  const handleOpenAppSettings = () => {
    // No Android/iOS Web, orienta o usuário a redefinir permissões no cadeado da barra de endereço
    alert(
      'Para liberar a câmera nas configurações do celular:\n1. Toque no ícone de "Cadeado" ou "Configurações do Site" ao lado do link/URL.\n2. Altere "Câmera" e "Armazenamento" para "Permitir".\n3. Atualize a página do aplicativo.'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho Militar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#1B365D] p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider">APMG • PMPR</span>
                <span className="text-[10px] rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300 font-mono">SEGURANÇA</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight">
                Permissões do Dispositivo
              </h2>
            </div>
          </div>

          {/* Abas Alternativas: Tela Operacional vs Código Flutter */}
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('app')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                activeTab === 'app' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Operacional
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('flutter_code')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'flutter_code' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Flutter
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'app' ? (
            <>
              {/* Mensagem Institucional Oficial APMG */}
              <div className="rounded-xl border border-blue-500/30 bg-[#0F1E36]/80 p-3.5 text-xs text-blue-100 leading-relaxed shadow-sm">
                <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <span>Protocolo da Guarda do Quartel:</span>
                </p>
                Para o correto funcionamento do Controle de Guarda da APMG, o aplicativo necessita de acesso à <strong>Câmera</strong> e ao <strong>Armazenamento</strong> do dispositivo.
              </div>

              {/* Lista dos 3 Requisitos de Permissões Nativas */}
              <div className="space-y-2.5">
                {/* 1. Câmera */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950 border border-blue-700/50 text-blue-300">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Câmera de Alta Resolução</span>
                        <span className="text-[9px] bg-red-950 border border-red-700/60 text-red-300 px-1 rounded font-mono">OBRIGATÓRIA</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Leitor ALPR/OCR de placas em tempo real (Portaria).</p>
                    </div>
                  </div>
                  <div>
                    {status.camera === 'granted' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/70 border border-emerald-500/40 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativa
                      </span>
                    ) : status.camera === 'denied' ? (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-950/70 border border-red-500/40 px-2 py-1 rounded-lg">
                        <XCircle className="h-3.5 w-3.5" /> Negada
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">Pendente</span>
                    )}
                  </div>
                </div>

                {/* 2. Armazenamento / Mídia */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950 border border-amber-700/50 text-amber-300">
                      <HardDrive className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Armazenamento & Mídia</span>
                        <span className="text-[9px] bg-red-950 border border-red-700/60 text-red-300 px-1 rounded font-mono">OBRIGATÓRIA</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Exportação de relatórios oficiais em PDF e fotos periciais.</p>
                    </div>
                  </div>
                  <div>
                    {status.storage === 'granted' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/70 border border-emerald-500/40 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativa
                      </span>
                    ) : status.storage === 'denied' ? (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-950/70 border border-red-500/40 px-2 py-1 rounded-lg">
                        <XCircle className="h-3.5 w-3.5" /> Negada
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">Pendente</span>
                    )}
                  </div>
                </div>

                {/* 3. Localização & Hora de Rede */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-300">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Hora de Rede & Localização</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1 rounded font-mono">OPCIONAL</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Validação do carimbo de tempo (Timestamp do serviço).</p>
                    </div>
                  </div>
                  <div>
                    {status.location === 'granted' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/70 border border-emerald-500/40 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativa
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-mono">Disponível</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Alerta Bloqueante (Se Negado) */}
              {isBlocked && (
                <div className="rounded-xl border border-red-600/50 bg-red-950/40 p-3.5 text-xs text-red-200 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-300 uppercase tracking-wide">
                        Acesso Bloqueado pelo Sistema
                      </div>
                      <p className="mt-1 text-red-200/90 leading-relaxed">
                        {errorMessage}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-red-800/40 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleOpenAppSettings}
                      className="flex items-center gap-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Abrir Configurações do Celular</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Visualização da Arquitetura Flutter / permission_handler */
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Implementação nativa com <strong>permission_handler</strong> para compilação Android/iOS:
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto space-y-1">
                <p className="text-slate-500">// pubspec.yaml</p>
                <p>dependencies:</p>
                <p className="pl-4">permission_handler: ^11.3.1</p>
                <p className="pl-4">camera: ^0.10.5+9</p>
                <br />
                <p className="text-slate-500">// lib/services/permissions_service.dart</p>
                <p>import 'package:permission_handler/permission_handler.dart';</p>
                <br />
                <p>Future&lt;bool&gt; solicitarPermissoesGuardaAPMG() async &#123;</p>
                <p className="pl-4">final status = await [</p>
                <p className="pl-8">Permission.camera,</p>
                <p className="pl-8">Permission.storage,</p>
                <p className="pl-8">Permission.locationWhenInUse,</p>
                <p className="pl-4">].request();</p>
                <br />
                <p className="pl-4">if (status[Permission.camera]!.isPermanentlyDenied) &#123;</p>
                <p className="pl-8 text-amber-300">// Alerta Bloqueante com openAppSettings()</p>
                <p className="pl-8">await openAppSettings();</p>
                <p className="pl-8">return false;</p>
                <p className="pl-4">&#125;</p>
                <p className="pl-4">return status[Permission.camera]!.isGranted;</p>
                <p>&#125;</p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ação Principal */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-2"
            >
              Fechar
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {isBlocked && (
              <button
                type="button"
                onClick={handleOpenAppSettings}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Configurações</span>
              </button>
            )}

            <button
              type="button"
              disabled={isRequesting}
              onClick={requestAllPermissions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verificando Dispositivo...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-emerald-100" />
                  <span>CONCEDER PERMISSÕES AGORA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
