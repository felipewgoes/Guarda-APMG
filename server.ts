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

    const prompt = `Analise atentamente esta imagem de um veículo capturada no portão de entrada de um quartel/guarda militar.
Sua tarefa é extrair com precisão a PLACA do veículo brasileiro e identificar as características do veículo.

Diretrizes da Placa Brasileira:
- Padrão Mercosul: 7 caracteres (3 letras, 1 número, 1 letra, 2 números, ex: BRA2E19, ABC1D23).
- Padrão Antigo Brasileiro (cinza/vermelha): 7 caracteres alfanuméricos com hífen opcional (ex: ABC-1234 ou ABC1234).
- Viaturas Militares do Exército Brasileiro (EB), Marinha ou FAB: podem ter formato como EB09821, EB-12345, FAB-9999, MB-1111.
- Caso a placa esteja parcialmente visível ou um pouco borrada, tente inferir os caracteres com máximo rigor. Se não for possível ler a placa de jeito nenhum, deixe a placa vazia "".

Identifique também:
- Marca (ex: Toyota, Volkswagen, Fiat, Chevrolet, Ford, Honda, Hyundai, Agrale, Mercedes-Benz, Renault, Jeep, Yamaha, etc.)
- Modelo (ex: Corolla, Hilux, Gol, Onix, HB20, Marruá, Compass, Civic, Cargo, etc.)
- Cor aparente (ex: Verde Oliva, Preto, Branco, Prata, Cinza, Vermelho, Azul)
- Tipo de veículo: 'Carro', 'Moto', 'Caminhão', 'Van', 'Ônibus', 'Viatura Militar', 'Utilitário', ou 'Outro'.`;

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
            plateFound: { type: Type.BOOLEAN, description: 'Se alguma placa foi detectada' },
            plate: { type: Type.STRING, description: 'Texto da placa em maiúsculas sem espaços (ex: BRA2E19 ou ABC-1234 ou EB09821)' },
            plateFormat: { type: Type.STRING, description: 'mercosul, antiga, militar, ou outro' },
            vehicleType: { type: Type.STRING, description: 'Carro, Moto, Caminhão, Van, Ônibus, Viatura Militar, Utilitário, Outro' },
            brand: { type: Type.STRING, description: 'Marca do veículo' },
            model: { type: Type.STRING, description: 'Modelo do veículo' },
            color: { type: Type.STRING, description: 'Cor predominante' },
            confidence: { type: Type.NUMBER, description: 'Nível de confiança de 0 a 100' },
            notes: { type: Type.STRING, description: 'Observações sobre a placa ou veículo' },
          },
          required: ['plateFound', 'plate', 'vehicleType'],
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

    // Clean up plate string
    let plateClean = (resultJson.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Check Mercosul vs Antiga format
    let format = resultJson.plateFormat || 'outro';
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plateClean)) {
      format = 'mercosul';
    } else if (/^[A-Z]{3}[0-9]{4}$/.test(plateClean)) {
      format = 'antiga';
      // format as ABC-1234 for display if desired
    } else if (plateClean.startsWith('EB') || plateClean.startsWith('FAB') || plateClean.startsWith('MB')) {
      format = 'militar';
    }

    return res.json({
      success: Boolean(resultJson.plateFound && plateClean.length >= 5),
      plate: plateClean,
      plateFormat: format,
      vehicleType: resultJson.vehicleType || 'Carro',
      brand: resultJson.brand || '',
      model: resultJson.model || '',
      color: resultJson.color || '',
      confidence: resultJson.confidence ?? (plateClean ? 92 : 30),
      notes: resultJson.notes || '',
      message: plateClean ? 'Placa identificada com sucesso' : 'Não foi possível ler a placa com clareza. Você pode digitá-la manualmente.',
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
