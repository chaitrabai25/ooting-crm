import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { savePdfToFileSystem } from './printDocument.js';

export { savePdfToFileSystem };

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
  title,
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

    // 1. Deterministic SVG Icon Normalization:
    // Convert inline SVGs into data-URI <img> elements so html2canvas renders them
    // natively via drawImage() with 100% position accuracy and zero baseline/flex shift.
    const svgs = Array.from(targetEl.querySelectorAll<SVGElement>('svg'));
    svgs.forEach((svg) => {
      const cls = svg.getAttribute('class') || '';
      let pxSize = 14;
      if (cls.includes('w-3 ') || cls.includes('w-3.5') || cls.includes('h-3.5')) pxSize = 14;
      else if (cls.includes('w-4') || cls.includes('h-4')) pxSize = 16;
      else if (cls.includes('w-5') || cls.includes('h-5')) pxSize = 20;
      else if (cls.includes('w-6') || cls.includes('h-6')) pxSize = 24;
      else if (cls.includes('w-3') || cls.includes('h-3')) pxSize = 12;

      svg.setAttribute('width', String(pxSize));
      svg.setAttribute('height', String(pxSize));
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', '0 0 24 24');
      }

      try {
        const svgXml = new XMLSerializer().serializeToString(svg);
        const img = clonedDoc.createElement('img');
        img.setAttribute('src', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml));
        img.setAttribute('width', String(pxSize));
        img.setAttribute('height', String(pxSize));
        img.style.width = `${pxSize}px`;
        img.style.height = `${pxSize}px`;
        img.style.minWidth = `${pxSize}px`;
        img.style.minHeight = `${pxSize}px`;
        img.style.maxWidth = `${pxSize}px`;
        img.style.maxHeight = `${pxSize}px`;
        img.style.display = 'inline-block';
        img.style.verticalAlign = '-0.15em';
        img.style.flexShrink = '0';
        img.style.margin = '0';
        img.style.padding = '0';
        svg.parentNode?.replaceChild(img, svg);
      } catch {
        svg.style.width = `${pxSize}px`;
        svg.style.height = `${pxSize}px`;
        svg.style.display = 'inline-block';
        svg.style.verticalAlign = 'middle';
      }
    });

    // 2. Strict Image Dimension & Natural Aspect-Ratio Enforcement (Prevents squashed logos or blown-up photos)
    const imgs = targetEl.querySelectorAll<HTMLImageElement>('img');
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src === 'null' || src === 'undefined' || src.trim() === '') {
        const photoCard = img.closest('.day-photo-card, .photo-item') as HTMLElement;
        if (photoCard) photoCard.style.display = 'none';
        else img.style.display = 'none';
        return;
      }

      if (src.includes('logo') || img.classList.contains('object-contain')) {
        // Allow logo to preserve natural aspect ratio without horizontal squishing
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = 'auto';
      } else if (src.includes('wave')) {
        img.style.height = '8px';
        img.style.maxHeight = '8px';
        img.style.width = '100%';
        img.style.objectFit = 'cover';
        if (img.parentElement) {
          img.parentElement.style.height = '8px';
          img.parentElement.style.maxHeight = '8px';
          img.parentElement.style.overflow = 'hidden';
        }
      } else {
        // Day photos / general pictures
        img.style.maxHeight = '210px';
        img.style.objectFit = 'cover';
        if (img.parentElement && !img.parentElement.style.maxHeight) {
          img.parentElement.style.maxHeight = '210px';
          img.parentElement.style.overflow = 'hidden';
        }
      }
    });

    // Ensure all input and textarea values are captured in canvas
    const inputs = targetEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    inputs.forEach((input) => {
      input.setAttribute('value', input.value || '');
      if (input.tagName.toLowerCase() === 'textarea') {
        input.textContent = input.value || '';
      }
    });

    // Handle .pdf-show and .pdf-hide classes
    const pdfShows = targetEl.querySelectorAll<HTMLElement>('.pdf-show');
    pdfShows.forEach((el) => {
      el.style.setProperty('display', 'inline-block', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
    });
    const pdfHides = targetEl.querySelectorAll<HTMLElement>('.pdf-hide');
    pdfHides.forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
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
        windowWidth: a4StandardPxWidth,
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
    // Single container fallback (e.g. duty-slip or single-page quotation or dynamic itinerary)
    let clonedTargetEl: HTMLElement | null = null;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: a4StandardPxWidth,
      scrollY: 0,
      scrollX: 0,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          clonedTargetEl = el;
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

    const effectiveMargin = margin !== undefined ? margin : 8; // Standard 8mm A4 margin on all sides
    const marginX = effectiveMargin;
    const marginTop = effectiveMargin;
    const marginBottom = 12; // 12mm bottom margin for running footer with page count
    const printableWidth = pageWidth - marginX * 2; // 194mm printable width
    const printableHeight = pageHeight - marginTop - marginBottom; // 277mm printable height

    const a4Aspect = printableHeight / printableWidth;
    const pageCanvasHeight = Math.floor(canvas.width * a4Aspect);

    // Guaranteed single-page fitting if onePageOnly or fits cleanly on 1 page (up to 1.10x scaled)
    if (onePageOnly || canvas.height <= pageCanvasHeight * 1.10) {
      const scale = Math.min(1, pageCanvasHeight / canvas.height);
      const finalWidth = printableWidth * scale;
      const finalHeight = (canvas.height * printableWidth * scale) / canvas.width;
      const offsetX = marginX + (printableWidth - finalWidth) / 2;
      const offsetY = marginTop + (printableHeight - finalHeight) / 2;
      const imgData = canvas.toDataURL('image/png', 1.0);

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight, undefined, 'FAST');
    } else {
      // Smart Element-Aware Multi-Page Slicing:
      // Keep sections, day cards and table rows intact.
      // NOTE: h2 and h3 are intentionally excluded so section headers stay with their card bodies.
      const targetRect = (clonedTargetEl as HTMLElement | null)?.getBoundingClientRect() || {
        height: canvas.height / 2,
        top: 0,
      };
      const scaleRatio = canvas.height / (targetRect.height || (canvas.height / 2));

      const breakNodes = clonedTargetEl
        ? Array.from(
            (clonedTargetEl as HTMLElement).querySelectorAll<HTMLElement>(
              '.page-break-avoid, [break-inside-avoid], section, .itinerary-day-card, tr'
            )
          )
        : [];

      // Forced Page Break elements (e.g. Dedicated Thank-You page)
      const forceBreakNodes = clonedTargetEl
        ? Array.from(
            (clonedTargetEl as HTMLElement).querySelectorAll<HTMLElement>(
              '.pdf-page-break-before, .pdf-thank-you-page'
            )
          )
        : [];

      const forceBreaks = forceBreakNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return (rect.top - targetRect.top) * scaleRatio;
      });

      const avoidSplits = breakNodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const top = (rect.top - targetRect.top) * scaleRatio;
          const bottom = (rect.bottom - targetRect.top) * scaleRatio;
          const height = bottom - top;
          return { top, bottom, height };
        })
        .filter((item) => item.height > 10 && item.height < pageCanvasHeight * 0.95);

      let currentY = 0;
      let pageIndex = 0;

      while (currentY < canvas.height - 4) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // On Page 2+, account for the top running header (14mm height)
        const topOffset = pageIndex === 0 ? marginTop : 14;
        const availableHeightMm = pageHeight - topOffset - marginBottom;
        const effectiveCanvasHeight = Math.floor(canvas.width * (availableHeightMm / printableWidth));

        const remainingHeight = canvas.height - currentY;
        let sliceHeight = Math.min(effectiveCanvasHeight, remainingHeight);

        // Check if there is an explicit forced page break ahead within this slice window
        const nextForceBreak = forceBreaks.find(
          (fb) => fb > currentY + 50 && fb <= currentY + sliceHeight
        );

        if (nextForceBreak) {
          // Cut cleanly right before the forced page-break element so it begins on the next page
          sliceHeight = Math.floor(nextForceBreak - currentY);
        } else if (currentY + sliceHeight < canvas.height) {
          const targetCut = currentY + sliceHeight;

          // Find if targetCut conflicts with any avoid-split element
          const conflicting = avoidSplits.find(
            (item) => item.top < targetCut && item.bottom > targetCut
          );

          if (conflicting && conflicting.top > currentY + effectiveCanvasHeight * 0.20) {
            // Break cleanly right before the conflicting card/section
            sliceHeight = Math.floor(conflicting.top - currentY);
          } else {
            // Scan canvas rows near the bottom of this slice to find a white horizontal gap
            const searchStart = Math.floor(currentY + sliceHeight - effectiveCanvasHeight * 0.12);
            const searchEnd = Math.floor(currentY + sliceHeight);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              try {
                const sampleWidth = Math.min(100, canvas.width);
                const imgDataSample = ctx.getImageData(
                  Math.floor((canvas.width - sampleWidth) / 2),
                  searchStart,
                  sampleWidth,
                  searchEnd - searchStart
                ).data;

                for (let y = searchEnd; y >= searchStart; y--) {
                  const relY = y - searchStart;
                  let isWhite = true;
                  for (let x = 0; x < sampleWidth; x += 4) {
                    const idx = (relY * sampleWidth + x) * 4;
                    if (
                      imgDataSample[idx] < 240 ||
                      imgDataSample[idx + 1] < 240 ||
                      imgDataSample[idx + 2] < 240
                    ) {
                      isWhite = false;
                      break;
                    }
                  }
                  if (isWhite) {
                    sliceHeight = y - currentY;
                    break;
                  }
                }
              } catch {
                // Ignore canvas security errors if any
              }
            }
          }
        }

        // Guarantee forward progress of at least 150px
        sliceHeight = Math.max(150, Math.min(sliceHeight, remainingHeight));

        // Create high-res cropped slice canvas
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            currentY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
        }

        const pageImg = pageCanvas.toDataURL('image/png', 1.0);
        const sliceHeightMm = (sliceHeight * printableWidth) / canvas.width;
        pdf.addImage(pageImg, 'PNG', marginX, topOffset, printableWidth, sliceHeightMm, undefined, 'FAST');

        currentY += sliceHeight;
        pageIndex++;
      }
    }
  }

  // Draw Uniform Running Headers (Page 2+) & Running Footers with Page Numbers on All Pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);

    const marginX = margin !== undefined ? margin : 8;
    const printableWidth = pageWidth - marginX * 2;

    // Running Header on subsequent pages (Page 2+)
    if (totalPages > 1 && p > 1) {
      // Red top brand accent bar (0.8mm)
      pdf.setFillColor(201, 31, 40); // #C91F28
      pdf.rect(marginX, 3.8, printableWidth, 0.8, 'F');

      // Left Top: Package Name (Bold) and Page Number below it
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42); // slate-900
      const headerTitle = (title || 'Tour Itinerary').toUpperCase();
      const displayTitle = headerTitle.length > 55 ? headerTitle.substring(0, 52) + '...' : headerTitle;
      pdf.text(displayTitle, marginX, 7.8);

      // Directly below package name: Page Number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(`Page ${p} of ${totalPages}`, marginX, 10.8);

      // Right Top: Brand Name & Tagline
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(201, 31, 40); // #C91F28
      pdf.text('OOTING', pageWidth - marginX - 38, 8.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('  |  Journeys Beyond Ordinary', pageWidth - marginX - 38 + 12, 8.5);

      // Subtle dividing line below header
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.2);
      pdf.line(marginX, 12.5, pageWidth - marginX, 12.5);
    }

    // Running Footer on ALL pages (p = 1..totalPages)
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.2);
    pdf.line(marginX, 289, pageWidth - marginX, 289);

    // Left Footer: Contact Number & Support Email
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105); // slate-600
    pdf.text(
      '📞 Contact: +91 8884845595  •  support@ooting.in',
      marginX,
      293.5
    );

    // Center Footer (Page 1 gets page number here)
    if (p === 1 && totalPages > 1) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(`Page 1 of ${totalPages}`, pageWidth / 2, 293.5, { align: 'center' });
    }

    // Right Footer: Ooting Website Link
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(201, 31, 40); // #C91F28
    pdf.text('🌐 www.ooting.in', pageWidth - marginX, 293.5, { align: 'right' });
  }

  const pdfBlob = pdf.output('blob');
  const download = async () => {
    await savePdfToFileSystem(pdfBlob, filename);
  };

  return { pdfBlob, download };
}
