import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '../index.css';
import { initSecurityGuardian } from './utils/securityGuardian';

// Start the production-grade browser fortress and anti-cracking shield
initSecurityGuardian();

// Prevent pinch-to-zoom gestures (multi-touch) on the document level
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// Prevent double-tap zoom triggers
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
