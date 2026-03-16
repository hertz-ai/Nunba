import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {BrowserRouter} from 'react-router-dom';
import {HelmetProvider} from 'react-helmet-async';
import * as serviceWorker from './serviceWorker';

/**
 * Root-level ErrorBoundary — no MUI/external deps so it works even when
 * chunk loading or theme initialization fails. Uses pure inline styles.
 */
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }
  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }
  componentDidCatch(error, info) {
    console.error('[RootErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const errMsg = this.state.error?.message || 'Unknown error';
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0F0E17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: '40px 32px',
            maxWidth: 420,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #6C63FF, #9B94FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Something went wrong
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            The app encountered an error during startup.
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              marginBottom: 20,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              wordBreak: 'break-word',
              maxHeight: 60,
              overflow: 'hidden',
            }}
          >
            {errMsg}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #9B94FF)',
              color: '#fff',
              border: 'none',
              padding: '12px 32px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);

// Register service worker in production for offline caching of JS/CSS/fonts
serviceWorker.register();
