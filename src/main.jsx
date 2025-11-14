import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles.css'
import { APP_ENV } from './config/index.js'
import { logger } from './utils/logger.js'

import App from './App.jsx'

// Supabase client'ı import et - bu bağlantı testini tetikler
console.log('[Main] Initializing application...')
import('./services/supabaseClient.js').then(() => {
  console.log('[Main] ✓ Supabase client module loaded')
  logger.info('[Main] ✓ Supabase client module loaded')
}).catch((err) => {
  console.error('[Main] ✗ Failed to load Supabase client module:', err)
  logger.error('[Main] ✗ Failed to load Supabase client module:', err)
})

// Global error handler - yakalanmamış hataları yakala
window.addEventListener('error', (event) => {
  logger.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
  // Hata mesajını kullanıcıya gösterme - sadece logla
})

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    promise: event.promise
  })
  
  // Supabase hatalarını özel olarak handle et
  if (event.reason && typeof event.reason === 'object') {
    const error = event.reason
    
    // Supabase hata kodlarını kontrol et
    if (error.status || error.code) {
      const status = error.status || error.code
      
      // Rate limit (429) - kullanıcıya bilgi ver ama hata gösterme
      if (status === 429) {
        logger.warn('[Supabase] Rate limit reached, will retry automatically')
        event.preventDefault() // Hata mesajını bastır
        return
      }
      
      // Geçici sunucu hataları (500, 502, 503, 504) - retry yapılacak
      if ([500, 502, 503, 504].includes(status)) {
        logger.warn(`[Supabase] Server error ${status}, will retry automatically`)
        event.preventDefault()
        return
      }
      
      // Yetkilendirme hatası (401, 403) - kullanıcıya göster
      if ([401, 403].includes(status)) {
        logger.error(`[Supabase] Authorization error ${status}`)
        // Bu hatalar kullanıcıya gösterilmeli
      }
    }
  }
  
  // Diğer hatalar için preventDefault yapma - normal hata akışına devam et
})

createRoot(document.getElementById('root')).render(
  <App />
)

if ('serviceWorker' in navigator) {
  if (APP_ENV.isDevelopment) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {})
        })
      })
      .catch(() => {})
  } else if (APP_ENV.isProduction) {
    window.addEventListener('load', () => {
      const assetBase = APP_ENV.assetsBaseUrl || ''
      const params = assetBase ? `?assetsBase=${encodeURIComponent(assetBase)}` : ''
      navigator.serviceWorker
        .register(`/service-worker.js${params}`)
        .catch((err) => {
          console.error('Service worker registration failed:', err)
        })
    })
  }
}
