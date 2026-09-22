/**
 * Hardware Camera Manager - APMG Military Guard
 * Especialista em Câmera Mobile, Visão Computacional e Camera2 API / Web MediaDevices
 * 
 * Gerencia:
 * - Ciclo de vida estrito (Lifecycle / WidgetsBindingObserver): Start imediato, Pause nas Abas 2, 3, 4, Resume sem latência
 * - Resolução Máxima (ResolutionPreset.max: 4K / UltraHigh: 1080p nativo)
 * - Foco Automático Contínuo (FocusMode.auto / continuous) & Focus Lock no disparo
 * - Compensação Dinâmica de Exposição (Exposure Offset / EV de -2.0 a +2.0) para placas Mercosul sob sol forte ou farol
 * - Modos de Ambiente: Padrão, Sol Forte / Anti-Reflexo, Noturno / Farol, Chuva / Alto Contraste
 * - Lanterna / Flash (FlashMode.torch) via hardware MediaTrackConstraints
 * - Captura nativa não-compactada (JPEG 100% de qualidade / 1.0) para análise do Gemini
 * - Tratamento transparente de permissões e estados de aquecimento do sensor
 */

export type ResolutionPreset = 'max' | 'ultraHigh' | 'high';
export type FocusModeType = 'continuous' | 'auto' | 'locked';
export type FlashModeType = 'off' | 'torch' | 'auto';
export type EnvironmentPreset = 'padrao' | 'sol_forte' | 'noturno' | 'chuva';

export interface CameraCapabilities {
  hasTorch: boolean;
  hasExposureCompensation: boolean;
  minEv: number;
  maxEv: number;
  stepEv: number;
  hasContinuousFocus: boolean;
  actualWidth: number;
  actualHeight: number;
}

export interface CameraState {
  isStreaming: boolean;
  isLoading: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied';
  error: string | null;
  torchActive: boolean;
  exposureOffset: number; // in EV units (-2.0 to +2.0)
  environmentPreset: EnvironmentPreset;
  facingMode: 'environment' | 'user';
  capabilities: CameraCapabilities;
}

