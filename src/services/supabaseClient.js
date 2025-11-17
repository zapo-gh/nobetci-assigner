import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabaseConfig.js'

const supabaseUrl = SUPABASE_CONFIG.url
const supabaseAnonKey = SUPABASE_CONFIG.anonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

const maskedKey = supabaseAnonKey.length > 12
  ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
  : supabaseAnonKey

if (typeof window !== 'undefined') {
  console.info('[Supabase] Connected to:', supabaseUrl)
  console.info('[Supabase] Using public key:', maskedKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

