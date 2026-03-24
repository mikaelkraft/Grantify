import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ErrorBoundary } from './components/ErrorBoundary';

// Legacy routing migration: convert "#/path" URLs into real paths for BrowserRouter.
// Example: https://grantify.help/#/privacy -> https://grantify.help/privacy
try {
  const hash = window.location.hash || '';
  if (hash.startsWith('#/')) {
    const next = hash.slice(1); // keep leading '/'
    window.history.replaceState(null, '', next);
  }
} catch {
  // ignore
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);