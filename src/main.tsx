import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch startup errors and display them on screen
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.childElementCount === 0) {
    root.innerHTML = `
      <div style="padding: 20px; color: #ef4444; background: #1e293b; font-family: sans-serif; min-height: 100vh;">
        <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Startup Error:</h1>
        <pre style="background: #0f172a; padding: 15px; border-radius: 8px; overflow: auto; font-size: 13px;">${event.message}\n${event.error?.stack || ''}</pre>
      </div>
    `;
  }
});

// Also catch async errors (unhandled promise rejections from Firebase/Gemini)
window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root && root.childElementCount === 0) {
    root.innerHTML = `
      <div style="padding: 20px; color: #f97316; background: #1e293b; font-family: sans-serif; min-height: 100vh;">
        <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Async Error (Unhandled Rejection):</h1>
        <pre style="background: #0f172a; padding: 15px; border-radius: 8px; overflow: auto; font-size: 13px;">${event.reason?.message || String(event.reason)}\n${event.reason?.stack || ''}</pre>
      </div>
    `;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
