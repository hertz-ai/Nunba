import realtimeService from '../services/realtimeService';
import useAuthSession from '../hooks/useAuthSession';
import {isLocalBackendHost} from '../utils/backendHost';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

const RealtimeContext = createContext();

export function RealtimeProvider({children}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const session = useAuthSession();

  useEffect(() => {
    const unsubConnect = realtimeService.on('connected', () =>
      setConnected(true)
    );
    const unsubDisconnect = realtimeService.on('disconnected', () =>
      setConnected(false)
    );
    const unsubAll = realtimeService.on('*', (event) => setLastEvent(event));

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubAll();
      realtimeService.disconnect();
    };
  }, []);

  // Keep the singleton transport on the same canonical identity that chat
  // requests use. In bundled/LAN guest mode the explicit user_id is the local
  // trust identity; an unrelated persisted cloud token must not win URL
  // construction. Hosted guests still use their HARTOS JWT because remote SSE
  // correctly refuses an unauthenticated user_id claim.
  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const localBackend = isLocalBackendHost(hostname);
    const userId = session.identity.user_id || 'guest';
    const sessionToken = session.tokens.cloud || session.tokens.hartos_local;
    const token = session.status === 'guest' && localBackend
      ? null
      : sessionToken;

    if (token || localBackend) {
      realtimeService.setIdentity({userId, token});
    } else {
      // Remote anonymous sessions cannot authenticate SSE. Crossing this
      // boundary must clear any previous owner's cached credentials.
      realtimeService.disconnect();
    }
  }, [
    session.status,
    session.identity.user_id,
    session.tokens.cloud,
    session.tokens.hartos_local,
  ]);

  const subscribe = useCallback((eventType, callback) => {
    return realtimeService.on(eventType, callback);
  }, []);

  return (
    <RealtimeContext.Provider value={{connected, lastEvent, subscribe}}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

export default RealtimeContext;
