import { createClient } from '@supabase/supabase-js'
import { APP_ENV } from '../config/index.js'

const supabaseUrl = APP_ENV?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = APP_ENV?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check .env.local configuration.')
} else {
  const maskedKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 8
    ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
    : supabaseAnonKey
  console.info('[Supabase] Using URL:', supabaseUrl)
  console.info('[Supabase] Public key detected:', maskedKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

