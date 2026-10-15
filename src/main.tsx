import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker with automatic update handling
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[MessSync PWA] New update available.');
      },
      onOfflineReady() {
        console.log('[MessSync PWA] Application ready for offline use.');
      },
    });
  }).catch((err) => {
    console.warn('[MessSync PWA] Registration error:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
