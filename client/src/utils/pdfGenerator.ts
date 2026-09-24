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

  // Standard A4 width at 96 DPI is ~794px.
  const a4StandardPxWidth = 794;

  // Create an offscreen staging container attached directly to body.
  // This completely isolates the document from modal scrollbars, flexbox clipping,
  // and small laptop viewport boundaries, guaranteeing full natural-height capture.
  const stagingWrapper = document.createElement('div');
  stagingWrapper.setAttribute('id', 'pdf-render-staging-wrapper');
  stagingWrapper.style.position = 'absolute';
  stagingWrapper.style.left = '-99999px';
  stagingWrapper.style.top = '0';
  stagingWrapper.style.width = `${a4StandardPxWidth}px`;
  stagingWrapper.style.minWidth = `${a4StandardPxWidth}px`;
  stagingWrapper.style.maxWidth = `${a4StandardPxWidth}px`;
  stagingWrapper.style.height = 'auto';
  stagingWrapper.style.minHeight = 'auto';
  stagingWrapper.style.maxHeight = 'none';
  stagingWrapper.style.overflow = 'visible';
  stagingWrapper.style.zIndex = '-99999';
  stagingWrapper.style.backgroundColor = '#ffffff';

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.width = `${a4StandardPxWidth}px`;
  clonedElement.style.maxWidth = `${a4StandardPxWidth}px`;
  clonedElement.style.minWidth = `${a4StandardPxWidth}px`;
  clonedElement.style.height = 'auto';
  clonedElement.style.minHeight = 'auto';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.overflow = 'visible';
  clonedElement.style.margin = '0';
  clonedElement.style.boxShadow = 'none';
  clonedElement.style.border = 'none';
  clonedElement.style.borderRadius = '0';

  stagingWrapper.appendChild(clonedElement);
  document.body.appendChild(stagingWrapper);

  // Short delay for DOM layout calculation in the staging container
  await new Promise((resolve) => setTimeout(resolve, 50));

  const totalHeight = Math.max(clonedElement.scrollHeight, clonedElement.offsetHeight, 1000);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(clonedElement, {
      scale: 2, // 2x crisp retina resolution
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: a4StandardPxWidth,
      height: totalHeight,
      windowWidth: 1200,
      windowHeight: totalHeight + 300,
      scrollY: 0,
      scrollX: 0,
    });
  } finally {
    stagingWrapper.remove();
  }

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
