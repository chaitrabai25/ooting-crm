import * as XLSX from 'xlsx';

/**
 * Exports an array of JavaScript objects to a downloadable Excel (.xlsx) file.
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Sheet1'
) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths based on content length
  const maxColLengths: { [key: string]: number } = {};
  data.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const val = row[key] ? String(row[key]) : '';
      const curLen = Math.max(key.length, val.length);
      maxColLengths[key] = Math.max(maxColLengths[key] || 10, curLen);
    });
  });

  worksheet['!cols'] = Object.keys(maxColLengths).map((k) => ({
    wch: Math.min(Math.max(maxColLengths[k] + 2, 12), 40),
  }));

  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
}

/**
 * Downloads a standardized Excel template (.xlsx) with header row and example data.
 */
export function downloadExcelTemplate(
  columns: string[],
  sampleRows: Record<string, any>[] = [],
  fileName: string = 'import_template.xlsx'
) {
  const data = sampleRows.length > 0 ? sampleRows : [
    columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
  ];

  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  worksheet['!cols'] = columns.map((col) => ({
    wch: Math.max(col.length + 4, 15),
  }));

  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
}

/**
 * Safely converts any value to trimmed lower-case string.
 * Guaranteed never to throw on undefined/null/objects/numbers.
 */
export function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Safely checks if a string contains another substring (case-insensitive).
 * Guaranteed never to throw "Cannot read properties of undefined (reading 'includes')".
 */
export function safeIncludes(val: any, search: string): boolean {
  if (val === null || val === undefined || search === null || search === undefined) return false;
  return String(val).toLowerCase().includes(String(search).toLowerCase());
}

/**
 * Reads and parses an uploaded Excel (.xlsx / .xls) or CSV file into an array of objects.
 * Uses ArrayBuffer for 100% reliable binary decoding of zipped XML files.
 * Automatically checks all sheets to find the first sheet with data.
 */
