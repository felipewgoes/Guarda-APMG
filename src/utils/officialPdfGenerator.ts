import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VehicleEntry } from '../types';

export interface OfficialPdfParams {
  entries: VehicleEntry[];
  shiftStartDateTime: string;
  shiftEndDateTime: string;
  guardPost: string;
  sentryName: string;
  officerOnDuty: string;
}

/**
 * Gera o RELATÓRIO OFICIAL DO TURNO DE SERVIÇO DA GUARDA DA APMG em formato PDF
 * com cabeçalho oficial da PMPR/APMG, tabela estruturada, paginação e campo para assinatura militar.
 */
export async function generateOfficialShiftPdf(params: OfficialPdfParams): Promise<jsPDF> {
  const {
    entries,
    shiftStartDateTime,
    shiftEndDateTime,
    guardPost,
    sentryName,
    officerOnDuty,
  } = params;

  // Cria documento em orientação Retrato (Portrait), formato A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores Militares Oficiais (PMPR / APMG)
  const navyColor = [15, 30, 54] as [number, number, number]; // #0F1E36
  const goldColor = [212, 175, 55] as [number, number, number]; // #D4AF37
  const pmprGreen = [5, 150, 105] as [number, number, number]; // #059669
  const textDark = [30, 41, 59] as [number, number, number];
  const mutedGray = [100, 116, 139] as [number, number, number];

  // 1. Faixa Superior Militar
  doc.setFillColor(...navyColor);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(...goldColor);
  doc.rect(0, 5, pageWidth, 1.2, 'F');

  // 2. Brasão / Insígnia Vetorial PMPR / APMG
  const emblemX = pageWidth / 2;
  const emblemY = 16;
  
  // Escudo dourado vetorial de fundo
  doc.setFillColor(...goldColor);
  doc.circle(emblemX, emblemY, 6.5, 'F');
  doc.setFillColor(...navyColor);
  doc.circle(emblemX, emblemY, 5.8, 'F');

  // Estrela / Texto do brasão
  doc.setTextColor(...goldColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PMPR', emblemX, emblemY + 1.2, { align: 'center' });

  // 3. Cabeçalho Oficial Hierárquico
  doc.setTextColor(...navyColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ESTADO DO PARANÁ - POLÍCIA MILITAR DO PARANÁ', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...pmprGreen);
  doc.text('ACADEMIA POLICIAL MILITAR DO GUATUPÊ - GUARDA DO QUARTEL', pageWidth / 2, 33, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text('RELATÓRIO DE CONTROLE DE ACESSO DE VEÍCULOS', pageWidth / 2, 39, { align: 'center' });

  // Linha divisória sutil
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.line(14, 42, pageWidth - 14, 42);

  // 4. Metadados do Turno de Serviço (Quadro Informativo)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 44, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Período / Turno:`, 18, 49);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${shiftStartDateTime} até ${shiftEndDateTime}`, 48, 49);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Posto de Serviço:`, 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${guardPost}`, 48, 54);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Sentinela / Operador:`, 18, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${sentryName}`, 48, 59);

  // Coluna Direita do Quadro
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Oficial de Dia:`, 120, 49);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${officerOnDuty}`, 145, 49);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Total Registros:`, 120, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...pmprGreen);
  doc.text(`${entries.length} veículos`, 145, 54);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Emissão:`, 120, 59);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedGray);
  doc.text(`${new Date().toLocaleString('pt-BR')}`, 145, 59);

  // 5. Tabela Estruturada de Registros (Colunas Obrigatórias conforme especificação militar)
  // 1. DATA E HORA DE ENTRADA
  // 2. NOME DO PROPRIETÁRIO / CONDUTOR
  // 3. PLACA DO VEÍCULO
  // 4. VEÍCULO / MODELO
  // 5. ORGANIZAÇÃO / DESTINO
  // 6. TIPO DE CADASTRO
  const tableData = entries.map((entry) => {
    const dateTime = `${entry.entryDateFormatted || ''} - ${entry.entryTimeFormatted || ''}`.trim() || '---';
    const condutor = entry.rankOrDoc && entry.warName
      ? `${entry.rankOrDoc} ${entry.warName}`
      : entry.driverName || 'Não Informado';
    
    const placaFormatada = entry.plate || '---';
    const veiculo = `${entry.brand || ''} ${entry.model || ''}${entry.color ? ` - ${entry.color}` : ''}`.trim() || 'Veículo';
    const destino = entry.division
      ? (entry.division === 'Outra OPM' ? `${entry.otherOpm || 'Outra OPM'}` : `${entry.division} / APMG`)
      : entry.destination || 'APMG';
    
    let tipoCadastro = 'Civil Visitante';
    if (entry.driverType === 'militar') {
      tipoCadastro = entry.division && entry.division !== 'Outra OPM' ? 'Militar APMG' : 'Militar Outra OPM';
    } else if (entry.driverType === 'fornecedor') {
      tipoCadastro = 'Prestador / Fornecedor';
    }

    return [
      dateTime,
      condutor,
      placaFormatada,
      veiculo,
      destino,
      tipoCadastro,
    ];
  });

  autoTable(doc, {
    startY: 65,
    margin: { left: 14, right: 14, bottom: 42 },
    head: [[
      'DATA E HORA DE ENTRADA',
      'NOME DO CONDUTOR',
      'PLACA',
      'VEÍCULO / MODELO',
      'ORGANIZAÇÃO / DESTINO',
      'TIPO DE CADASTRO',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: textDark,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      3: { halign: 'left', cellWidth: 34 },
      4: { halign: 'left', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 26 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Rodapé com numeração de página em todas as páginas
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...mutedGray);
      doc.text(
        `Academia Policial Militar do Guatupê (APMG) - Segurança da Informação • Documento de Uso Ostensivo da PMPR`,
        14,
        pageHeight - 8
      );
      doc.text(
        `Página ${data.pageNumber} de ${pageNumber}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // 6. Rodapé Final com Estatísticas e Assinatura Formal
  // Pega a posição Y após a tabela ou adiciona nova página se não couber
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY + 36 > pageHeight) {
    doc.addPage();
    finalY = 25;
  }

  // Bloco de Totais
  const totalMilitares = entries.filter((e) => e.driverType === 'militar').length;
  const totalCivis = entries.filter((e) => e.driverType === 'visitante' || e.driverType === 'fornecedor').length;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY, pageWidth - 28, 10, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`TOTALIZADOR DO TURNO:`, 18, finalY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(
    `Efetivo/Alunos Militar: ${totalMilitares}   |   Visitantes/Civis: ${totalCivis}   |   Total Geral: ${entries.length} Veículos`,
    62,
    finalY + 6.5
  );

  // Bloco de Assinatura Formal
  const sigY = finalY + 22;
  const sigCenterX = pageWidth / 2;

  doc.setDrawColor(15, 30, 54);
  doc.setLineWidth(0.4);
  doc.line(sigCenterX - 55, sigY, sigCenterX + 55, sigY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(officerOnDuty, sigCenterX, sigY + 4, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedGray);
  doc.text('Oficial de Dia / Comandante da Guarda - APMG', sigCenterX, sigY + 8, { align: 'center' });

  return doc;
}

/**
 * Função para baixar ou compartilhar diretamente o PDF gerado
 */
export async function downloadOrShareOfficialPdf(params: OfficialPdfParams): Promise<{
  shared: boolean;
  filename: string;
}> {
  const doc = await generateOfficialShiftPdf(params);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h');
  const filename = `Relatorio_Guarda_APMG_${dateStr}_${timeStr}.pdf`;

  const pdfBlob = doc.output('blob');

  // Verifica se o navegador suporta compartilhamento nativo de arquivos (Mobile Web Share API)
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([pdfBlob], filename, { type: 'application/pdf' })] })
  ) {
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      await navigator.share({
        title: 'Relatório Oficial Guarda APMG',
        text: `Relatório Oficial de Controle de Acesso da Guarda do Quartel da APMG (${dateStr}).`,
        files: [file],
      });
      return { shared: true, filename };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Falha no Web Share, realizando download direto:', err);
      }
    }
  }

  // Fallback: Download direto na memória do celular / computador
  doc.save(filename);
  return { shared: false, filename };
}
