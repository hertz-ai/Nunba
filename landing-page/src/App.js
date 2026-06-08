import AgentContactRequest from './components/Agent/AgentContactRequest';
import ApiErrorBanner from './components/shared/ApiErrorBanner';
import PageSkeleton from './components/shared/PageSkeleton';
import {ToastProvider} from './components/shared/ToastProvider';
import NunbaTitleBar, {shouldRenderTitleBar} from './components/Shell/NunbaTitleBar';
import {GA_TRACKING_ID, API_BASE_URL} from './config/apiBase';
import {RealtimeProvider} from './contexts/RealtimeContext';
import {SocialProvider} from './contexts/SocialContext';
import {NunbaThemeProvider} from './contexts/ThemeContext';
import {useReferral} from './hooks/useReferral';
import useStorageSync from './hooks/useStorageSync';
import MainRoutes from './MainRoute';
import realtimeService from './services/realtimeService';

import React, {Suspense, useEffect, useState, useCallback} from 'react';
import ReactGA from 'react-ga';
import {useLocation, useNavigate} from 'react-router-dom';

import './assets/css/tailwind.css';

function App() {
  // Pull cloud-signin creds from companion storage into localStorage on
  // mount.  See hooks/useStorageSync.js for the omniparser-gui parity
  // rationale.  Idempotent and non-overwriting.
  useStorageSync();

  // Capture ?ref=<channel> from flywheel install links app-wide → localStorage,
  // so it attributes on signup (and DownloadPage records the click/download).
  useReferral();

  const [contactRequest, setContactRequest] = useState(null);
  const navigate = useNavigate();

  // Defer materialdesignicons (420KB) — load after first paint, not render-blocking
  useEffect(() => {
    import('./assets/css/materialdesignicons.min.css');
  }, []);

  useEffect(() => {
    if (GA_TRACKING_ID) ReactGA.initialize(GA_TRACKING_ID);
  }, []);
  const location = useLocation();
  useEffect(() => {
    ReactGA.pageview(location.pathname + location.search);
  }, [location]);

  // Listen for proactive agent contact requests
  useEffect(() => {
    const unsub = realtimeService.on('agent_contact_request', (data) => {
      if (data?.requires_consent) {
        setContactRequest(data);
      }
    });
    // Owned agent direct messages — show as toast or navigate to chat
    const unsubDirect = realtimeService.on('agent_message', (data) => {
      if (data?.agent_id) {
        // Store in localStorage so Agent component picks it up
        localStorage.setItem('active_agent_id', data.agent_id);
        localStorage.setItem('agent_proactive_message', JSON.stringify(data));
      }
    });
    return () => {
      unsub();
      unsubDirect();
    };
  }, []);

  const handleAcceptContact = useCallback(
    (req) => {
      const jwt = localStorage.getItem('jwt');
      const headers = {'Content-Type': 'application/json'};
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
      fetch(`${API_BASE_URL}/agents/contact/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({request_id: req.request_id, action: 'accept'}),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.agent_id) {
            localStorage.setItem('active_agent_id', data.agent_id);
            navigate('/');
          }
        })
        .catch(() => {});
      setContactRequest(null);
    },
    [navigate]
  );

  const handleDenyContact = useCallback((req) => {
    const jwt = localStorage.getItem('jwt');
    const headers = {'Content-Type': 'application/json'};
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    fetch(`${API_BASE_URL}/agents/contact/respond`, {
      method: 'POST',
      headers,
      body: JSON.stringify({request_id: req.request_id, action: 'deny'}),
    }).catch(() => {});
    setContactRequest(null);
  }, []);

  return (
    <NunbaThemeProvider>
      <RealtimeProvider>
        <ToastProvider>
          <SocialProvider>
            {/* Global server-error toast — subscribes to
                'hevolve:api-error' CustomEvents from axiosFactory's
                response interceptor.  Same contract as Hevolve RN's
                DeviceEventEmitter('ApiError') + iOS Swift mirror, so
                the UX feels identical across surfaces. */}
            {/* Custom dark titlebar — pywebview frameless mode, Win+Linux only.
                Companion floating windows (app.py:_companion_window) already use
                their OWN frameless rendering and load /companion route; their
                URL bypasses this MainRoute, so they never see <NunbaTitleBar />
                — no double-chrome risk.  Detection happens inside the component
                (shouldRenderTitleBar checks pywebview + non-macOS). */}
            {/* NunbaTitleBar wraps MainRoutes so its TitleBarSlotProvider
                is in scope for every page — Demopage's chip can portal into
                the titlebar's right cluster when present, else render inline. */}
            <NunbaTitleBar>
              <ApiErrorBanner />
              <AgentContactRequest
                request={contactRequest}
                onAccept={handleAcceptContact}
                onDeny={handleDenyContact}
              />
              <main
                id="main-content"
                style={shouldRenderTitleBar() ? {paddingTop: 32} : undefined}
              >
                <Suspense fallback={<PageSkeleton />}>
                  <MainRoutes />
                </Suspense>
              </main>
            </NunbaTitleBar>
          </SocialProvider>
        </ToastProvider>
      </RealtimeProvider>
    </NunbaThemeProvider>
  );
}

export default App;
