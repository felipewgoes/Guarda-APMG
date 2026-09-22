import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Allow JSON body up to 25MB for high-resolution plate photos
app.use(express.json({ limit: '25mb' }));

// In-memory store for entries (synced with client)
let serverEntries: any[] = [];

// Gemini client lazy init
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    entriesCount: serverEntries.length,
  });
});

// Plate recognition endpoint
app.post('/api/scan-plate', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Nenhuma imagem foi fornecida.' });
    }

    // Strip prefix if exists (e.g. data:image/jpeg;base64,...)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        plate: '',
        plateFormat: 'outro',
        vehicleType: 'Carro',
        brand: '',
        model: '',
        color: '',
        confidence: 0,
        message: 'Chave do Gemini não configurada no servidor. Por favor, digite a placa manualmente.',
      });
    }

    const prompt = `Atue como Engenheiro de Visão Computacional e IA especializado em Reconhecimento Automático de Placas de Veículos (ALPR/ANPR) e análise de padrões tipográficos veiculares do Brasil.

Analise esta imagem capturada no portão da Guarda do Quartel da APMG e realize a extração analítica da tipografia/fonte e do padrão de estampagem:

1. Transcrição dos Caracteres (OCR):
   - Transcreva exatamente a sequência alfanumérica contida na placa.
   - Remova espaços, hífens, pontos ou símbolos.
   - Retorne a placa estritamente em letras MAIÚSCULAS.
   - Se a placa não estiver visível ou não for identificada, retorne "NAO_IDENTIFICADO".

2. Identificação do Padrão e Fonte Tipográfica:
   - "MERCOSUL": Tipografia FE-Schrift, faixa azul superior com emblema/bandeira, estrutura LLLNLNN (3 letras, 1 número, 1 letra, 2 números. Ex: ABC1D23 ou BRA2E19).
   - "ANTIGO_BRASIL": Tipografia cinza tradicional (Mandatory/FE adaptada), tarja de município/UF superior, estrutura LLLNNNN (3 letras, 4 números. Ex: ABC1234).
   - "NAO_IDENTIFICADO": Caso a imagem não permita determinar com clareza o padrão tipográfico da chapa metálica.

3. Retorno Estritamente Estruturado (JSON):
   Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
   {
     "placa_transcrita": "ABC1D23",
     "padrao_fonte": "MERCOSUL",
     "confianca_leitura": "ALTA"
   }
   Valores para confianca_leitura: "ALTA", "MEDIA", "BAIXA".

Também identifique se possível o tipo de veículo (Carro, Moto, Caminhão, Van, Ônibus, Viatura Militar, Utilitário), marca, modelo e cor.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            placa_transcrita: {
              type: Type.STRING,
              description: 'Placa limpa em maiúsculas sem hífen ou espaços (ex: ABC1D23 ou NAO_IDENTIFICADO)',
            },
            padrao_fonte: {
              type: Type.STRING,
              description: 'Classificação estrutural: MERCOSUL, ANTIGO_BRASIL ou NAO_IDENTIFICADO',
            },
            confianca_leitura: {
              type: Type.STRING,
              description: 'Grau de certeza da transcrição: ALTA, MEDIA ou BAIXA',
            },
            tipo_veiculo: {
              type: Type.STRING,
              description: 'Carro, Moto, Caminhão, Van, Ônibus, Viatura Militar, Utilitário ou Outro',
            },
            marca: { type: Type.STRING, description: 'Marca do veículo (ex: Toyota, Fiat, VW)' },
            modelo: { type: Type.STRING, description: 'Modelo do veículo (ex: Corolla, Gol, Hilux)' },
            cor: { type: Type.STRING, description: 'Cor aparente do veículo' },
          },
          required: ['placa_transcrita', 'padrao_fonte', 'confianca_leitura'],
        },
      },
    });

    let resultJson: any = {};
    try {
      const text = response.text || '{}';
      resultJson = JSON.parse(text);
    } catch (parseErr) {
      console.error('Error parsing Gemini JSON response:', parseErr);
    }

    // Normalização dos campos do JSON analítico
    let plateClean = (resultJson.placa_transcrita || resultJson.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plateClean.includes('NAOIDENTIFICADO') || plateClean.includes('NAOENCONTRADO') || plateClean === 'NAO_IDENTIFICADO') {
      plateClean = '';
    }

    let padraoFonte = (resultJson.padrao_fonte || '').toUpperCase().trim();
    if (padraoFonte !== 'MERCOSUL' && padraoFonte !== 'ANTIGO_BRASIL') {
      // Dedução tipográfica com base na estrutura da placa
      if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plateClean)) {
        padraoFonte = 'MERCOSUL';
      } else if (/^[A-Z]{3}[0-9]{4}$/.test(plateClean)) {
        padraoFonte = 'ANTIGO_BRASIL';
      } else {
        padraoFonte = 'NAO_IDENTIFICADO';
      }
    }

    const confianca = (resultJson.confianca_leitura || (plateClean.length >= 7 ? 'ALTA' : 'BAIXA')).toUpperCase();
    const isSuccess = Boolean(plateClean.length >= 6 && padraoFonte !== 'NAO_IDENTIFICADO' && confianca !== 'BAIXA');

    return res.json({
      success: isSuccess,
      placa_transcrita: plateClean,
      padrao_fonte: padraoFonte,
      confianca_leitura: confianca,
      // Campos adicionais e retrocompatibilidade
      plate: plateClean,
      plateFormat: padraoFonte,
      vehicleType: resultJson.tipo_veiculo || resultJson.vehicleType || 'Carro',
      brand: resultJson.marca || resultJson.brand || '',
      model: resultJson.modelo || resultJson.model || '',
      color: resultJson.cor || resultJson.color || '',
      confidence: confianca === 'ALTA' ? 95 : confianca === 'MEDIA' ? 75 : 30,
      message: isSuccess
        ? `Placa ${plateClean} identificada no padrão ${padraoFonte} (Confiança: ${confianca})`
        : 'Placa não identificada com clareza ou formato não determinado. Favor digitar manualmente.',
    });
  } catch (error: any) {
    console.error('Plate recognition error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar a imagem da placa.',
      message: 'Falha na leitura automática da placa. Por favor, digite a placa manualmente.',
    });
  }
});

// Entries API
app.get('/api/entries', (req, res) => {
  res.json({ entries: serverEntries });
});

app.post('/api/entries', (req, res) => {
  const newEntry = req.body;
  if (!newEntry || !newEntry.plate) {
    return res.status(400).json({ error: 'Dados de entrada inválidos.' });
  }

  // Prepend new entry
  serverEntries = [newEntry, ...serverEntries.filter((e) => e.id !== newEntry.id)];
  res.status(201).json({ success: true, entry: newEntry });
});

app.delete('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  serverEntries = serverEntries.filter((e) => e.id !== id);
  res.json({ success: true });
});

// Direct CSV export endpoint for spreadsheet download
app.post('/api/export/csv', (req, res) => {
  try {
    const entries = req.body.entries || serverEntries;

    // Excel Brazilian standard: UTF-8 BOM, semicolon separator
    const header = [
      'ID Registro',
      'Data da Entrada',
      'Hora da Entrada',
      'Placa',
      'Padrão Placa',
      'Tipo de Veículo',
      'Marca',
      'Modelo',
      'Cor',
      'Motorista / Condutor',
      'Categoria Condutor',
      'Posto / Graduação / Doc',
      'Destino / Seção no Quartel',
      'Finalidade da Entrada',
      'Posto da Guarda',
      'Sentinela de Serviço',
      'Status de Acesso',
      'Método de Leitura',
      'Foto Anexada',
      'Observações',
    ].join(';');

    const rows = entries.map((e: any) => {
      return [
        `"${e.id || ''}"`,
        `"${e.entryDateFormatted || ''}"`,
        `"${e.entryTimeFormatted || ''}"`,
        `"${e.plate || ''}"`,
        `"${e.plateFormat || ''}"`,
        `"${e.vehicleType || ''}"`,
        `"${e.brand || ''}"`,
        `"${e.model || ''}"`,
        `"${e.color || ''}"`,
        `"${(e.driverName || '').replace(/"/g, '""')}"`,
        `"${e.driverType || ''}"`,
        `"${(e.rankOrDoc || '').replace(/"/g, '""')}"`,
        `"${(e.destination || '').replace(/"/g, '""')}"`,
        `"${e.purpose || ''}"`,
        `"${e.guardPost || ''}"`,
        `"${(e.sentryName || '').replace(/"/g, '""')}"`,
        `"${e.status || 'autorizado'}"`,
        `"${e.inputMethod === 'camera_ai' ? 'Câmera IA' : 'Manual'}"`,
        `"${e.photoBase64 ? 'Sim (Anexo Gravado)' : 'Sem Foto'}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');

    const todayStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="entradas_guarda_quartel_${todayStr}.csv"`
    );
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Error generating CSV:', err);
    return res.status(500).json({ error: 'Erro ao gerar planilha.' });
  }
});

// Vite middleware / SPA fallback
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Guarda do Quartel App rodando na porta ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
