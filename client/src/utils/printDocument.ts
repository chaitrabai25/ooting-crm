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

  // Build isolated HTML with strict A4 single-page and media print resets
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${documentTitle}</title>
      ${headStyles.join('\n')}
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          width: 100% !important;
          overflow: visible !important;
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

  // Short delay to allow fonts and CSS layout to calculate
  await new Promise((resolve) => setTimeout(resolve, 150));

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
    }, 2000);
  }
}
