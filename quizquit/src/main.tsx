import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';  // ✅ ADD THIS
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>   {/* ✅ ADD THIS */}
      <App />
    </HashRouter>
  </StrictMode>,
);
