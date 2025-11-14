import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabaseConfig.js'

// Use hardcoded config for public access
const supabaseUrl = SUPABASE_CONFIG.url
const supabaseAnonKey = SUPABASE_CONFIG.anonKey

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check src/config/supabaseConfig.js')
} else {
  const maskedKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 8
    ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
    : supabaseAnonKey
  console.info('[Supabase] Connected to:', supabaseUrl)
  console.info('[Supabase] Using public key:', maskedKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

