// Backend-host classifier — "is the Flask backend serving this page
// local to me?" decides whether the SPA opens the *cloud* Crossbar
// WAMP socket or the *embedded* WAMP router on the same machine.
//
// Privacy contract: a LAN-hosted Nunba (e.g. desktop on 192.168.1.50,
// phone visits http://192.168.1.50:6777) MUST connect to the LAN
// crossbar, NOT to wss://aws_rasa.hertzai.com.  The previous check
// only matched literal localhost/127.0.0.1/0.0.0.0, so every cross-
// device LAN client was silently routed through the public cloud
// WAMP — the bytes left the user's network unnecessarily.
//
// Recognised "local" hostnames:
//   - localhost / 127.0.0.1 / ::1 / 0.0.0.0
//   - any RFC1918 private IPv4: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
//   - link-local IPv4:           169.254.0.0/16
//   - link-local IPv6:           fe80::/10
//   - .local mDNS hostnames (Bonjour / Avahi / NSD)
//
// Public cloud hostnames (anything else) are treated as cloud-tier.

const RFC1918_PATTERNS = [
  /^10\./,                      // 10.0.0.0/8
  /^192\.168\./,                // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[0-1])\./ // 172.16.0.0/12
];

export function isLocalBackendHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0') return true;
  if (h === '127.0.0.1' || h.startsWith('127.')) return true; // 127/8 loopback
  if (h === '::1' || h === '[::1]') return true;
  if (h.endsWith('.local')) return true;                       // mDNS
  if (h.startsWith('169.254.')) return true;                   // IPv4 link-local
  if (h.startsWith('fe80:') || h.startsWith('[fe80:')) return true; // IPv6 link-local
  for (const re of RFC1918_PATTERNS) if (re.test(h)) return true;
  return false;
}

/**
 * Compute the WAMP URL for the embedded crossbar router that ships
 * with Nunba (port 8088).  When the SPA was loaded over LAN, the
 * router lives on the same host as the Flask backend — NOT on the
 * client's loopback.
 *
 * @param {string} hostname - usually window.location.hostname
 * @param {string} [protocol='ws'] - 'ws' for plain, 'wss' for TLS
 * @param {number} [port=8088] - embedded router port
 * @returns {string} ws URL
 */
export function localWampUrl(hostname, protocol = 'ws', port = 8088) {
  const h = (hostname || 'localhost').toLowerCase();
  // IPv6 literals need brackets in URLs
  const hostPart = h.startsWith('[') ? h : (h.includes(':') && !h.includes('.') ? `[${h}]` : h);
  return `${protocol}://${hostPart}:${port}/ws`;
}
