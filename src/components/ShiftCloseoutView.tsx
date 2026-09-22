import React, { useState } from 'react';
import { FileText, Share2, Download, CheckCircle, Clock, Shield, UserCheck, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { VehicleEntry } from '../types';
import { downloadOrShareOfficialPdf } from '../utils/officialPdfGenerator';
import * as XLSX from 'xlsx';

interface ShiftCloseoutViewProps {
  entries: VehicleEntry[];
  currentSentry: string;
  currentPost: string;
  onClearShiftEntries?: () => void;
}

export const ShiftCloseoutView: React.FC<ShiftCloseoutViewProps> = ({
  entries,
  currentSentry,
  currentPost,
  onClearShiftEntries,
}) => {
  const [officerOnDuty, setOfficerOnDuty] = useState(() => {
    return localStorage.getItem('apmg_officer_on_duty') || 'Cap. QOPM Silva';
  });

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('pt-BR');
  
  const [shiftStart, setShiftStart] = useState(`${todayFormatted} - 07:00`);
  const [shiftEnd, setShiftEnd] = useState(`${todayFormatted} - 19:00`);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const totalEntries = entries.length;
  const militaryCount = entries.filter((e) => e.driverType === 'militar').length;
  const civilCount = entries.filter((e) => e.driverType === 'visitante' || e.driverType === 'fornecedor').length;

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      localStorage.setItem('apmg_officer_on_duty', officerOnDuty);
      const res = await downloadOrShareOfficialPdf({
        entries,
        shiftStartDateTime: shiftStart,
        shiftEndDateTime: shiftEnd,
        guardPost: currentPost,
        sentryName: currentSentry,
        officerOnDuty,
      });

      if (res.shared) {
        setPdfSuccessMessage('Relatório em PDF enviado e compartilhado com sucesso!');
      } else {
        setPdfSuccessMessage(`Arquivo ${res.filename} gerado e salvo na memória do dispositivo!`);
      }
    } catch (err: any) {
      console.error('Erro na geração do PDF:', err);
      alert('Falha ao gerar o PDF oficial: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    const rows = entries.map((e) => ({
      'Data Entrada': e.entryDateFormatted,
      'Horário': e.entryTimeFormatted,
      'Placa': e.plate,
      'Padrão': e.fontPattern || e.plateFormat,
      'Condutor': e.driverName,
      'Posto/Grad': e.rankOrDoc || 'Civil',
      'Nome Guerra': e.warName || '',
      'Destino/Subunidade': e.division || e.destination || 'APMG',
      'Veículo': `${e.brand || ''} ${e.model || ''}`,
      'Cor': e.color || '',
      'Sentinela': e.sentryName || currentSentry,
      'Posto Guarda': e.guardPost || currentPost,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turno_APMG');
    XLSX.writeFile(wb, `Relatorio_Turno_Guarda_APMG_${now.toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Quadro de Resumo do Turno Atual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Acessos</div>
          <div className="text-xl font-black text-slate-100 font-mono mt-1">{totalEntries} veículos</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Registrados no livro de serviço</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efetivo Militar</div>
          <div className="text-xl font-black text-blue-400 font-mono mt-1">{militaryCount} entradas</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Oficiais, Praças e Alunos APMG</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitantes & Civis</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">{civilCount} entradas</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Prestadores, fornecedores e público</div>
        </div>
      </div>

      {/* Formulário de Identificação do Turno para o Cabeçalho Oficial do PDF */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Dados Oficiais para Emissão do Relatório Militar (PMPR / APMG)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              OFICIAL DE DIA / COMANDANTE DA GUARDA
            </label>
            <input
              type="text"
              value={officerOnDuty}
              onChange={(e) => setOfficerOnDuty(e.target.value)}
              placeholder="Ex: Cap. QOPM Silva / Ten. Rocha"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              POSTO DE SERVIÇO / PORTARIA
            </label>
            <input
              type="text"
              value={currentPost}
              readOnly
              className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-300 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              INÍCIO DO TURNO
            </label>
            <input
              type="text"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              placeholder="DD/MM/AAAA - HH:MM"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              TÉRMINO DO TURNO
            </label>
            <input
              type="text"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              placeholder="DD/MM/AAAA - HH:MM"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {pdfSuccessMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/50 text-emerald-200 text-xs font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {/* Botões de Ação de Fechamento de Turno */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar Planilha Excel (.xlsx)</span>
        </button>

        <button
          type="button"
          disabled={isGeneratingPdf}
          onClick={handleExportPdf}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/50 transition-all cursor-pointer disabled:opacity-60 active:scale-95"
        >
          {isGeneratingPdf ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>Gerando PDF Militar Oficial...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-white" />
              <span>Exportar e Compartilhar PDF Oficial</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
