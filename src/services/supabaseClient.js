import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabaseConfig.js'
import { logger } from '../utils/logger.js'

// Use hardcoded config for public access
const supabaseUrl = SUPABASE_CONFIG.url
const supabaseAnonKey = SUPABASE_CONFIG.anonKey

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Configuration is missing. Please check src/config/supabaseConfig.js')
  logger.error('[Supabase] Configuration is missing')
} else {
  const maskedKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 8
    ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
    : supabaseAnonKey
  console.log('[Supabase] Initializing connection to:', supabaseUrl)
  console.log('[Supabase] Using public key:', maskedKey)
  logger.info('[Supabase] Initializing connection to:', supabaseUrl)
  logger.info('[Supabase] Using public key:', maskedKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection on initialization
if (supabaseUrl && supabaseAnonKey) {
  // Test connection by making a simple query
  supabase.from('teachers').select('count', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) {
        console.warn('[Supabase] Connection test failed:', error.message)
        logger.warn('[Supabase] Connection test failed:', error.message)
      } else {
        console.log('[Supabase] ✓ Connection successful')
        logger.info('[Supabase] ✓ Connection successful')
      }
    })
    .catch((err) => {
      console.error('[Supabase] Connection test error:', err)
      logger.error('[Supabase] Connection test error:', err)
    })
}

export default supabase

