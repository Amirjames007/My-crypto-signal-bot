// Prevent libraries from overwriting window.fetch which causes "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: false,
      configurable: false
    });
  } catch (e) {
    // Already read-only or other error, ignore
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
