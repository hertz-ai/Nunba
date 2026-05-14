import React, {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {Link, useSearchParams} from 'react-router-dom';

const API_BASE =
  (typeof window !== 'undefined' && window.HEVOLVE_API_BASE
    ? window.HEVOLVE_API_BASE
    : 'https://api.hevolve.ai');

export default function UpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [state, setState] = useState({status: 'verifying', payload: null, error: null});

  useEffect(() => {
    let cancelled = false;
    const token =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('access_token')
        : null;

    if (!sessionId) {
      setState({
        status: 'error',
        error: 'No session_id in URL.  This page expects Stripe to redirect ' +
               'here with ?session_id=cs_...',
      });
      return;
    }
    if (!sessionId.startsWith('cs_')) {
      setState({status: 'error', error: `Invalid session_id format: ${sessionId}`});
      return;
    }
    if (!token) {
      setState({
        status: 'error',
        error: 'You are not signed in.  Please sign in with the same account ' +
               'you used to start checkout, then refresh this page.',
      });
      return;
    }

    fetch(`${API_BASE}/api/v1/intelligence/upgrade/checkout/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({session_id: sessionId}),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && j.success) {
          setState({status: 'success', payload: j, error: null});
        } else {
          setState({
            status: 'error',
            error: j.error || `HTTP ${r.status}`,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({status: 'error', error: err.message});
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const bg = '#0F0E17';
  const card = '#1E1E1E';
  const accent = '#00E89D';
  const danger = '#FF6B6B';

  return (
    <>
      <Helmet>
        <title>Upgrade complete | Hevolve AI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{minHeight: '100vh', backgroundColor: bg, color: '#F5F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
        <div style={{
          backgroundColor: card,
          borderRadius: 12,
          padding: '2rem',
          maxWidth: 640,
          width: '100%',
          border: state.status === 'error'
            ? `1px solid ${danger}`
            : `1px solid rgba(0,232,157,0.3)`,
        }}>
          {state.status === 'verifying' && (
            <>
              <h1 style={{fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem'}}>
                Finalizing your upgrade…
              </h1>
              <p style={{opacity: 0.85}}>
                We are verifying the payment with Stripe and bumping your API key
                tier.  This usually takes a couple of seconds.
              </p>
              <p style={{opacity: 0.55, fontSize: '0.85rem', marginTop: '1rem'}}>
                Session: <code>{sessionId.slice(0, 16)}…</code>
              </p>
            </>
          )}

          {state.status === 'success' && (
            <>
              <h1 style={{fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #00E89D, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                You are upgraded.
              </h1>
              <p style={{opacity: 0.9, marginBottom: '1.5rem'}}>
                Welcome to the {state.payload.api_key.tier.toUpperCase()} tier.
                Higher rate limits are live on your existing API key — you do
                not need a new one.
              </p>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem'}}>
                <div style={{padding: '0.75rem', backgroundColor: 'rgba(0,232,157,0.08)', borderRadius: 8}}>
                  <div style={{opacity: 0.65, fontSize: '0.85rem'}}>New tier</div>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{state.payload.api_key.tier}</div>
                </div>
                <div style={{padding: '0.75rem', backgroundColor: 'rgba(108,99,255,0.08)', borderRadius: 8}}>
                  <div style={{opacity: 0.65, fontSize: '0.85rem'}}>Charge</div>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>${state.payload.payment.amount_usd}</div>
                </div>
                <div style={{padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8}}>
                  <div style={{opacity: 0.65, fontSize: '0.85rem'}}>Daily limit</div>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>
                    {Number(state.payload.api_key.rate_limit_per_day).toLocaleString()} req
                  </div>
                </div>
                <div style={{padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8}}>
                  <div style={{opacity: 0.65, fontSize: '0.85rem'}}>Monthly quota</div>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>
                    {Number(state.payload.api_key.monthly_quota).toLocaleString()} tokens
                  </div>
                </div>
              </div>

              <div style={{padding: '1rem', backgroundColor: 'rgba(108,99,255,0.06)', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.88rem', opacity: 0.85}}>
                <strong style={{color: accent}}>Where your $</strong>{state.payload.payment.amount_usd}<strong style={{color: accent}}> went:</strong>
                <ul style={{margin: '0.5rem 0 0 1rem', padding: 0}}>
                  <li>${state.payload.revenue_split.users_pool_usd} to compute providers (90%)</li>
                  <li>${state.payload.revenue_split.infrastructure_usd} to infrastructure (9%)</li>
                  <li>${state.payload.revenue_split.central_usd} to us (1%)</li>
                </ul>
              </div>

              <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
                <Link
                  to="/admin/agents"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    backgroundImage: 'linear-gradient(to right, #00E89D, #0078FF)',
                    color: '#0F0E17',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Open dashboard
                </Link>
                <Link
                  to="/docs"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#F5F4FF',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Read the docs
                </Link>
              </div>

              <p style={{opacity: 0.55, fontSize: '0.8rem', marginTop: '1.5rem'}}>
                Receipt: payment {state.payload.payment_request_id}{state.payload.payment.stripe_payment_intent
                  ? ` · Stripe ${state.payload.payment.stripe_payment_intent}`
                  : ''}
              </p>
            </>
          )}

          {state.status === 'error' && (
            <>
              <h1 style={{fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', color: danger}}>
                Something went wrong
              </h1>
              <p style={{opacity: 0.9, marginBottom: '1rem'}}>
                We received the Stripe redirect but could not finalize your
                upgrade.
              </p>
              <pre style={{
                backgroundColor: '#15141C',
                padding: '0.75rem',
                borderRadius: 6,
                fontSize: '0.85rem',
                color: '#FF8888',
                overflowX: 'auto',
              }}>
                {state.error}
              </pre>
              <p style={{opacity: 0.65, fontSize: '0.85rem', marginTop: '1rem'}}>
                Your card may or may not have been charged.  Check the
                Stripe receipt in your email.  If the charge went through
                but the tier did not update, email{' '}
                <a href="mailto:support@hevolve.ai" style={{color: accent}}>
                  support@hevolve.ai
                </a>{' '}
                with this session id:
              </p>
              <code style={{display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.6}}>
                {sessionId || '(missing)'}
              </code>
              <div style={{marginTop: '1.5rem'}}>
                <Link
                  to="/pricing"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#F5F4FF',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Back to pricing
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
