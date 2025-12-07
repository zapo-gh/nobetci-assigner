import { useEffect, useRef } from 'react';
import { APP_ENV } from '../config/index.js';
import { logger } from '../utils/logger.js';

const VERSION_ENDPOINT = '/version.json';
const DEFAULT_POLL_INTERVAL_MS = 60_000;
const CURRENT_BUILD_VERSION = APP_ENV.buildVersion || APP_ENV.mode || 'development';

const fetchLatestVersionTag = async (signal) => {
  if (typeof fetch !== 'function') {
    return '';
  }

  const cacheBuster = Date.now();
  const url = `${VERSION_ENDPOINT}?t=${cacheBuster}`;

  const response = await fetch(url, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    return '';
  }

  try {
    const payload = await response.json();
    const version = typeof payload?.version === 'string' ? payload.version.trim() : '';
    return version;
  } catch (err) {
    logger.warn?.('[VersionWatcher] version.json parse failed:', err);
    return '';
  }
};

const clearCachesAndReload = async () => {
  if (typeof window === 'undefined') return;

  try {
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker?.getRegistrations
    ) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) =>
          registration.unregister().catch(() => {})
        )
      );
    }
  } catch (err) {
    logger.warn?.('[VersionWatcher] Service worker cleanup failed:', err);
  }

  try {
    if (typeof caches !== 'undefined' && caches?.keys) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((cacheKey) =>
          caches.delete(cacheKey).catch(() => false)
        )
      );
    }
  } catch (err) {
    logger.warn?.('[VersionWatcher] Cache cleanup failed:', err);
  }

  window.location.reload();
};

export function useVersionWatcher({
  enabled = APP_ENV.isProduction,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
} = {}) {
  const reloadTriggeredRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!enabled) return undefined;
    if (!CURRENT_BUILD_VERSION) return undefined;

    let disposed = false;
    const controller = new AbortController();

    const checkVersion = async () => {
      try {
        const latestVersion = await fetchLatestVersionTag(controller.signal);
        if (
          disposed ||
          !latestVersion ||
          latestVersion === CURRENT_BUILD_VERSION ||
          reloadTriggeredRef.current
        ) {
          return;
        }

        reloadTriggeredRef.current = true;
        logger.warn?.(
          `[VersionWatcher] Yeni sürüm bulundu (${CURRENT_BUILD_VERSION} -> ${latestVersion}). Otomatik yenileniyor...`
        );
        await clearCachesAndReload();
      } catch (err) {
        if (disposed || err?.name === 'AbortError') {
          return;
        }
        logger.warn?.('[VersionWatcher] Sürüm kontrolü başarısız:', err);
      }
    };

    const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : DEFAULT_POLL_INTERVAL_MS;

    const intervalId = window.setInterval(checkVersion, safeInterval);
    checkVersion();

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs]);
}

export default useVersionWatcher;

