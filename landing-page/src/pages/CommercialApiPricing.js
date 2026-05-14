import React, {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {Link, useNavigate} from 'react-router-dom';

const FALLBACK_TIERS = {
  free: {
    tier: 'free',
    monthly_price_usd: 0,
    description: 'Free forever — intelligence belongs to everyone.',
    rate_limit_per_day: 100,
    monthly_quota_tokens: 3000,
    priority: 'low',
    cost_per_1k_tokens_usd: 0.0,
  },
  starter: {
    tier: 'starter',
    monthly_price_usd: 9,
    description: 'For solo builders. 10x daily / 10x monthly vs free.',
    rate_limit_per_day: 1000,
    monthly_quota_tokens: 30000,
    priority: 'normal',
    cost_per_1k_tokens_usd: 0.5,
  },
  pro: {
    tier: 'pro',
    monthly_price_usd: 49,
    description: 'For small teams. Priority queue + hive priority.',
    rate_limit_per_day: 10000,
    monthly_quota_tokens: 300000,
    priority: 'high',
    cost_per_1k_tokens_usd: 0.3,
  },
  enterprise: {
    tier: 'enterprise',
    monthly_price_usd: 499,
    description: 'For scale. Dedicated hive lane + SLA.',
    rate_limit_per_day: 100000,
    monthly_quota_tokens: 10000000,
    priority: 'critical',
    cost_per_1k_tokens_usd: 0.2,
  },
};

const FALLBACK_PRINCIPLES = [
  'Free tier is free forever — gatekeeping intelligence is not the goal.',
  '90% of paid revenue flows to compute providers (the people who train the hive).',
  'No vendor lock-in — local-first, your data stays on your device by default.',
];

const FALLBACK_SPLIT = {users_pool: 0.9, infrastructure: 0.09, central: 0.01};

const TIER_ORDER = ['free', 'starter', 'pro', 'enterprise'];

const PRICING_ENDPOINT =
  (typeof window !== 'undefined' && window.HEVOLVE_API_BASE
    ? window.HEVOLVE_API_BASE
    : 'https://api.hevolve.ai') + '/api/v1/intelligence/pricing';

const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
};

const formatPercent = (n) => `${Math.round(Number(n) * 100)}%`;

