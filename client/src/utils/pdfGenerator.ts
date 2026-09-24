import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GeneratePdfOptions {
  elementId: string;
  filename: string;
  title?: string;
  onePageOnly?: boolean;
}

/**
 * Generates an A4 PDF from a dedicated DOM container.
 * Never captures the entire page or surrounding CRM UI.
 */
export async function generateA4Pdf({
  elementId,
  filename,
  onePageOnly = true,
}: GeneratePdfOptions): Promise<{ pdfBlob: Blob; download: () => void }> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Target container #${elementId} not found in document.`);
  }

  // Pre-load all images inside the element to guarantee crisp rendering in canvas
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // Standard A4 width at 96 DPI is ~794px. We render at fixed 794px width on clone
  // so responsive screen widths do not compress or distort the document layout.
  const a4StandardPxWidth = 794;

  const canvas = await html2canvas(element, {
    scale: 2, // 2x crisp retina resolution
    useCORS: true,
    allowTaint: true,
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
        el.style.boxShadow = 'none';
        el.style.borderRadius = '0';
        el.style.border = 'none';
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 6; // 6mm margins for clean breathing room
  const marginY = 6;
  const printableWidth = pageWidth - marginX * 2; // 198mm
  const printableHeight = pageHeight - marginY * 2; // 285mm

  const contentHeightMm = (canvas.height * printableWidth) / canvas.width;

  // Single-page guarantee for invoices & vouchers:
  // If onePageOnly is requested or content is within reasonable threshold,
  // fit proportionally on exactly 1 page with ZERO page-split and ZERO clipping.
  if (onePageOnly || contentHeightMm <= printableHeight * 1.08) {
    const scale = Math.min(1, printableHeight / contentHeightMm);
    const finalWidth = printableWidth * scale;
    const finalHeight = contentHeightMm * scale;
    const offsetX = marginX + (printableWidth - finalWidth) / 2;
    const offsetY = marginY;

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight, undefined, 'FAST');
  } else {
    // Multi-page document handling for long itineraries
    let heightLeft = contentHeightMm;
    let position = marginY;

    pdf.addImage(imgData, 'PNG', marginX, position, printableWidth, contentHeightMm, undefined, 'FAST');
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      position = heightLeft - contentHeightMm + marginY;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', marginX, position, printableWidth, contentHeightMm, undefined, 'FAST');
      heightLeft -= printableHeight;
    }
  }

  const pdfBlob = pdf.output('blob');
  const download = () => {
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  };

  return { pdfBlob, download };
}
