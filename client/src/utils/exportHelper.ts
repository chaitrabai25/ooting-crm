import { api } from '../api/client.js';

/**
 * Downloads an Excel or binary file using authenticated Axios client.
 * This guarantees the Authorization Bearer header is sent, avoiding 401 Unauthorized errors.
 */
export async function downloadExcel(url: string, defaultFilename: string): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(url, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error(`Export failed for ${url}:`, error);
    const message = error.response?.data?.message || 'Failed to download Excel file. Please try again.';
    alert(message);
    throw error;
  }
}
