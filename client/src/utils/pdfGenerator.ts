import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GeneratePdfOptions {
  elementId: string;
  filename: string;
  title?: string;
}

/**
 * Generates an A4 PDF from a dedicated DOM container.
 * Never captures the entire page or surrounding CRM UI.
 */
export async function generateA4Pdf({
  elementId,
  filename,
}: GeneratePdfOptions): Promise<{ pdfBlob: Blob; download: () => void }> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Target container #${elementId} not found in document.`);
  }

  // Standard A4 width at 96 DPI is ~794px. We render at fixed 794px width on clone
  // so mobile or responsive screen widths do not compress or distort the document layout.
  const a4StandardPxWidth = 794;

  const canvas = await html2canvas(element, {
    scale: 2, // 2x crisp retina resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200,
    onclone: (clonedDoc) => {
      const el = clonedDoc.getElementById(elementId);
      if (el) {
        el.style.width = `${a4StandardPxWidth}px`;
        el.style.maxWidth = `${a4StandardPxWidth}px`;
        el.style.minWidth = `${a4StandardPxWidth}px`;
        el.style.boxSizing = 'border-box';
        el.style.margin = '0 auto';
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 8; // 8mm left and right margins for clean alignment
  const marginY = 8; // 8mm top and bottom margins
  const printableWidth = pageWidth - marginX * 2; // 194mm
  const printableHeight = pageHeight - marginY * 2; // 281mm

  const contentHeight = (canvas.height * printableWidth) / canvas.width;

  // If the document content is close to fitting on a single page (within 10%), scale to 1 page
  // to avoid creating an awkward 2nd page with just a footer line!
  if (contentHeight <= printableHeight * 1.1) {
    const finalHeight = Math.min(contentHeight, printableHeight);
    pdf.addImage(imgData, 'PNG', marginX, marginY, printableWidth, finalHeight, undefined, 'FAST');
  } else {
    // Multi-page document handling with clean margins
    let heightLeft = contentHeight;
    let position = marginY;

    pdf.addImage(imgData, 'PNG', marginX, position, printableWidth, contentHeight, undefined, 'FAST');
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      position = heightLeft - contentHeight + marginY;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', marginX, position, printableWidth, contentHeight, undefined, 'FAST');
      heightLeft -= printableHeight;
    }
  }

  const pdfBlob = pdf.output('blob');
  const download = () => {
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  };

  return { pdfBlob, download };
}
