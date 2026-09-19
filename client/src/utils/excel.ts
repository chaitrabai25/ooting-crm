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
 * Reads and parses an uploaded Excel (.xlsx / .xls) file into an array of objects.
 */
export async function readExcelFile<T = any>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.'));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Detects the header row in a spreadsheet sheet, even if preceded by title rows or empty rows.
 * keywordGroups: array of string arrays. Every group must have at least one keyword match.
 * Example: [['name', 'customer'], ['phone', 'mobile', 'contact']]
 */
export function detectHeaderRow(
  rawRows: any[][],
  keywordGroups: string[][]
): { headerIndex: number; headers: string[] } | null {
  const maxScanRows = Math.min(rawRows.length, 12);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const rowStrings = row.map((cell) => String(cell || '').trim().toLowerCase());

    const allGroupsMatched = keywordGroups.every((group) =>
      group.some((keyword) =>
        rowStrings.some((cellStr) => cellStr.includes(keyword.toLowerCase()))
      )
    );

    if (allGroupsMatched) {
      return {
        headerIndex: r,
        headers: rowStrings,
      };
    }
  }

  return null;
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
  if (!val) return '';
  const str = String(val).trim();
  const startsWithPlus = str.startsWith('+');
  const digits = str.replace(/[^\d]/g, '');
  return startsWithPlus ? `+${digits}` : digits;
}

