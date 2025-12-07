import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles.css'
import App from './App.jsx'
import { APP_ENV } from './config/index.js'
import { TeachersProvider } from './contexts/TeachersContext.jsx'
import { ClassesProvider } from './contexts/ClassesContext.jsx'
import { AssignmentsProvider } from './contexts/AssignmentsContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <TeachersProvider>
      <ClassesProvider>
        <AssignmentsProvider>
          <App />
        </AssignmentsProvider>
      </ClassesProvider>
    </TeachersProvider>
  </ErrorBoundary>
)

if ('serviceWorker' in navigator) {
  if (APP_ENV.isDevelopment) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => { })
        })
      })
      .catch(() => { })
  } else if (APP_ENV.isProduction) {
    window.addEventListener('load', () => {
      const params = new URLSearchParams()
      if (APP_ENV.assetsBaseUrl) {
        params.set('assetsBase', APP_ENV.assetsBaseUrl)
      }
      if (APP_ENV.buildVersion) {
        params.set('v', APP_ENV.buildVersion)
      }
      const query = params.toString()
      const suffix = query ? `?${query}` : ''
      navigator.serviceWorker
        .register(`/service-worker.js${suffix}`)
        .catch((err) => {
          console.error('Service worker registration failed:', err)
        })
    })
  }
}
