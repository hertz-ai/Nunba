/**
 * useCameraFrameStream — capture getUserMedia frames and push them
 * over a WebSocket to HARTOS VisionService on port 5460.
 *
 * VisionService.start('full') listens on :5460 for JPEG frames keyed by
 * {user_id, channel}. Its description loop (~4s cadence) runs the
 * 0.8B VLM on each new frame and writes captions to MemoryGraph, so
 * the agent can answer "what am I doing now" / "what did I see 5min
 * ago". Before this hook there was NO client code in Nunba producing
 * frames — the server side was listening to an empty socket.
 *
 * Usage:
 *   useCameraFrameStream({
 *     enabled: cameraOn,
 *     userId: decryptedUserId,
 *     wsUrl: 'ws://127.0.0.1:5460',  // defaults to /vision/stream-port
 *   });
 *
 * The hook is idempotent per (enabled, userId) pair — toggling enabled
 * tears down the stream cleanly and stops the track so the browser
 * LED goes off.
 *
 * The camera is held only while it is used (owner 2026-11-13: "zoom call
 * also demands that nunba relinquishes the camera gracefully"):
 *   - it is opened only once the socket to VisionService is open, and freed
 *     when the socket closes (the vision service stopped, the eye button);
 *     the socket is retried every RECONNECT_MS while the stream is wanted;
 *   - while the person's phone streams its camera to this desktop the
 *     service says "video_pause": the camera is freed for other apps and
 *     the page says "video_paused" every PAUSED_HEARTBEAT_MS until the
 *     service says "video_resume" (the phone stopped) and it is opened again.
 */
import {useEffect, useRef} from 'react';

const DEFAULT_FPS = 1;       // one frame per second is plenty for captions
const JPEG_QUALITY = 0.7;     // tradeoff: smaller over wire vs caption fidelity
const MAX_DIMENSION = 640;    // downsample — 0.8B VLM works fine at 640x480
export const RECONNECT_MS = 10000;        // retry a closed socket this often
export const PAUSED_HEARTBEAT_MS = 5000;  // a paused page asks to resume this often

export default function useCameraFrameStream({
  enabled,
  userId,
  channel = 'camera',
  wsUrl = null,
  fps = DEFAULT_FPS,
} = {}) {
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return undefined;
    }

    let cancelled = false;
    let heartbeat = null;     // 'video_paused' while the phone is the camera
    let reconnect = null;     // the next try of a closed socket
    let cameraWanted = false; // socket open and not paused
    let acquiring = false;    // a getUserMedia is in flight

    const stopHeartbeat = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    // Free the camera device (tracks stopped, LED off); the socket stays.
    const freeCamera = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            /* track already stopped */
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch { /* ignore */ }
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      canvasRef.current = null;
    };

    // Everything: the camera, the socket, the timers (unmount / disable).
    const stop = () => {
      if (reconnect) {
        clearTimeout(reconnect);
        reconnect = null;
      }
      stopHeartbeat();
      cameraWanted = false;
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* swallow — WebSocket may already be closed */
        }
      }
      freeCamera();
    };

    const captureAndSend = () => {
      const ws = wsRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!video || !canvas || video.readyState < 2) return;
      try {
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob || !wsRef.current) return;
          blob.arrayBuffer().then((buf) => {
            try {
              wsRef.current.send(buf);
            } catch { /* socket closed */ }
          });
        }, 'image/jpeg', JPEG_QUALITY);
      } catch { /* frame drop — next tick retries */ }
    };

    // Open the camera (getUserMedia + hidden video + offscreen canvas for
    // JPEG encode) unless it is open; a pause or close that lands while
    // getUserMedia is in flight frees what it returns.
    const takeCamera = async () => {
      cameraWanted = true;
      if (streamRef.current || acquiring) return;
      acquiring = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {ideal: MAX_DIMENSION},
            height: {ideal: Math.round(MAX_DIMENSION * 3 / 4)},
            frameRate: {ideal: Math.max(fps, 5)},
          },
        });
        if (cancelled || !cameraWanted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        if (streamRef.current !== stream) return; // freed meanwhile
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || MAX_DIMENSION, MAX_DIMENSION);
        canvas.height = Math.min(
          video.videoHeight || Math.round(MAX_DIMENSION * 3 / 4),
          Math.round(MAX_DIMENSION * 3 / 4),
        );
        canvasRef.current = canvas;
        intervalRef.current = setInterval(captureAndSend, Math.round(1000 / fps));
      } catch (e) {
        /* eslint-disable-next-line no-console */
        console.warn('useCameraFrameStream: getUserMedia failed', e);
        freeCamera();
      } finally {
        acquiring = false;
      }
    };

    const connect = (resolved) => {
      if (cancelled) return;
      let ws;
      try {
        ws = new WebSocket(resolved);
      } catch (e) {
        /* eslint-disable-next-line no-console */
        console.warn('useCameraFrameStream: WebSocket failed', e);
        scheduleReconnect(resolved);
        return;
      }
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        try {
          // VisionService _ws_handler protocol (integrations/vision/
          // vision_service.py):
          //   1. digit string → identifies user_id
          //   2. 'video_start' (camera) or 'screen_start' (screen)
          //   3. binary JPEG frames
          //   4. 'video_stop' to end
          // Prior JSON register was silently ignored — frames arrived
          // with user_id=None so put_frame was never called.
          ws.send(String(userId));
          ws.send(channel === 'screen' ? 'screen_start' : 'video_start');
        } catch { /* ignore */ }
        takeCamera();
      };

      ws.onmessage = (ev) => {
        if (ev.data === 'video_pause') {
          // The person's phone is the camera now: free this one.
          cameraWanted = false;
          freeCamera();
          if (!heartbeat) {
            heartbeat = setInterval(() => {
              try {
                if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
                  ws.send('video_paused');
                }
              } catch { /* socket closed */ }
            }, PAUSED_HEARTBEAT_MS);
          }
        } else if (ev.data === 'video_resume') {
          stopHeartbeat();
          takeCamera();
        }
      };

      ws.onerror = () => { /* onclose follows */ };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        // The vision service is gone (stopped, or the eye button): no one
        // reads the frames, so the camera is freed until the socket is back.
        wsRef.current = null;
        cameraWanted = false;
        stopHeartbeat();
        freeCamera();
        scheduleReconnect(resolved);
      };
    };

    const scheduleReconnect = (resolved) => {
      if (cancelled || reconnect) return;
      reconnect = setTimeout(() => {
        reconnect = null;
        connect(resolved);
      }, RECONNECT_MS);
    };

    (async () => {
      // Resolve WebSocket URL. Backend exposes /vision/stream-port
      // so the port stays configurable; fall back to 5460 direct.
      let resolved = wsUrl;
      if (!resolved) {
        try {
          const portResp = await fetch('/vision/stream-port');
          if (portResp.ok) {
            const data = await portResp.json();
            resolved = data.url || `ws://127.0.0.1:${data.port || 5460}`;
          }
        } catch { /* fall through to default */ }
      }
      if (!resolved) {
        resolved = 'ws://127.0.0.1:5460';
      }
      connect(resolved);
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, userId, channel, wsUrl, fps]);
}
