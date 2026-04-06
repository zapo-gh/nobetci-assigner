import { APP_ENV } from './index.js'

const sanitize = (value = '') => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export const SUPABASE_CONFIG = {
  url: sanitize(APP_ENV.supabaseUrl),
  anonKey: sanitize(APP_ENV.supabaseAnonKey)
}
