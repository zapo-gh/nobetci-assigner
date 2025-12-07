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

const noStoreFetch = async (input, init = {}) => {
  const method = (init.method || 'GET').toUpperCase()
  const shouldSendJson = method !== 'GET'
  const headers = new Headers(init.headers || {})

  headers.set('cache-control', 'no-store')
  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseAnonKey)
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`)
  }
  if (shouldSendJson && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const nextInit = {
    ...init,
    method,
    cache: 'no-store',
    headers,
  }
  return fetch(input, nextInit)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: noStoreFetch,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  },
})

export default supabase