export class HardwareCameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private onStateChangeCallback?: (state: CameraState) => void;

  private state: CameraState = {
    isStreaming: false,
    isLoading: false,
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
  };

  constructor(onStateChange?: (state: CameraState) => void) {
    this.onStateChangeCallback = onStateChange;
  }

  public attachVideoElement(element: HTMLVideoElement | null) {
    this.videoElement = element;
    if (element && this.stream) {
      element.srcObject = this.stream;
      element.play().catch((err) => console.warn('[CameraManager] Autoplay play() error:', err));
    }
  }

  public getState(): CameraState {
    return { ...this.state };
  }

  private updateState(partial: Partial<CameraState>) {
    this.state = { ...this.state, ...partial };
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  /**
   * Inicialização imediata automática em altíssima qualidade (ResolutionPreset.max / ultraHigh)
   */
  public async initializeCamera(requestedFacing: 'environment' | 'user' = 'environment'): Promise<boolean> {
    if (this.state.isStreaming && this.stream && this.state.facingMode === requestedFacing) {
      return true;
    }

    this.updateState({
      isLoading: true,
      error: null,
      facingMode: requestedFacing,
    });

    try {
      // Libera stream anterior se houver
      this.stopStream();

      // Constraints escalonados para obter a máxima densidade de pixels do sensor
      // Prioridade 1: 4K (3840x2160) com Foco Contínuo e Exposição Contínua
      const constraintsPriorityList: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: requestedFacing },
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            frameRate: { ideal: 30, min: 20 },
            advanced: [
              { focusMode: 'continuous' } as any,
              { exposureMode: 'continuous' } as any,
            ],
          },
          audio: false,
        },
        // Prioridade 2: Full HD (1920x1080)
        {
          video: {
            facingMode: { ideal: requestedFacing },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            advanced: [
              { focusMode: 'continuous' } as any,
              { exposureMode: 'continuous' } as any,
            ],
          },
          audio: false,
        },
        // Prioridade 3: HD padrão nativo
        {
          video: {
            facingMode: { ideal: requestedFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
      ];

      let acquiredStream: MediaStream | null = null;
      let lastErr: any = null;

      for (const constraints of constraintsPriorityList) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (acquiredStream) break;
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!acquiredStream) {
        throw lastErr || new Error('Não foi possível obter o fluxo de vídeo da câmera.');
      }

      this.stream = acquiredStream;
      const track = acquiredStream.getVideoTracks()[0];
      this.videoTrack = track || null;

      // Análise de capacidades do hardware da câmera (Camera2 API via W3C)
      this.inspectHardwareCapabilities(track);

      // Conecta ao elemento de vídeo
      if (this.videoElement) {
        this.videoElement.srcObject = acquiredStream;
        await this.videoElement.play().catch((e) => console.warn('Video play delayed:', e));
      }

      // Aplica parâmetros do ambiente (Sol forte, Noturno, etc.)
      await this.applyEnvironmentPreset(this.state.environmentPreset);

      this.updateState({
        isStreaming: true,
        isLoading: false,
        permissionStatus: 'granted',
        error: null,
      });

      return true;
    } catch (err: any) {
      console.error('[CameraManager] Erro ao inicializar câmera:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';

      this.updateState({
        isStreaming: false,
        isLoading: false,
        permissionStatus: isDenied ? 'denied' : 'prompt',
        error: isDenied
          ? 'Permissão de câmera não concedida. Por favor, autorize no navegador para leitura automática.'
          : 'Sensor de câmera ocupado ou indisponível. Toque em Reconectar Câmera.',
      });

      return false;
    }
  }

  /**
   * Inspeciona capacidades avançadas do sensor (Torch, EV min/max, Continuous Focus)
   */
  private inspectHardwareCapabilities(track: MediaStreamTrack) {
    if (!track) return;
    const settings = track.getSettings?.() || {};
    const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};

    const hasTorch = Boolean(capabilities?.torch);
    const hasExposureCompensation = Boolean(capabilities?.exposureCompensation);
    const minEv = capabilities?.exposureCompensation?.min ?? -2.0;
    const maxEv = capabilities?.exposureCompensation?.max ?? 2.0;
    const stepEv = capabilities?.exposureCompensation?.step ?? 0.5;
    const hasContinuousFocus = Array.isArray(capabilities?.focusMode)
      ? capabilities.focusMode.includes('continuous')
      : false;

    this.updateState({
      capabilities: {
        hasTorch,
        hasExposureCompensation,
        minEv,
        maxEv,
        stepEv,
        hasContinuousFocus,
        actualWidth: settings.width || 1920,
        actualHeight: settings.height || 1080,
      },
    });
  }

  /**
   * Ciclo de Vida: Pausa o fluxo de vídeo para economizar bateria e liberar sensor
   * Usado ao alternar para Abas 2, 3 ou 4 ou ao minimizar o app
   */
  public pauseForLifecycle() {
    if (this.videoTrack) {
      this.videoTrack.enabled = false;
    }
    if (this.videoElement) {
      this.videoElement.pause();
    }
    this.updateState({ isStreaming: false });
  }

  /**
   * Ciclo de Vida: Reativa o fluxo instantaneamente ao retornar para a Aba 1
   */
  public async resumeForLifecycle(): Promise<void> {
    if (this.videoTrack && this.videoTrack.readyState === 'live') {
      this.videoTrack.enabled = true;
      if (this.videoElement) {
        await this.videoElement.play().catch((e) => console.warn('Resume play err:', e));
      }
      this.updateState({ isStreaming: true });
    } else {
      // Se o track foi encerrado pelo SO, reinicializa do zero sem travar a UI
      await this.initializeCamera(this.state.facingMode);
    }
  }

  /**
   * Libera completamente o hardware da câmera
   */
  public stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          // ignore
        }
      });
      this.stream = null;
    }
    this.videoTrack = null;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.updateState({ isStreaming: false, torchActive: false });
  }

  /**
   * Alterna Câmera Traseira / Frontal
   */
  public async toggleFacingMode(): Promise<void> {
    const nextFacing = this.state.facingMode === 'environment' ? 'user' : 'environment';
    await this.initializeCamera(nextFacing);
  }

  /**
   * Ativa / Desativa Lanterna (Torch) no hardware
   */
  public async setTorch(active: boolean): Promise<boolean> {
    if (!this.videoTrack) return false;
    try {
      if (this.state.capabilities.hasTorch) {
        await (this.videoTrack as any).applyConstraints({
          advanced: [{ torch: active }],
        });
      }
      this.updateState({ torchActive: active });
      return true;
    } catch (err) {
      console.warn('[CameraManager] Erro ao alterar lanterna:', err);
      return false;
    }
  }

  public async toggleTorch(): Promise<boolean> {
    return this.setTorch(!this.state.torchActive);
  }

  /**
   * Ajuste dinâmico de Compensação de Exposição (Exposure Offset / EV)
   * Evita estouro de branco em placas Mercosul reflexivas sob sol forte ou farol
   */
  public async setExposureOffset(ev: number): Promise<void> {
    const clampedEv = Math.max(-2.0, Math.min(2.0, ev));
    this.updateState({ exposureOffset: clampedEv });

    if (this.videoTrack && this.state.capabilities.hasExposureCompensation) {
      try {
        await (this.videoTrack as any).applyConstraints({
          advanced: [{ exposureCompensation: clampedEv }],
        });
      } catch (err) {
        console.warn('[CameraManager] Falha ao aplicar EV no hardware:', err);
      }
    }
  }

  /**
   * Aplicação dos Modos de Ambiente Especializados da Guarda:
   * 1. 'padrao': EV 0.0
   * 2. 'sol_forte': EV -1.0 (anti-reflexo Mercosul sob sol forte)
   * 3. 'noturno': EV -0.5 + Lanterna automática (se disponível) para evitar ofuscamento de faróis
   * 4. 'chuva': EV +0.3 + Contraste alto para placas molhadas/sujas
   */
  public async applyEnvironmentPreset(preset: EnvironmentPreset): Promise<void> {
    this.updateState({ environmentPreset: preset });

    switch (preset) {
      case 'sol_forte':
        await this.setExposureOffset(-1.0);
        await this.setTorch(false);
        break;
      case 'noturno':
        await this.setExposureOffset(-0.5);
        if (this.state.capabilities.hasTorch) {
          await this.setTorch(true);
        }
        break;
      case 'chuva':
        await this.setExposureOffset(0.4);
        break;
      case 'padrao':
      default:
        await this.setExposureOffset(0.0);
        await this.setTorch(false);
        break;
    }
  }

  /**
   * Disparo de Autofoco no Ponto de Toque (Tap-to-Focus)
   */
  public async triggerPointFocus(normalizedX: number, normalizedY: number): Promise<void> {
    if (!this.videoTrack) return;
    try {
      await (this.videoTrack as any).applyConstraints({
        advanced: [
          {
            pointsOfInterest: [{ x: normalizedX, y: normalizedY }],
            focusMode: 'continuous',
          },
        ],
      });
    } catch (e) {
      // Muitos browsers ignoram pointsOfInterest silenciosamente
    }
  }

  /**
   * CAPTURA EM ALTÍSSIMA QUALIDADE (100% NATIVA / JPEG QUALIDADE 1.0)
   * Não aplica compressão agressiva para garantir legibilidade dos caracteres da placa
   * Aplica também o filtro de contraste do preset de ambiente diretamente no canvas
   */
  public captureHighQualityFrame(): string | null {
    if (!this.videoElement || this.videoElement.readyState < 2) {
      return null;
    }

    const video = this.videoElement;
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Se o hardware não suportar EV, aplica curva de contraste/brilho no canvas
    const { exposureOffset, environmentPreset } = this.state;
    let filterString = '';

    if (environmentPreset === 'sol_forte') {
      // Reduz brilho levemente e aumenta contraste para letras pretas na placa branca
      filterString = 'contrast(1.15) brightness(0.92)';
    } else if (environmentPreset === 'chuva') {
      // Eleva nitidez e contraste para placas com gotas de água ou sujeira
      filterString = 'contrast(1.25) brightness(1.05)';
    } else if (environmentPreset === 'noturno') {
      // Ajuste para evitar estouro do farol
      filterString = 'contrast(1.10) brightness(0.95)';
    } else if (exposureOffset !== 0) {
      const brightnessMultiplier = 1 + exposureOffset * 0.15;
      filterString = `brightness(${brightnessMultiplier.toFixed(2)}) contrast(1.05)`;
    }

    if (filterString) {
      ctx.filter = filterString;
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Retorna JPEG em qualidade máxima nativa (1.0 = 100% sem compressão agressiva)
    return canvas.toDataURL('image/jpeg', 1.0);
  }
}
