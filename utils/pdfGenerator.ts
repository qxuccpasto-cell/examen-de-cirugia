import { jsPDF } from 'jspdf';
import { Student, CaseData, FeedbackData, PerformanceStatus } from '../types';

export const generatePDF = (
  student: Student,
  caseData: CaseData,
  feedback: FeedbackData,
  responses: Record<string, PerformanceStatus>,
  evaluatorNotes: string,
  evaluatorName: string
) => {
  const doc = new jsPDF();
  
  // Configuration constants
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 20;

  // Helper: Check if content fits, else add page
  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - margin) {
      doc.addPage();
      currentY = 20; // Reset Y for new page
      return true;
    }
    return false;
  };

  // Helper: Draw Section Title
  const drawSectionTitle = (title: string, bgColor: [number, number, number] = [241, 245, 249]) => {
    checkPageBreak(15);
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 3, currentY + 5.5);
    currentY += 12;
  };

  // --- 1. HEADER ---
  doc.setFillColor(0, 51, 102); // Dark Blue
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Evaluación ECOE - Cirugía", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, pageWidth - margin, 20, { align: 'right' });

  currentY = 40;

  // --- 2. INFO BOXES (Grid) ---
  const boxHeight = 35;
  const colWidth = (contentWidth / 2) - 3;

  // Student Box
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, colWidth, boxHeight, 'FD');
  
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ESTUDIANTE", margin + 4, currentY + 8);
  
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, margin + 4, currentY + 18);
  doc.setFontSize(10);
  doc.text(`Documento: ${student.id}`, margin + 4, currentY + 26);

  // Case Box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + colWidth + 6, currentY, colWidth, boxHeight, 'FD');
  
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CASO CLÍNICO / PROCEDIMIENTO", margin + colWidth + 10, currentY + 8);
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const topicLines = doc.splitTextToSize(caseData.topic, colWidth - 8);
  doc.text(topicLines, margin + colWidth + 10, currentY + 18);
  
  currentY += boxHeight + 12;

  // --- 3. SCORE SECTION ---
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 51, 102);
  doc.text(`Nota Final: ${feedback.finalScore.toFixed(1)} / 5.0`, margin, currentY);
  
  // Justification Box if exists
  if (feedback.justification) {
    currentY += 8;
    const justLabel = "Justificación del Docente:";
    const justLines = doc.splitTextToSize(feedback.justification, contentWidth - 4);
    const justHeight = (justLines.length * 5) + 12;
    
    checkPageBreak(justHeight);
    
    doc.setFillColor(255, 255, 240); // Light yellow
    doc.setDrawColor(230, 230, 200);
    doc.rect(margin, currentY, contentWidth, justHeight, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "bold");
    doc.text(justLabel, margin + 3, currentY + 6);
    
    doc.setTextColor(0);
    doc.setFont("helvetica", "italic");
    doc.text(justLines, margin + 3, currentY + 12);
    
    currentY += justHeight + 5;
  } else {
    currentY += 15;
  }

  // --- 4. FEEDBACK BLOCKS ---
  const feedbackBlocks = [
    { title: "Aspectos Logrados", data: feedback.strengths, color: [22, 163, 74], bg: [220, 252, 231] },
    { title: "Aspectos por Mejorar", data: feedback.weaknesses, color: [180, 83, 9], bg: [254, 243, 199] },
    { title: "Recomendaciones Clínicas", data: feedback.recommendations, color: [29, 78, 216], bg: [219, 234, 254] }
  ];

  feedbackBlocks.forEach((block) => {
    // Header
    checkPageBreak(20);
    doc.setFillColor(block.bg[0], block.bg[1], block.bg[2]);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setTextColor(block.color[0], block.color[1], block.color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(block.title.toUpperCase(), margin + 3, currentY + 5.5);
    currentY += 10;

    // Content
    doc.setTextColor(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    if (block.data.length === 0) {
      doc.text("No se registraron comentarios.", margin + 3, currentY);
      currentY += 6;
    } else {
      block.data.forEach(item => {
        const bullet = "• ";
        const lines = doc.splitTextToSize(bullet + item, contentWidth - 6);
        checkPageBreak(lines.length * 5);
        doc.text(lines, margin + 3, currentY);
        currentY += (lines.length * 5) + 2;
      });
    }
    currentY += 6;
  });

  currentY += 5;

  // --- 5. CHECKLIST TABLE ---
  if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Lista de Chequeo", margin, currentY);
  currentY += 8;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("ESTADO", margin + 3, currentY + 5);
  doc.text("CRITERIO / HABILIDAD", margin + 35, currentY + 5);
  currentY += 8;

  // Table Rows
  caseData.checklist.forEach((item, index) => {
    const status = responses[item.id] || PerformanceStatus.NOT_DONE;
    let statusText = "NO REALIZADO";
    let statusColor: [number, number, number] = [100, 116, 139]; // Gray
    
    if (status === PerformanceStatus.CORRECT) {
        statusText = "CORRECTO";
        statusColor = [22, 163, 74];
    } else if (status === PerformanceStatus.PARTIAL) {
        statusText = "PARCIAL";
        statusColor = [202, 138, 4];
    } else if (status === PerformanceStatus.INCORRECT) {
        statusText = "ERROR";
        statusColor = [220, 38, 38];
    }

    const itemText = `[${item.category}] ${item.text}`;
    const textLines = doc.splitTextToSize(itemText, contentWidth - 40);
    const rowHeight = (textLines.length * 4.5) + 6;

    // Check page break for row
    if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage();
        currentY = 20;
        // Re-draw header on new page
        doc.setFillColor(226, 232, 240);
        doc.rect(margin, currentY, contentWidth, 8, 'F');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("ESTADO", margin + 3, currentY + 5);
        doc.text("CRITERIO / HABILIDAD", margin + 35, currentY + 5);
        currentY += 8;
    }

    // Zebra striping
    if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    // Status Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, margin + 3, currentY + 4);

    // Item Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.text(textLines, margin + 35, currentY + 4);

    currentY += rowHeight;
  });

  // --- 6. EVALUATOR NOTES ---
  if (evaluatorNotes) {
      currentY += 10;
      drawSectionTitle("Notas del Docente");
      
      const noteLines = doc.splitTextToSize(evaluatorNotes, contentWidth - 6);
      const noteHeight = (noteLines.length * 5) + 10;
      
      checkPageBreak(noteHeight);
      
      doc.setDrawColor(200);
      doc.rect(margin, currentY, contentWidth, noteHeight, 'S');
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(noteLines, margin + 3, currentY + 6);
  }

  // --- 7. SIGNATURE SECTION ---
  if (currentY + 30 > pageHeight - margin) {
     doc.addPage();
     currentY = 40;
  } else {
     currentY += 30;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.line(margin, currentY, margin + 80, currentY); // Signature line
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Evaluado por:", margin, currentY + 5);
  
  doc.setFont("helvetica", "normal");
  doc.text(evaluatorName, margin, currentY + 10);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Docente Cirugía / Evaluador ECOE", margin, currentY + 14);


  // --- FOOTER (Page Numbers) ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount} | Designed by Burb4noX`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save
  doc.save(`${student.name.replace(/\s+/g, '_')}_${student.id}.pdf`);
};