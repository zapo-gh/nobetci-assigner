import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles.css'
import App from './App.jsx'
import { APP_ENV } from './config/index.js'

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
