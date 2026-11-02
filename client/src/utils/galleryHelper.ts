/**
 * Safely parses trip gallery / happy moments image URLs from any input format:
 * - Array of URL strings or objects { url, caption }
 * - JSON string representation of array
 * - Newline-separated URLs
 * - Comma-separated HTTP URLs
 * 
 * CRITICAL: NEVER splits Data URLs (data:image/...;base64,...) on commas.
 * Also repairs corrupt severed entries (e.g. data:image/webp;base64 followed by base64 payload, or standalone base64 payload).
 */
export function parseGalleryUrls(raw: unknown): string[] {
  if (!raw) return [];

  let items: string[] = [];

  if (Array.isArray(raw)) {
    items = raw
      .map((item) => (typeof item === 'string' ? item : (item?.url || item?.imageUrl || '')))
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // 1. Try parsing JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed
            .map((item) => (typeof item === 'string' ? item : (item?.url || item?.imageUrl || '')))
            .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
        }
      } catch {
        // Fall back to text parsing
      }
    }

    if (items.length === 0) {
      // 2. If it contains newlines, split strictly by newline so commas inside data URLs are preserved
      if (trimmed.includes('\n')) {
        items = trimmed
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (trimmed.startsWith('data:image/')) {
        // Single data URL
        items = [trimmed];
      } else if (trimmed.includes(',')) {
        // Comma-separated URLs: only split on commas that precede http://, https://, or /
        items = trimmed
          .split(/,\s*(?=https?:\/\/|\/)/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        items = [trimmed];
      }
    }
  }

  // 3. Auto-Heal broken fragments
  const sanitized: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const curr = items[i].trim();
    if (!curr) continue;

    // Check if this item is a severed data URL header: "data:image/webp;base64" (missing comma & payload)
    if (/^data:image\/[a-zA-Z0-9+.-]+;base64$/i.test(curr)) {
      const next = items[i + 1]?.trim() || '';
      if (next && !next.startsWith('http') && !next.startsWith('data:')) {
        sanitized.push(`${curr},${next}`);
        i++; // skip next item as it's stitched
        continue;
      }
      // If no valid next item, skip this orphan header
      continue;
    }

    // Check if this item is an orphaned base64 payload (e.g. starts with WebP magic 'UklGR', PNG 'iVBORw', or JPEG '/9j/')
    if (!curr.startsWith('http') && !curr.startsWith('/') && !curr.startsWith('data:')) {
      if (curr.startsWith('UklGR')) {
        sanitized.push(`data:image/webp;base64,${curr}`);
        continue;
      } else if (curr.startsWith('iVBORw')) {
        sanitized.push(`data:image/png;base64,${curr}`);
        continue;
      } else if (curr.startsWith('/9j/')) {
        sanitized.push(`data:image/jpeg;base64,${curr}`);
        continue;
      }
      // If it's too short or not recognized, skip
      if (curr.length < 20) continue;
    }

    sanitized.push(curr);
  }

  return sanitized;
}
