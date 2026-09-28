/**
 * Live Synchronization Hook
 * Provides battery- and network-efficient background synchronization for real-time CRM updates.
 * Pauses background queries when the user leaves the tab, and immediately refreshes when the user returns.
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseLiveSyncOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function useLiveSync(
  syncFn: (isSilent: boolean) => Promise<void> | void,
  dependencies: any[] = [],
  options: UseLiveSyncOptions = {}
) {
  const { intervalMs = 45000, enabled = true } = options;
  const syncFnRef = useRef(syncFn);
  syncFnRef.current = syncFn;

  const runSync = useCallback((isSilent = true) => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return; // Do not waste network / database queries when user is on another tab
    }
    syncFnRef.current(isSilent);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Run initial fetch whenever dependencies change
    syncFnRef.current(false);

    // Visibility change listener: immediately refresh when user returns to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync(true);
      }
    };

    // Window focus listener: immediately refresh on window focus
    const handleFocus = () => {
      runSync(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Relaxed background polling interval
    const timerId = setInterval(() => {
      runSync(true);
    }, intervalMs);

    return () => {
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [...dependencies, enabled, intervalMs, runSync]);

  return { refreshNow: () => syncFnRef.current(false) };
}
