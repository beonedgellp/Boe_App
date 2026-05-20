import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@beonedge/design-tokens/tokens.css';
import '@beonedge/design-tokens/kit.css';

async function boot() {
  const rootModule = import.meta.env.VITE_BEO_APP_TARGET === 'client'
    ? await import('./ClientRoot.jsx')
    : await import('./BrowserRoot.jsx');
  const Root = rootModule.default;

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </React.StrictMode>
  );
}

boot();