export default function CommercialApiPricing() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState(FALLBACK_TIERS);
  const [split, setSplit] = useState(FALLBACK_SPLIT);
  const [principles, setPrinciples] = useState(FALLBACK_PRINCIPLES);
  const [liveSource, setLiveSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(PRICING_ENDPOINT, {
      method: 'GET',
      headers: {Accept: 'application/json'},
    })
      .then((r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) {
          throw new Error('non-json or non-200 response');
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data || !data.tiers) return;
        setTiers(data.tiers);
        if (data.revenue_split) setSplit(data.revenue_split);
        if (Array.isArray(data.principles)) setPrinciples(data.principles);
        setLiveSource(true);
      })
      .catch(() => {
        // Silently fall back to bundled defaults. The hardcoded tier list
        // mirrors integrations/agent_engine/commercial_api.py TIER_CONFIG.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGetApiKey = (tier) => {
    navigate('/signup', {state: {next: '/api-keys', initial_tier: tier}});
  };

  return (
    <>
      <Helmet>
        <title>API Pricing | Hevolve AI</title>
        <meta
          name="description"
          content="Hosted hive-aggregated AI intelligence. Free tier of 100 req/day forever. Paid tiers from $9/mo. 90% of revenue flows to compute providers."
        />
        <link rel="canonical" href="https://hevolve.ai/pricing" />
      </Helmet>

      <div style={{minHeight: '100vh', backgroundColor: '#0F0E17', color: '#F5F4FF'}}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Hero */}
          <div className="text-center">
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6C63FF, #00E89D)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem',
              }}
            >
              Hevolve Commercial API
            </h1>
            <p style={{fontSize: '1.25rem', opacity: 0.85, maxWidth: 720, margin: '0 auto'}}>
              Hosted hive-aggregated AI intelligence. Free tier of 100 requests
              per day, forever, no credit card. Paid tiers buy throughput — not
              a different model.
            </p>
            <p style={{marginTop: '0.5rem', fontSize: '0.95rem', opacity: 0.55}}>
              The same intelligence runs locally for free in{' '}
              <a
                href="https://hevolve.ai/download"
                style={{color: '#00E89D', textDecoration: 'underline'}}
              >
                Nunba
              </a>{' '}
              if you'd rather host it yourself.
              {liveSource ? '' : ' (Showing canonical pricing — live catalog will load when api.hevolve.ai is reachable.)'}
            </p>
          </div>

          {/* Tier grid */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 mt-12 gap-6">
            {TIER_ORDER.map((tierKey) => {
              const t = tiers[tierKey];
              if (!t) return null;
              const isFree = t.monthly_price_usd === 0;
              return (
                <div
                  key={tierKey}
                  style={{
                    backgroundColor: '#1E1E1E',
                    borderRadius: 10,
                    padding: '1.5rem',
                    border:
                      tierKey === 'pro'
                        ? '2px solid #00E89D'
                        : '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                  }}
                >
                  {tierKey === 'pro' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: 16,
                        backgroundColor: '#00E89D',
                        color: '#0F0E17',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Popular
                    </span>
                  )}
                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t.tier}
                  </h3>
                  <p style={{fontSize: '0.85rem', opacity: 0.65, minHeight: 48}}>
                    {t.description}
                  </p>

                  <div style={{margin: '1rem 0'}}>
                    <span style={{fontSize: '0.95rem', opacity: 0.7}}>$</span>
                    <span style={{fontSize: '2.5rem', fontWeight: 700}}>
                      {t.monthly_price_usd}
                    </span>
                    <span style={{fontSize: '0.85rem', opacity: 0.6, marginLeft: 4}}>
                      /mo
                    </span>
                  </div>

                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 1.25rem 0',
                      fontSize: '0.88rem',
                      opacity: 0.9,
                    }}
                  >
                    <li style={{marginBottom: 6}}>
                      {formatNumber(t.rate_limit_per_day)} req/day
                    </li>
                    <li style={{marginBottom: 6}}>
                      {formatNumber(t.monthly_quota_tokens)} tokens/mo
                    </li>
                    <li style={{marginBottom: 6}}>
                      ${t.cost_per_1k_tokens_usd.toFixed(2)} / 1K tokens overage
                    </li>
                    <li style={{marginBottom: 6, opacity: 0.7}}>
                      Priority: {t.priority}
                    </li>
                  </ul>

                  <button
                    onClick={() => handleGetApiKey(tierKey)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      backgroundImage: isFree
                        ? 'linear-gradient(to right, #00E89D, #0078FF)'
                        : 'linear-gradient(to right, #6C63FF, #FF6B6B)',
                      color: '#FFFAE8',
                    }}
                  >
                    {isFree ? 'Get free API key' : `Choose ${t.tier}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Revenue split callout */}
          <div
            style={{
              marginTop: '3rem',
              padding: '1.75rem',
              borderRadius: 12,
              backgroundColor: 'rgba(108, 99, 255, 0.08)',
              border: '1px solid rgba(108, 99, 255, 0.25)',
            }}
          >
            <h2 style={{fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem'}}>
              Where the money goes
            </h2>
            <p style={{opacity: 0.85, marginBottom: '1rem'}}>
              The split is committed in code (
              <code style={{color: '#00E89D'}}>
                integrations/agent_engine/revenue_aggregator.py
              </code>
              ), not in a policy doc. We can't quietly change it; you can audit
              the constants in the public repo.
            </p>
            <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
              <div>
                <div style={{fontSize: '2rem', fontWeight: 700, color: '#00E89D'}}>
                  {formatPercent(split.users_pool)}
                </div>
                <div style={{opacity: 0.8}}>Compute providers</div>
              </div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 700, color: '#6C63FF'}}>
                  {formatPercent(split.infrastructure)}
                </div>
                <div style={{opacity: 0.8}}>Infrastructure</div>
              </div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 700, color: '#FF6B6B'}}>
                  {formatPercent(split.central)}
                </div>
                <div style={{opacity: 0.8}}>Central (treasury/legal/security)</div>
              </div>
            </div>
          </div>

          {/* Principles */}
          <div style={{marginTop: '2.5rem'}}>
            <h2 style={{fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.75rem'}}>
              Principles
            </h2>
            <ul style={{listStyle: 'none', padding: 0}}>
              {principles.map((p, i) => (
                <li
                  key={i}
                  style={{
                    padding: '0.75rem 1rem',
                    marginBottom: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    opacity: 0.92,
                  }}
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* curl example */}
          <div style={{marginTop: '2.5rem'}}>
            <h2 style={{fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.75rem'}}>
              One curl away
            </h2>
            <pre
              style={{
                backgroundColor: '#15141C',
                padding: '1rem',
                borderRadius: 8,
                overflowX: 'auto',
                fontSize: '0.85rem',
                color: '#C7C5DC',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
{`# 1. Get a free API key (one-time, no card)
curl -X POST https://api.hevolve.ai/api/v1/intelligence/keys \\
     -H "Authorization: Bearer $HEVOLVE_JWT" \\
     -H "Content-Type: application/json" \\
     -d '{"name": "smoke-test", "tier": "free"}'

# 2. Hit the chat endpoint
curl -X POST https://api.hevolve.ai/api/v1/intelligence/chat \\
     -H "Authorization: Bearer hev_..." \\
     -H "Content-Type: application/json" \\
     -d '{"message": "Hello hive"}'`}
            </pre>
          </div>

          {/* CTA strip */}
          <div
            style={{
              marginTop: '3rem',
              padding: '2rem',
              borderRadius: 12,
              backgroundImage:
                'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,232,157,0.15))',
              textAlign: 'center',
            }}
          >
            <h2 style={{fontSize: '1.6rem', fontWeight: 600, marginBottom: '0.5rem'}}>
              Free tier never expires.
            </h2>
            <p style={{opacity: 0.85, maxWidth: 560, margin: '0 auto 1rem'}}>
              100 requests per day, forever, no credit card. Use it for hobby
              projects, education, prototyping — anything.
            </p>
            <div style={{display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap'}}>
              <button
                onClick={() => handleGetApiKey('free')}
                style={{
                  padding: '12px 22px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  backgroundImage: 'linear-gradient(to right, #00E89D, #0078FF)',
                  color: '#0F0E17',
                }}
              >
                Get free API key
              </button>
              <Link
                to="/docs"
                style={{
                  padding: '12px 22px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#F5F4FF',
                  textDecoration: 'none',
                }}
              >
                Read the docs
              </Link>
              <a
                href="https://github.com/hertz-ai/HARTOS"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 22px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#F5F4FF',
                  textDecoration: 'none',
                }}
              >
                View source
              </a>
            </div>
            <p style={{marginTop: '1rem', fontSize: '0.85rem', opacity: 0.6}}>
              Prefer to run it locally?{' '}
              <a
                href="https://hevolve.ai/download"
                style={{color: '#00E89D'}}
              >
                Download Nunba
              </a>{' '}
              — same intelligence, offline, free.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
