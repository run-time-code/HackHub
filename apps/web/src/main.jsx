import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { DEMO_MODE } from './lib/demo'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  })
}

async function bootstrap() {
  if (DEMO_MODE) {
    try {
      const { startMockWorker } = await import('./mocks/browser')
      await startMockWorker()
    } catch (error) {
      // A service worker cannot run from file:// or in some private modes.
      // Let the app mount anyway so the failure is visible and actionable.
      console.warn('Demo mode could not start the mock worker.', error)
    }
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Sentry.ErrorBoundary fallback={<main role="alert">Something went wrong. Please reload the page.</main>}>
        <App />
      </Sentry.ErrorBoundary>
    </StrictMode>,
  )
}

bootstrap()
