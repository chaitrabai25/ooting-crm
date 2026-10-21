/**
 * Print & File System Utilities for Ooting CRM
 * 
 * 1. Isolated Print Mechanism:
 *    Avoids CSS conflicts, modal container overflow clipping, and timing issues
 *    by rendering the target printable element inside a clean, isolated hidden <iframe>.
 * 
 * 2. File System Access API:
 *    Uses window.showSaveFilePicker to prompt the native OS "Save As..." dialog,
 *    allowing the user to choose the exact destination folder on their file system.
 *    Falls back smoothly to standard anchor downloads if unsupported.
 */

interface PrintOptions {
  title?: string;
  timeout?: number;
}

/**
 * Saves a Blob (e.g. PDF) to the user's local file system.
 * Prompts the native OS "Save As" file picker when available.
 */
export async function savePdfToFileSystem(blob: Blob, suggestedName: string): Promise<boolean> {
  const safeFilename = suggestedName.endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`;

  // 1. Try modern File System Access API (Supported in Chrome/Edge on Windows/Mac/Linux)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: safeFilename,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      // User cancelled the file picker dialog
      if (err.name === 'AbortError') {
        return false;
      }
      console.warn('showSaveFilePicker error, falling back to download:', err);
    }
  }

  // 2. Safe Fallback: Browser Anchor Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

/**
 * Prints a specific DOM element in total isolation.
 * Completely immune to modal stacking contexts, backdrop filters, or scroll containers.
 */
export async function printElement(elementId: string, options: PrintOptions = {}): Promise<void> {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.error(`printElement: Element #${elementId} not found.`);
    window.print();
    return;
  }

  // Synchronize dynamic input values onto the clone
  const cloned = sourceElement.cloneNode(true) as HTMLElement;
  const originalInputs = sourceElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );
  const clonedInputs = cloned.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );

  originalInputs.forEach((orig, idx) => {
    const clone = clonedInputs[idx];
    if (!clone) return;
    if (orig instanceof HTMLInputElement) {
      if (orig.type === 'checkbox' || orig.type === 'radio') {
        (clone as HTMLInputElement).checked = orig.checked;
      } else {
        (clone as HTMLInputElement).value = orig.value;
      }
    } else if (orig instanceof HTMLTextAreaElement) {
      (clone as HTMLTextAreaElement).value = orig.value;
      (clone as HTMLTextAreaElement).textContent = orig.value;
    } else if (orig instanceof HTMLSelectElement) {
      (clone as HTMLSelectElement).value = orig.value;
    }
  });

  // Reset desktop container constraints on the clone to ensure perfect A4 print fit
  cloned.style.boxShadow = 'none';
  cloned.style.border = 'none';
  cloned.style.borderRadius = '0';
  cloned.style.margin = '0 auto';
  cloned.style.width = '100%';
  cloned.style.maxWidth = '100%';
  cloned.style.minWidth = '0';
  cloned.style.height = 'auto';
  cloned.style.maxHeight = 'none';
  cloned.style.minHeight = '0';

  // Extract all existing CSS styles and link tags from main document
  const headStyles: string[] = [];
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style').forEach((node) => {
    headStyles.push(node.outerHTML);
  });

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const documentTitle = options.title || 'Official Document — Ooting CRM';
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Build isolated HTML with strict A4 single-page and media print resets
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      ${baseOrigin ? `<base href="${baseOrigin}/">` : ''}
      <title>${documentTitle}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      ${headStyles.join('\n')}
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: 'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          width: 100% !important;
          overflow: visible !important;
          -webkit-font-smoothing: antialiased !important;
        }
        svg {
          display: inline-block !important;
          vertical-align: middle !important;
          flex-shrink: 0 !important;
        }
        .no-print, button, .print-hidden, .pdf-hide {
          display: none !important;
        }
        .print-only, .pdf-show {
          display: block !important;
        }
        #${elementId} {
          position: static !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
        }
        .pdf-page {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: always !important;
          break-after: always !important;
        }
        .pdf-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      </style>
    </head>
    <body>
      ${cloned.outerHTML}
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for all images in the iframe to resolve before launching print preview
  const iframeImages = Array.from(doc.images || []);
  await Promise.all(
    iframeImages.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // Wait for fonts to be ready in the iframe context
  if ((doc as any).fonts && (doc as any).fonts.ready) {
    try {
      await (doc as any).fonts.ready;
    } catch {}
  }

  // Short delay to allow fonts and CSS layout to calculate with pixel accuracy
  await new Promise((resolve) => setTimeout(resolve, 250));

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch (err) {
    console.error('Iframe print error:', err);
    window.print();
  } finally {
    // Safely remove the iframe after user dismisses print dialog
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2500);
  }
}

/**
 * High-fidelity PDF Download via Native Print Pipeline
 * Opens the native browser print engine configured for A4, ensuring
 * crisp vector text, exact SVG alignment, and zero raster/html2canvas artifacting.
 */
export const downloadPdfViaPrint = printElement;

