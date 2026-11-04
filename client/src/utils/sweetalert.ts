/**
 * SweetAlert2 Custom Themed Utility for Ooting CRM
 * Eliminates default browser native alerts and provides sleek, branded,
 * dark-mode responsive modals with Ooting crimson (#C91F28) styling.
 */
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

// Check if document has dark theme
const isDarkMode = () => document.documentElement.classList.contains('dark');

/**
 * Base configured SweetAlert2 instance with Ooting styling
 */
export const ootingSwal = Swal.mixin({
  customClass: {
    popup: 'ooting-swal-popup rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 font-sans',
    title: 'ooting-swal-title text-slate-900 dark:text-white font-bold text-lg tracking-tight',
    htmlContainer: 'ooting-swal-html text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed',
    confirmButton: 'ooting-swal-confirm px-5 py-2.5 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] active:scale-95 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#C91F28]/40 cursor-pointer',
    cancelButton: 'ooting-swal-cancel px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all mr-2.5 focus:outline-none cursor-pointer',
    denyButton: 'ooting-swal-deny px-5 py-2.5 text-xs font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-xl transition-all mr-2.5 focus:outline-none cursor-pointer',
    actions: 'ooting-swal-actions mt-5 flex items-center justify-end gap-2',
    icon: 'ooting-swal-icon scale-90 mb-1',
  },
  buttonsStyling: false,
  reverseButtons: true,
});

/**
 * Confirmation dialog to replace native window.confirm()
 * @returns Promise<boolean> true if confirmed, false if cancelled
 */
export async function confirmAction({
  title,
  text,
  html,
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  icon = 'question',
  isDangerous = false,
}: {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: 'warning' | 'question' | 'info' | 'error';
  isDangerous?: boolean;
}): Promise<boolean> {
  const customConfirmClass = isDangerous
    ? 'ooting-swal-confirm px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer'
    : 'ooting-swal-confirm px-5 py-2.5 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] active:scale-95 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#C91F28]/40 cursor-pointer';

  const result = await ootingSwal.fire({
    title,
    text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      confirmButton: customConfirmClass,
    },
    background: isDarkMode() ? '#0f172a' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
  });

  return result.isConfirmed;
}

/**
 * Modern success notification dialog
 */
export function notifySuccess(title: string, text?: string): Promise<SweetAlertResult> {
  return ootingSwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'Great, Understood',
    background: isDarkMode() ? '#0f172a' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
  });
}

/**
 * Sanitize technical, Prisma, database or network errors into human-friendly soft messages
 */
export function sanitizeErrorText(rawText?: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return 'We were unable to complete this action right now. Please verify your connection or entries and try again.';
  }
  const lower = rawText.toLowerCase();
  if (lower.includes('unique constraint') || lower.includes('p2002')) {
    return 'A record with this information already exists in the system. Please review your entries.';
  }
  if (lower.includes('foreign key') || lower.includes('p2003')) {
    return 'This action could not be completed because related entries still depend on it.';
  }
  if (lower.includes('record to update not found') || lower.includes('p2025')) {
    return 'The requested record could not be found or has already been removed.';
  }
  if (
    lower.includes('prisma') ||
    lower.includes('invocation:') ||
    lower.includes('syntaxerror') ||
    lower.includes('typeerror') ||
    lower.includes('econnrefused') ||
    lower.includes('internal server error') ||
    lower.includes('status code 500')
  ) {
    return 'Something went wrong while processing your request. Please try again shortly or verify your input.';
  }
  return rawText;
}

/**
 * Modern soft & sweet error notification dialog to replace harsh native alerts
 */
export function notifyError(title: string, text?: string): Promise<SweetAlertResult> {
  const cleanTitle = title
    .replace(/^Failed to /i, 'Could Not ')
    .replace(/^Error: /i, '');
  const cleanText = sanitizeErrorText(text);

  return ootingSwal.fire({
    title: cleanTitle,
    text: cleanText,
    icon: 'warning', // softer visual icon than harsh error cross
    confirmButtonText: 'Understood',
    customClass: {
      popup: 'ooting-swal-popup rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-xl p-6 font-sans',
      title: 'ooting-swal-title text-slate-900 dark:text-white font-bold text-base sm:text-lg tracking-tight',
      htmlContainer: 'ooting-swal-html text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mt-2',
      confirmButton: 'ooting-swal-confirm px-5 py-2.5 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer',
      actions: 'ooting-swal-actions mt-5 flex items-center justify-end',
      icon: 'ooting-swal-icon scale-85 mb-1',
    },
    background: isDarkMode() ? '#0f172a' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
  });
}

/**
 * Modern warning notification dialog
 */
export function notifyWarning(title: string, text?: string): Promise<SweetAlertResult> {
  return ootingSwal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: 'Understood',
    background: isDarkMode() ? '#0f172a' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
  });
}

/**
 * Modern info notification dialog
 */
export function notifyInfo(title: string, text?: string): Promise<SweetAlertResult> {
  return ootingSwal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: 'OK',
    background: isDarkMode() ? '#0f172a' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
  });
}

/**
 * Non-blocking toast notification banner in corner
 */
export function toastNotification({
  title,
  icon = 'success',
  timer = 3500,
}: {
  title: string;
  icon?: 'success' | 'error' | 'warning' | 'info';
  timer?: number;
}) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: isDarkMode() ? '#1e293b' : '#ffffff',
    color: isDarkMode() ? '#f8fafc' : '#0f172a',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon,
    title,
  });
}

/**
 * Convenience helper for quick toast messages
 */
export function showToast(title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
  return toastNotification({ title, icon });
}
