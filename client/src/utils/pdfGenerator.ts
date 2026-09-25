import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GeneratePdfOptions {
  elementId: string;
  filename: string;
  title?: string;
  onePageOnly?: boolean;
  margin?: number;
}

/**
 * Generates an A4 PDF from a dedicated DOM container.
 * Never captures the entire page or surrounding CRM UI.
 */
export async function generateA4Pdf({
  elementId,
  filename,
  onePageOnly = true,
  margin,
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

  // Check if the container explicitly contains multi-page frames (.pdf-page)
  const pageNodes = Array.from(element.querySelectorAll<HTMLElement>('.pdf-page'));

  // Standard A4 width and height in px at standard screen 96 DPI
  const a4StandardPxWidth = 794;
  const a4StandardPxHeight = 1123;

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;

  const fixSvgAndStyles = (clonedDoc: Document, targetEl: HTMLElement) => {
    targetEl.style.boxSizing = 'border-box';
    targetEl.style.margin = '0 auto';
    targetEl.style.boxShadow = 'none';
    targetEl.style.borderRadius = '0';
    targetEl.style.border = 'none';

    // Fix icon alignment and eliminate html2canvas SVG vertical shifts
    const svgs = targetEl.querySelectorAll<SVGElement>('svg');
    svgs.forEach((svg) => {
      svg.style.transform = 'none';
      svg.style.verticalAlign = 'middle';
      svg.style.display = 'inline-block';
      svg.style.flexShrink = '0';
    });

    // Un-clip ancestor containers so html2canvas captures full dimensions
    let current: HTMLElement | null = targetEl.parentElement;
    while (current && current !== clonedDoc.body) {
      current.style.overflow = 'visible';
      current.style.maxHeight = 'none';
      current.style.height = 'auto';
      current = current.parentElement;
    }
  };

  if (pageNodes.length > 0) {
    // Multi-page document architecture: each .pdf-page is rendered as a clean, independent A4 page
    for (let i = 0; i < pageNodes.length; i++) {
      if (i > 0) pdf.addPage();
      const pageEl = pageNodes[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x crisp retina resolution
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
          const clonedPage = clonedDoc.querySelectorAll<HTMLElement>('.pdf-page')[i];
          if (clonedPage) {
            clonedPage.style.width = `${a4StandardPxWidth}px`;
            clonedPage.style.maxWidth = `${a4StandardPxWidth}px`;
            clonedPage.style.minWidth = `${a4StandardPxWidth}px`;
            clonedPage.style.height = `${a4StandardPxHeight}px`;
            clonedPage.style.minHeight = `${a4StandardPxHeight}px`;
            clonedPage.style.maxHeight = `${a4StandardPxHeight}px`;
            clonedPage.style.overflow = 'hidden';
            fixSvgAndStyles(clonedDoc, clonedPage);
          }
        },
      });

      const pageImgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(pageImgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }
  } else {
    // Single container fallback (e.g. duty-slip or single-page quotation)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      scrollY: 0,
      scrollX: 0,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          el.style.width = `${a4StandardPxWidth}px`;
          el.style.maxWidth = `${a4StandardPxWidth}px`;
          el.style.minWidth = `${a4StandardPxWidth}px`;
          if (onePageOnly) {
            el.style.height = `${a4StandardPxHeight}px`;
            el.style.maxHeight = `${a4StandardPxHeight}px`;
            el.style.overflow = 'hidden';
          } else {
            el.style.minHeight = `${a4StandardPxHeight}px`;
            el.style.overflow = 'visible';
          }
          fixSvgAndStyles(clonedDoc, el);
        }
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    const effectiveMargin =
      margin !== undefined
        ? margin
        : elementId === 'invoice-document' || elementId === 'duty-slip-document' || elementId === 'quotation-document'
        ? 0
        : 6;

    const marginX = effectiveMargin;
    const marginY = effectiveMargin;
    const printableWidth = pageWidth - marginX * 2;
    const printableHeight = pageHeight - marginY * 2;

    const contentHeightMm = (canvas.height * printableWidth) / canvas.width;

    // Guaranteed single-page fitting if onePageOnly or fits within 1 page
    if (onePageOnly || contentHeightMm <= printableHeight * 1.02) {
      const scale = Math.min(1, printableHeight / contentHeightMm);
      const finalWidth = printableWidth * scale;
      const finalHeight = contentHeightMm * scale;
      const offsetX = marginX + (printableWidth - finalWidth) / 2;
      const offsetY = marginY + (printableHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight, undefined, 'FAST');
    } else {
      // Multi-page document handling
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
  }

  const pdfBlob = pdf.output('blob');
  const download = () => {
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  };

  return { pdfBlob, download };
}
