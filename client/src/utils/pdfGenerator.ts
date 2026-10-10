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

  // Pre-load web fonts so canvas never falls back to system serif/Times New Roman
  if ((document as any).fonts && (document as any).fonts.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {}
  }

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
    // Inject Plus Jakarta Sans into cloned document head to guarantee modern sans rendering
    if (!clonedDoc.getElementById('injected-pdf-fonts')) {
      const fontLink = clonedDoc.createElement('link');
      fontLink.id = 'injected-pdf-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap';
      clonedDoc.head.appendChild(fontLink);

      const fontStyle = clonedDoc.createElement('style');
      fontStyle.textContent = `
        body, p, span, td, th, li, input, textarea, select {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        h1, h2, h3, h4, h5, h6, .font-heading, .font-display, [class*="font-heading"], [class*="text-xl"], [class*="text-2xl"], [class*="text-3xl"] {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
      `;
      clonedDoc.head.appendChild(fontStyle);
    }

    targetEl.style.boxSizing = 'border-box';
    targetEl.style.margin = '0 auto';
    targetEl.style.boxShadow = 'none';
    targetEl.style.borderRadius = '0';
    targetEl.style.border = 'none';
    targetEl.style.setProperty('font-family', "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 'important');

    // 1. Flexbox Gap Polyfill for html2canvas (html2canvas does not natively support CSS gap)
    const flexContainers = Array.from(targetEl.querySelectorAll<HTMLElement>('.flex, [class*="gap-"]'));
    flexContainers.forEach((container) => {
      const cls = container.getAttribute('class') || '';
      const isCol = cls.includes('flex-col');
      let gapPx = 0;
      const match = cls.match(/\bgap(?:-x)?-(\d+(?:\.\d+)?)\b/);
      if (match) {
        gapPx = parseFloat(match[1]) * 4; // 1 unit = 4px in Tailwind (gap-1.5 = 6px, gap-2 = 8px, gap-3 = 12px)
      } else {
        const comp = window.getComputedStyle(container);
        if (comp.gap && comp.gap !== 'normal') {
          gapPx = parseFloat(comp.gap) || 0;
        }
      }

      if (gapPx > 0) {
        const children = Array.from(container.children) as HTMLElement[];
        children.forEach((child, idx) => {
          if (idx < children.length - 1) {
            if (isCol) {
              if (!child.style.marginBottom) child.style.setProperty('margin-bottom', `${gapPx}px`, 'important');
            } else {
              if (!child.style.marginRight) child.style.setProperty('margin-right', `${gapPx}px`, 'important');
            }
          }
        });
      }
    });

    // 2. Deterministic SVG Icon Normalization:
    // Keep native SVG elements with explicit dimensions and resolved stroke colors.
    // (Never replace with async <img> which causes naturalWidth 0 layout overlap)
    const svgs = Array.from(targetEl.querySelectorAll<SVGElement>('svg'));
    svgs.forEach((svg) => {
      const cls = svg.getAttribute('class') || '';
      let pxSize = 14;
      if (cls.includes('w-3.5') || cls.includes('h-3.5')) pxSize = 14;
      else if (cls.includes('w-4') || cls.includes('h-4')) pxSize = 16;
      else if (cls.includes('w-5') || cls.includes('h-5')) pxSize = 20;
      else if (cls.includes('w-6') || cls.includes('h-6')) pxSize = 24;
      else if (cls.includes('w-3') || cls.includes('h-3')) pxSize = 12;

      svg.setAttribute('width', String(pxSize));
      svg.setAttribute('height', String(pxSize));
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', '0 0 24 24');
      }
      if (!svg.getAttribute('xmlns')) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      // Compute actual stroke color so currentColor is resolved
      let strokeColor = '#C91F28';
      try {
        const comp = window.getComputedStyle(svg);
        strokeColor = comp.color || comp.stroke || '#C91F28';
      } catch {}

      if (!svg.getAttribute('stroke') || svg.getAttribute('stroke') === 'currentColor') {
        svg.setAttribute('stroke', strokeColor);
      }
      if (!svg.getAttribute('fill') || svg.getAttribute('fill') === 'currentColor') {
        svg.setAttribute('fill', 'none');
      }

      svg.style.width = `${pxSize}px`;
      svg.style.height = `${pxSize}px`;
      svg.style.minWidth = `${pxSize}px`;
      svg.style.minHeight = `${pxSize}px`;
      svg.style.maxWidth = `${pxSize}px`;
      svg.style.maxHeight = `${pxSize}px`;
      svg.style.flexShrink = '0';
      svg.style.display = 'inline-block';
      svg.style.verticalAlign = 'middle';

      // Ensure proper right margin if adjacent to text
      const hasNextSibling = !!svg.nextElementSibling;
      if (hasNextSibling && !svg.style.marginRight && !cls.includes('mr-')) {
        svg.style.marginRight = '6px';
      }
    });

    // 3. Remove CSS line-clamp that causes text to be clipped in html2canvas
    const clampedEls = targetEl.querySelectorAll<HTMLElement>('.line-clamp-1, .line-clamp-2, .line-clamp-3, [class*="line-clamp"]');
    clampedEls.forEach((el) => {
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('-webkit-line-clamp', 'unset', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
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
          el.style.height = 'auto';
          el.style.minHeight = `${a4StandardPxHeight}px`;
          el.style.overflow = 'visible';
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
              '.page-break-avoid, [break-inside-avoid], section, .itinerary-day-card:not(.itinerary-day-1), tr'
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

  const pdfBlob = pdf.output('blob');
  const download = async () => {
    await savePdfToFileSystem(pdfBlob, filename);
  };

  return { pdfBlob, download };
}
