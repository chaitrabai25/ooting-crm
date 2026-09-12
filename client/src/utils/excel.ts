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
