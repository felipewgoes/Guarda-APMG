/**
 * Utilitário de Composição e Processamento da "Foto de Registro da Guarda"
 * Academia Policial Militar do Guatupê (APMG) - PMPR
 * 
 * Requisitos:
 * 1. Imagem Principal: Foto da placa/veículo capturada no momento da entrada.
 * 2. Carimbo/Marca d'Água: Data e Hora exatas (dd/mm/aaaa - hh:mm:ss), identificação da APMG e posto.
 * 3. Miniatura do Condutor (Picture-in-Picture): Canto inferior esquerdo em sobreposição com moldura.
 *    Se não houver foto, insere silhueta/avatar padrão indicando "SEM FOTO".
 */

export interface CompositePhotoOptions {
  platePhotoUrl?: string;
  driverPhotoUrl?: string;
  plate: string;
  dateTimeStr: string; // Ex: "22/09/2026 - 14:32:15"
  guardPost?: string; // Ex: "Guarda das Armas - Portão Principal (APMG)"
  driverName?: string;
  rankOrDoc?: string;
  warName?: string;
  division?: string; // Ex: "EsFO / APMG", "EsFAEP", "ABM", etc.
  vehicleDescription?: string;
  statusText?: string;
  sentryName?: string;
}

/**
 * Carrega uma imagem de forma assíncrona com timeout de segurança
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    // Timeout de 3s para evitar travamento em URLs externas lentas
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error('Image load timeout'));
      }
    }, 3000);
    img.src = src;
  });
}

/**
 * Desenha silhueta/avatar vetorial padrão no canvas para condutores sem foto
 */
function drawNoPhotoAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  // Fundo gradiente tático
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size, size);

  // Silhueta da cabeça
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  const headRadius = size * 0.2;
  const headCenterX = x + size * 0.5;
  const headCenterY = y + size * 0.38;
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Silhueta dos ombros/busto
  ctx.beginPath();
  ctx.ellipse(headCenterX, y + size * 0.85, size * 0.38, size * 0.28, 0, Math.PI, 0);
  ctx.fill();

  // Tarja "SEM FOTO"
  ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
  ctx.fillRect(x, y + size - 26, size, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SEM FOTO REGISTRADA', x + size / 2, y + size - 13);
}

/**
 * Gera a imagem pericial composta com Watermark e PiP
 */