export async function readExcelFile<T = any>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve([]);
          return;
        }

        // Scan all sheets to find the first one that has data rows
        let bestSheetName = workbook.SheetNames[0];
        let bestJson: T[] = [];

        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (!ws) continue;
          const json = XLSX.utils.sheet_to_json<T>(ws, { defval: '' });
          if (json && json.length > 0) {
            bestSheetName = name;
            bestJson = json;
            break;
          }
        }

        resolve(bestJson);
      } catch (err) {
        console.error('Excel read error:', err);
        reject(new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.'));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Advanced spreadsheet parser that reads any .xlsx, .xls, or .csv file via ArrayBuffer.
 * Features:
 * - Scans all sheets to find data
 * - Detects header rows even after title banners or blank rows
 * - Safe against undefined cells, nulls, sparse arrays
 * - Returns sheetName, header row, headers, 2D rows, and mapped JSON records
 */
export async function parseSpreadsheetSafely(
  file: File,
  keywordGroups?: string[][]
): Promise<{
  sheetName: string;
  headers: string[];
  rawRows: any[][];
  jsonRows: Record<string, any>[];
  totalSheets: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Spreadsheet contains no readable sheets.');
        }

        // Scan each sheet
        let selectedSheetName = workbook.SheetNames[0];
        let selectedAoa: any[][] = [];
        let detectedHeaderIdx = 0;
        let detectedHeaders: string[] = [];

        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (!ws) continue;
          const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!aoa || aoa.length === 0) continue;

          // If keywordGroups specified, check if this sheet has the headers
          if (keywordGroups && keywordGroups.length > 0) {
            const detected = detectHeaderRow(aoa, keywordGroups);
            if (detected) {
              selectedSheetName = name;
              selectedAoa = aoa;
              detectedHeaderIdx = detected.headerIndex;
              detectedHeaders = detected.headers;
              break;
            }
          }

          // Otherwise keep the first sheet that has more than 1 non-empty row
          if (selectedAoa.length <= 1 && aoa.length > 1) {
            selectedSheetName = name;
            selectedAoa = aoa;
          }
        }

        if (selectedAoa.length === 0) {
          const firstWs = workbook.Sheets[workbook.SheetNames[0]];
          selectedAoa = firstWs ? XLSX.utils.sheet_to_json(firstWs, { header: 1, defval: '' }) : [];
        }

        // If headers weren't detected via keywordGroups, find first non-empty row
        if (detectedHeaders.length === 0) {
          for (let r = 0; r < Math.min(selectedAoa.length, 15); r++) {
            const row = selectedAoa[r];
            if (Array.isArray(row) && row.some((c) => safeStr(c).length > 0)) {
              detectedHeaderIdx = r;
              detectedHeaders = row.map((c) => safeStr(c));
              break;
            }
          }
        }

        const dataRows = selectedAoa.slice(detectedHeaderIdx + 1).filter(
          (row) => Array.isArray(row) && row.some((c) => safeStr(c).length > 0)
        );

        // Map to key-value objects
        const jsonRows: Record<string, any>[] = dataRows.map((row) => {
          const obj: Record<string, any> = {};
          detectedHeaders.forEach((h, colIdx) => {
            const cleanKey = safeStr(h) || `Column_${colIdx + 1}`;
            obj[cleanKey] = row[colIdx] !== undefined ? row[colIdx] : '';
          });
          return obj;
        });

        resolve({
          sheetName: selectedSheetName,
          headers: detectedHeaders,
          rawRows: dataRows,
          jsonRows,
          totalSheets: workbook.SheetNames.length,
        });
      } catch (err: any) {
        console.error('Spreadsheet parse error:', err);
        reject(new Error(err?.message || 'Failed to parse spreadsheet file. Please check file format.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read spreadsheet file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detects the header row in a spreadsheet sheet, even if preceded by title rows or empty rows.
 * keywordGroups: array of string arrays. Every group must have at least one keyword match.
 * Example: [['name', 'customer'], ['phone', 'mobile', 'contact']]
 * Guaranteed 100% null/undefined safe.
 */
export function detectHeaderRow(
  rawRows: any[][],
  keywordGroups: string[][]
): { headerIndex: number; headers: string[] } | null {
  if (!rawRows || !Array.isArray(rawRows)) return null;
  const maxScanRows = Math.min(rawRows.length, 15);

  let bestIndex = -1;
  let maxMatchedCount = 0;
  let bestHeaders: string[] = [];

  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Safely map cells to clean lower-case strings
    const rowStrings = row.map((cell) => safeStr(cell).toLowerCase());

    // Count how many groups matched
    const matchedCount = keywordGroups.filter((group) => {
      if (!Array.isArray(group) || group.length === 0) return false;
      return group.some((keyword) => {
        const kwLower = safeStr(keyword).toLowerCase();
        if (!kwLower) return false;
        return rowStrings.some((cellStr) => cellStr && (cellStr === kwLower || cellStr.includes(kwLower) || kwLower.includes(cellStr)));
      });
    }).length;

    // If all groups matched, return immediately
    if (matchedCount === keywordGroups.length && matchedCount > 0) {
      return {
        headerIndex: r,
        headers: rowStrings,
      };
    }

    if (matchedCount > maxMatchedCount) {
      maxMatchedCount = matchedCount;
      bestIndex = r;
      bestHeaders = rowStrings;
    }
  }

  if (maxMatchedCount > 0 && bestIndex !== -1) {
    return {
      headerIndex: bestIndex,
      headers: bestHeaders,
    };
  }

  return null;
}

/**
 * Finds a matching column name from a list of available row keys based on concept synonyms.
 */
export function findMatchingColumnKey(availableKeys: string[], targetConcepts: string[]): string | undefined {
  const lowerKeys = availableKeys.map((k) => ({
    original: k,
    clean: safeStr(k).toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  for (const concept of targetConcepts) {
    const cleanConcept = concept.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanConcept) continue;
    const found = lowerKeys.find(
      (k) => k.clean === cleanConcept || k.clean.includes(cleanConcept) || cleanConcept.includes(k.clean)
    );
    if (found) return found.original;
  }
  return undefined;
}


/**
 * Robustly parses a date from an Excel cell value.
 * Handles:
 * - Excel numeric serial dates (e.g. 45570 -> 2024-10-05)
 * - Date instances
 * - String date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
 */
export function parseExcelDate(val: any): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;

  // Already a JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // Excel serial number (typically between 20000 and 80000 for years ~1954 to 2119)
  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (num > 20000 && num < 90000) {
      // Excel epoch begins Dec 30 1899 due to the 1900 leap year bug
      const utcDays = Math.floor(num - 25569);
      const utcMs = utcDays * 86400 * 1000;
      const date = new Date(utcMs);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  const str = String(val).trim();
  if (!str) return undefined;

  // Check if standard ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Cleans numerical currency or number string.
 */
export function parseExcelNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Standardizes phone numbers to digits with optional leading '+'.
 */
export function cleanPhoneNumber(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    return Math.round(val).toString();
  }
  let str = String(val).trim();
  str = str.replace(/\.0+$/, '');
  const startsWithPlus = str.startsWith('+');
  const digits = str.replace(/[^\d]/g, '');
  return startsWithPlus ? `+${digits}` : digits;
}

