const env = import.meta.env || {};

const normalizeUrl = (value = '') => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

export const APP_ENV = {
  mode: env.MODE || 'development',
  isDevelopment: Boolean(env.DEV),
  isProduction: Boolean(env.PROD),
  apiBaseUrl: env.VITE_API_BASE_URL || '',
  assetsBaseUrl: normalizeUrl(env.VITE_ASSETS_BASE_URL || ''),
  enableAnalytics: toBoolean(env.VITE_ENABLE_ANALYTICS),
};

export const getAssetUrl = (path = '') => {
  if (!path) return '';
  const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
  return APP_ENV.assetsBaseUrl
    ? `${APP_ENV.assetsBaseUrl}/${sanitizedPath}`
    : `/${sanitizedPath}`;
};

export default APP_ENV;