export async function generateGuardCompositePhoto(
  options: CompositePhotoOptions
): Promise<string> {
  const width = 1280;
  const height = 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. IMAGEM PRINCIPAL (FOTO DA PLACA / VEÍCULO)
  let mainImageLoaded = false;
  if (options.platePhotoUrl) {
    try {
      const mainImg = await loadImage(options.platePhotoUrl);
      // Ajustar пропорções (cover)
      const scale = Math.max(width / mainImg.width, height / mainImg.height);
      const scaledW = mainImg.width * scale;
      const scaledH = mainImg.height * scale;
      const posX = (width - scaledW) / 2;
      const posY = (height - scaledH) / 2;
      ctx.drawImage(mainImg, posX, posY, scaledW, scaledH);
      mainImageLoaded = true;
    } catch {
      mainImageLoaded = false;
    }
  }

  if (!mainImageLoaded) {
    // Fundo Pericial de Câmera de Monitoramento se não houver foto de entrada
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a101d');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid óptico tático
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Mira de leitura ótica no centro
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    const cw = 440;
    const ch = 160;
    const cx = (width - cw) / 2;
    const cy = (height - ch) / 2 - 20;

    // Cantoneiras da mira
    const corner = 24;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(cx, cy + corner);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + corner, cy);
    // Top-right
    ctx.moveTo(cx + cw - corner, cy);
    ctx.lineTo(cx + cw, cy);
    ctx.lineTo(cx + cw, cy + corner);
    // Bottom-right
    ctx.moveTo(cx + cw, cy + ch - corner);
    ctx.lineTo(cx + cw, cy + ch);
    ctx.lineTo(cx + cw - corner, cy + ch);
    // Bottom-left
    ctx.moveTo(cx + corner, cy + ch);
    ctx.lineTo(cx, cy + ch);
    ctx.lineTo(cx, cy + ch - corner);
    ctx.stroke();

    // Renderizar Placa estilizada no centro da câmera
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx + 20, cy + 20, cw - 40, ch - 40, 10);
    ctx.fill();
    ctx.stroke();

    // Faixa azul mercosul ou antiga
    ctx.fillStyle = '#003399';
    ctx.beginPath();
    ctx.roundRect(cx + 22, cy + 22, cw - 44, 28, [8, 8, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRASIL • PMPR', cx + cw / 2, cy + 41);

    // Texto da Placa
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 44px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(options.plate || 'ABC-1234', cx + cw / 2, cy + 96);
  }

  // 2. CARIMBO E MARCA D'ÁGUA OFICIAL (PMPR / APMG)

  // 2.1 Faixa Superior: Identificação da Academia
  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.fillRect(0, 0, width, 52);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(width, 52);
  ctx.stroke();

  // Texto Topo Esquerdo
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('POLÍCIA MILITAR DO PARANÁ', 24, 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ACADEMIA POLICIAL MILITAR DO GUATUPÊ (APMG)', 24, 38);

  // Texto Topo Direito: Carimbo de Segurança
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SISTEMA SENTINELA • CONTROLE DE ACESSO DA GUARDA', width - 24, 20);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`STATUS: ${options.statusText || 'ENTRADA REGISTRADA'}`, width - 24, 38);

  // 2.2 Faixa Inferior: Carimbo Oficial com Data, Hora, Placa e Destino
  const bottomBarHeight = 74;
  const bottomY = height - bottomBarHeight;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.fillRect(0, bottomY, width, bottomBarHeight);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  ctx.lineTo(width, bottomY);
  ctx.stroke();

  // Informações no Rodapé (ao lado do PiP)
  const textStartX = 230; // Margem para não colidir com o PiP que fica no canto inferior esquerdo

  // Linha 1 do Rodapé: Data/Hora e Posto
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`REGISTRO: ${options.dateTimeStr}`, textStartX, bottomY + 24);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px sans-serif';
  ctx.fillText(` • POSTO: ${options.guardPost || 'GUARDA DAS ARMAS / PORTÃO PRINCIPAL (APMG)'}`, textStartX + 220, bottomY + 24);

  // Linha 2 do Rodapé: Placa, Condutor e Divisão da APMG
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`PLACA: ${options.plate}`, textStartX, bottomY + 48);

  const idFormatted = [
    options.rankOrDoc,
    options.warName || options.driverName,
    options.division ? `(${options.division})` : '',
  ].filter(Boolean).join(' ');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(` | CONDUTOR: ${idFormatted || 'NÃO CADASTRADO'}`, textStartX + 160, bottomY + 48);

  if (options.vehicleDescription) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`VEÍCULO: ${options.vehicleDescription}`, textStartX, bottomY + 66);
  }

  // 3. MINIATURA DO CONDUTOR (PICTURE-IN-PICTURE NO CANTO INFERIOR ESQUERDO)
  const pipSize = 175;
  const pipX = 24;
  const pipY = height - bottomBarHeight - pipSize - 16; // Canto inferior esquerdo sobreposto à cena

  // Sombra pericial do PiP
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;

  // Fundo do quadro do PiP
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(pipX, pipY, pipSize, pipSize, 10);
  ctx.fill();
  ctx.restore();

  // Desenhar foto do condutor ou silhueta padrão
  let driverPhotoDrawn = false;
  if (options.driverPhotoUrl) {
    try {
      const driverImg = await loadImage(options.driverPhotoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipSize, pipSize, 10);
      ctx.clip();

      // Ajuste proporcional da foto no PiP
      const scale = Math.max(pipSize / driverImg.width, pipSize / driverImg.height);
      const sw = driverImg.width * scale;
      const sh = driverImg.height * scale;
      const px = pipX + (pipSize - sw) / 2;
      const py = pipY + (pipSize - sh) / 2;
      ctx.drawImage(driverImg, px, py, sw, sh);
      ctx.restore();
      driverPhotoDrawn = true;
    } catch {
      driverPhotoDrawn = false;
    }
  }

  if (!driverPhotoDrawn) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pipX, pipY, pipSize, pipSize, 10);
    ctx.clip();
    drawNoPhotoAvatar(ctx, pipX, pipY, pipSize);
    ctx.restore();
  }

  // Moldura Tática do PiP (Borda verde esmeralda com identificador)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(pipX, pipY, pipSize, pipSize, 10);
  ctx.stroke();

  // Etiqueta superior do PiP: "FOTO DO CONDUTOR"
  ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
  ctx.beginPath();
  ctx.roundRect(pipX + 6, pipY + 6, pipSize - 12, 20, 4);
  ctx.fill();

  ctx.fillStyle = '#020617';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FOTO DO CONDUTOR', pipX + pipSize / 2, pipY + 16);

  // Retorna a imagem codificada em Base64 JPEG em alta resolução
  return canvas.toDataURL('image/jpeg', 0.9);
}
