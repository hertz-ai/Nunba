// Compute-tier badge formatter.
//
// Single source of truth for "where did this reply come from?" UI.
// Maps the (servedBy, nodeTier) pair from /chat response_json
// (see Nunba routes/chatbot_routes.py:2693 and the cloud chatbot
// pipeline) to a short label + emoji + colour.
//
// Privacy contract: 'local' served_by means on-device or LAN compute,
// no cloud egress occurred.  Anything served_by==='cloud' (or 'hive')
// crossed an internet boundary — the user should see that explicitly.
//
// servedBy: 'local' | 'cloud' | 'hive' | undefined
// nodeTier: 'flat' | 'regional' | 'central' | undefined
//
// Returns: { label, emoji, color, sublabel }
//   label    — primary chip text ("On-device", "LAN", "Cloud", "Hive")
//   emoji    — single glyph for compact UIs
//   color    — hex; greens for local-only, blues for federated, orange
//              for cloud egress (the colour itself signals trust level)
//   sublabel — tier descriptor ("flat node", "regional hub", "central")

const LOCAL_GREEN = '#2ECC71';
const LAN_GREEN   = '#27AE60';
const HIVE_BLUE   = '#6C63FF';
const CLOUD_AMBER = '#F39C12';

export function formatTier(servedBy, nodeTier) {
  const tier = (nodeTier || 'flat').toLowerCase();
  const served = (servedBy || '').toLowerCase();

  // Cloud egress takes precedence over tier — if the bytes left the
  // box, that's what the user needs to see, regardless of which
  // node served the request.
  if (served === 'cloud' || served.includes('cloud')) {
    return {
      label: 'Cloud',
      emoji: '🌐',
      color: CLOUD_AMBER,
      sublabel: tier === 'central' ? 'central' : `${tier} → cloud`,
    };
  }

  if (served === 'hive') {
    return {
      label: 'Hive',
      emoji: '🐝',
      color: HIVE_BLUE,
      sublabel: 'federated peers',
    };
  }

  // local served_by — colour by tier so the user can tell on-device
  // (green) from LAN-shared HARTOS (slightly darker green) at a glance.
  if (tier === 'regional') {
    return {
      label: 'LAN',
      emoji: '🏠',
      color: LAN_GREEN,
      sublabel: 'regional hub',
    };
  }
  if (tier === 'central') {
    // local served_by + central tier means the central instance
    // served itself — still cloud from any other client's perspective,
    // but on-host from its own.  Be honest with the label.
    return {
      label: 'On-host',
      emoji: '🖥️',
      color: HIVE_BLUE,
      sublabel: 'central node',
    };
  }
  // Default: flat tier, local served — the privacy-first happy path.
  return {
    label: 'On-device',
    emoji: '🔒',
    color: LOCAL_GREEN,
    sublabel: 'flat node',
  };
}
