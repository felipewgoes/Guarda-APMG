import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HardwareCameraManager,
  CameraState,
  EnvironmentPreset,
} from '../utils/hardwareCameraManager';

interface UseMilitaryCameraProps {
  isActive: boolean; // Controlado pelo App.tsx (Aba 1 ativa = true)
}

export function useMilitaryCamera({ isActive }: UseMilitaryCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const managerRef = useRef<HardwareCameraManager | null>(null);

  // Reactive state
  const [cameraState, setCameraState] = useState<CameraState>({
    isStreaming: false,
    isLoading: true,
    permissionStatus: 'prompt',
    error: null,
    torchActive: false,
    exposureOffset: 0.0,
    environmentPreset: 'padrao',
    facingMode: 'environment',
    capabilities: {
      hasTorch: false,
      hasExposureCompensation: false,
      minEv: -2.0,
      maxEv: 2.0,
      stepEv: 0.5,
      hasContinuousFocus: false,
      actualWidth: 0,
      actualHeight: 0,
    },
  });

  // Tap-to-focus visual feedback coordinates on video
  const [tapFocusCoords, setTapFocusCoords] = useState<{ x: number; y: number } | null>(null);

  // Instancia o gerenciador de hardware
  if (!managerRef.current) {
    managerRef.current = new HardwareCameraManager((newState) => {
      setCameraState(newState);
    });
  }

  const manager = managerRef.current;

  // 1. INICIALIZAÇÃO E ABERTURA AUTOMÁTICA IMEDIATA NA ABA 1
  useEffect(() => {
    let isMounted = true;

    if (isActive) {
      // Conecta o elemento de vídeo atual
      if (videoRef.current) {
        manager.attachVideoElement(videoRef.current);
      }

      // Inicializa a câmera imediatamente em segundo plano
      manager.initializeCamera('environment').then(() => {
        if (!isMounted) return;
        if (videoRef.current) {
          manager.attachVideoElement(videoRef.current);
        }
      });
    } else {
      // Aba 2, 3 ou 4: Pausa a câmera imediatamente para economizar bateria e memória
      manager.pauseForLifecycle();
    }

    return () => {
      isMounted = false;
    };
  }, [isActive]);

  // 2. CICLO DE VIDA DO DISPOSITIVO (WidgetsBindingObserver / VisibilityChange)
  // Ao alternar abas do navegador ou bloquear a tela do celular
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isActive) return;

      if (document.hidden) {
        manager.pauseForLifecycle();
      } else {
        manager.resumeForLifecycle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  // Limpeza geral quando desmontado
  useEffect(() => {
    return () => {
      manager.stopStream();
    };
  }, []);

  // Re-atacha quando a ref do vídeo mudar
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && manager) {
      manager.attachVideoElement(element);
    }
  }, [manager]);

  // Controles expostos
  const toggleFacingMode = useCallback(async () => {
    await manager.toggleFacingMode();
  }, [manager]);

  const toggleTorch = useCallback(async () => {
    await manager.toggleTorch();
  }, [manager]);

  const setExposureOffset = useCallback(async (ev: number) => {
    await manager.setExposureOffset(ev);
  }, [manager]);

  const applyEnvironmentPreset = useCallback(async (preset: EnvironmentPreset) => {
    await manager.applyEnvironmentPreset(preset);
  }, [manager]);

  const handleTapToFocus = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const normalizedX = clickX / rect.width;
      const normalizedY = clickY / rect.height;

      setTapFocusCoords({ x: clickX, y: clickY });
      manager.triggerPointFocus(normalizedX, normalizedY);

      setTimeout(() => {
        setTapFocusCoords(null);
      }, 1400);
    },
    [manager]
  );

  const captureHighQualityFrame = useCallback((): string | null => {
    return manager.captureHighQualityFrame();
  }, [manager]);

  const retryPermissions = useCallback(async () => {
    await manager.initializeCamera(cameraState.facingMode);
  }, [manager, cameraState.facingMode]);

  return {
    videoRef,
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
  };
}
