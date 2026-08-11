import PublicSeoPage from '../components/shared/PublicSeoPage';
import {getReferralCode} from '../hooks/useReferral';
import {marketingApi} from '../services/socialApi';

import React, {useEffect, useMemo} from 'react';
import {Helmet} from 'react-helmet-async';

/**
 * DownloadPage — the install funnel destination for hevolve.ai/download.
 *
 * Why this exists: the marketing flywheel (HARTOS integrations/marketing) posts
 * install links with a ?ref=<channel> tag. Until now hevolve.ai/download 404'd
 * (no SPA route) so every click dead-ended and the funnel recorded 0 events.
 * This page:
 *   1) records the click against its ref-code (POST /api/social/marketing/track),
 *   2) detects the visitor's OS and offers the matching Nunba installer,
 *   3) records the download event so /api/social/marketing/growth attributes
 *      installs per channel.
 *
 * Installers are served from the public GitHub release (verified downloadable
 * unauthenticated) — same URLs documented in the repo README.
 */

const RELEASES = 'https://github.com/hertz-ai/Nunba/releases/latest/download';

const INSTALLERS = {
  windows: {label: 'Windows 10 / 11', file: 'Nunba_Setup.exe', sub: '.exe installer'},
  macos: {label: 'macOS 13+', file: 'Nunba_Setup.dmg', sub: '.dmg'},
  linux: {label: 'Linux', file: 'Nunba-x86_64.AppImage', sub: 'AppImage'},
};

const ORDER = ['windows', 'macos', 'linux'];

function detectOS() {
  const ua = (navigator.userAgent || navigator.platform || '').toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad')) return 'macos';
  if (ua.includes('linux') || ua.includes('x11') || ua.includes('android')) return 'linux';
  return 'windows';
}

function track(code, event, platform) {
  if (!code) return;
  try {
    marketingApi.track({code, event, platform}).catch(() => {});
  } catch (_e) {
    /* funnel tracking is best-effort — never block a download */
  }
}

export default function DownloadPage() {
  // Read ?ref directly (parent useReferral() may already have cleaned the URL;
  // getReferralCode() reads the value it stashed in localStorage as fallback).
  const refCode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') ||
        getReferralCode() || '';
    } catch (_e) {
      return '';
    }
  }, []);

  const os = useMemo(detectOS, []);

  useEffect(() => {
    track(refCode, 'click', 'web');
  }, [refCode]);

  const others = ORDER.filter((k) => k !== os);

  const card = (key, isPrimary) => {
    const it = INSTALLERS[key];
    const href = `${RELEASES}/${it.file}`;
    return (
      <a
        key={key}
        href={href}
        onClick={() => track(refCode, 'download', key)}
        style={{
          display: 'block',
          textDecoration: 'none',
          padding: isPrimary ? '20px 28px' : '14px 20px',
          margin: '10px 0',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.14)',
          background: isPrimary
            ? 'linear-gradient(135deg,#5b8cff 0%,#7a5cff 100%)'
            : 'rgba(255,255,255,0.04)',
          color: isPrimary ? '#fff' : '#cfd6e6',
          fontWeight: isPrimary ? 700 : 500,
          boxShadow: isPrimary ? '0 8px 30px rgba(91,140,255,0.35)' : 'none',
        }}
      >
        <span style={{fontSize: isPrimary ? 18 : 15}}>
          {isPrimary ? 'Download Nunba for ' : 'Also for '}{it.label}
        </span>
        <span style={{display: 'block', fontSize: 12, opacity: 0.75, marginTop: 4}}>
          {it.sub}
        </span>
      </a>
    );
  };

  return (
    <>
      <Helmet>
        <title>Download Nunba — run the hive on your own machine</title>
        <meta
          name="description"
          content="Download Nunba — the open desktop app for crowdsourced, locally-run AI. Free, private, yours. Windows, macOS, Linux."
        />
      </Helmet>
      {/* Parity phase A: this page was a bare <main> registered OUTSIDE
          SocialLayout (MainRoute.js), so clicking "Download" in the sidebar
          unmounted the whole shell and landed the user on a page with ZERO
          navigation — the headless dead-end that prompted "no way to go back".
          Nine sibling public pages already use this scaffold; DownloadPage was
          the outlier.

          The scaffold's header is the whole fix, and every destination in it
          stays inside Nunba: MainRoute.js maps "/" to <Agent key="root"> — the
          same component "/local" renders ("same as root", MainRoute.js:234) —
          and /news, /research, /listings, /blog are all pages in THIS repo.

          So no homeTo override here, deliberately.  "/local" is not a safer
          home, it is a MODE: it sets forceGuestMode on the auth modal and
          auto-opens login when unauthenticated (Demopage.js:424, :5734).
          Pointing a mode-neutral page at it would silently move an online user
          into local mode — the plan's own warning against hardcoding a home
          destination "wrong in both directions".

          The ?ref= attribution above is untouched — marketingApi.track() is the
          reason this page exists, and losing it would silently zero the install
          funnel. */}
      <PublicSeoPage
        heading="download nunba"
        subheading={
          'run the hive on your own machine — free, local, yours. no single '
          + 'company owns the intelligence; 90% of value goes back to the '
          + 'people running the compute.'
        }
        maxWidth="sm"
      >
        <div style={{maxWidth: 540, width: '100%', textAlign: 'center', color: '#e8edf7'}}>
          {card(os, true)}
          {others.map((k) => card(k, false))}

          <p style={{fontSize: 13, opacity: 0.6, marginTop: 22}}>
            open source ·{' '}
            <a href="https://github.com/hertz-ai/HARTOS"
               style={{color: '#8fb0ff'}}>see the code</a>{' '}
            · already running locally for free
          </p>
        </div>
      </PublicSeoPage>
    </>
  );
}
