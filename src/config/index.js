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

const resolveBuildVersion = () => {
  const candidates = [
    env.VITE_APP_VERSION,
    env.VITE_GIT_COMMIT_SHA,
    env.VITE_COMMIT_SHA,
    env.VITE_RENDER_GIT_COMMIT,
    env.VERCEL_GIT_COMMIT_SHA,
    env.BUILD_ID,
    env.APP_VERSION,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
};

export const APP_ENV = {
  mode: env.MODE || 'development',
  isDevelopment: Boolean(env.DEV),
  isProduction: Boolean(env.PROD),
  apiBaseUrl: env.VITE_API_BASE_URL || '',
  assetsBaseUrl: normalizeUrl(env.VITE_ASSETS_BASE_URL || ''),
  enableAnalytics: toBoolean(env.VITE_ENABLE_ANALYTICS),
  supabaseUrl: env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
  buildVersion: resolveBuildVersion(),
};

export const getAssetUrl = (path = '') => {
  if (!path) return '';
  const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
  return APP_ENV.assetsBaseUrl
    ? `${APP_ENV.assetsBaseUrl}/${sanitizedPath}`
    : `/${sanitizedPath}`;
};

export default APP_ENV;

