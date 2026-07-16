import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { initTracing } from './lib/otel'
import './index.css'

try {
  initTracing()
} catch (err) {
  console.warn('Failed to initialize tracing', err)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
