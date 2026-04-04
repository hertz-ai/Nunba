/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';

const PROVIDER_TYPE_LABELS = {
  api: 'API Provider', affiliate: 'Affiliate', local: 'Local (on-device)',
};
const PROVIDER_TYPE_COLORS = {
  api: '#4CAF50', affiliate: '#FF9800', local: '#6C63FF',
};
const CATEGORY_LABELS = {
  llm: 'LLM', tts: 'TTS', stt: 'STT', vlm: 'Vision',
  image_gen: 'Image', video_gen: 'Video', audio_gen: 'Audio',
  embedding: 'Embed', '3d_gen': '3D',
};

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
});

function ProviderCard({ provider, onTest, onToggle, onSetKey, testing }) {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const typeColor = PROVIDER_TYPE_COLORS[provider.provider_type] || '#666';

  const handleSaveKey = () => {
    if (keyValue.trim()) {
      onSetKey(provider.id, keyValue.trim());
      setKeyValue('');
      setShowKeyInput(false);
    }
  };

  return (
    <div style={{
      background: '#1a2332', borderRadius: 8, padding: 16,
      border: `1px solid ${provider.enabled ? '#2a3a4a' : '#3a2020'}`,
      opacity: provider.enabled ? 1 : 0.6,
      transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{provider.name}</span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: typeColor + '22', color: typeColor,
              fontWeight: 600, textTransform: 'uppercase',
            }}>
              {PROVIDER_TYPE_LABELS[provider.provider_type] || provider.provider_type}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#667', marginTop: 2 }}>{provider.id}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {provider.healthy
            ? <span style={{ fontSize: 10, color: '#4CAF50' }}>● Healthy</span>
            : <span style={{ fontSize: 10, color: '#f44336' }}>● Down</span>
          }
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {provider.categories.map(cat => (
          <span key={cat} style={{
            fontSize: 11, padding: '2px 6px', borderRadius: 4,
            background: '#6C63FF15', color: '#9990ff', fontWeight: 500,
          }}>
            {CATEGORY_LABELS[cat] || cat}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8899aa', marginBottom: 10 }}>
        <span>{provider.model_count} models</span>
        {provider.avg_latency_ms > 0 && <span>{Math.round(provider.avg_latency_ms)}ms avg</span>}
        {provider.commission_pct > 0 && (
          <span style={{ color: '#FF9800' }}>{provider.commission_pct}% commission</span>
        )}
      </div>

      {/* API key status */}
      {provider.provider_type === 'api' && provider.id !== 'local' && (
        <div style={{ marginBottom: 10 }}>
          {provider.api_key_set ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#4CAF50' }}>✓ API key configured</span>
              <button onClick={() => setShowKeyInput(!showKeyInput)}
                style={{ ...btnStyle('#2a3a4a'), padding: '3px 8px', fontSize: 11 }}>
                Update
              </button>
            </div>
          ) : (
            <button onClick={() => setShowKeyInput(!showKeyInput)}
              style={{ ...btnStyle('#FF9800'), padding: '4px 10px', fontSize: 12 }}>
              Set API Key
            </button>
          )}
          {showKeyInput && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                type="password" placeholder="sk-..." value={keyValue}
                onChange={e => setKeyValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                style={{
                  flex: 1, background: '#0d1520', border: '1px solid #2a3a4a',
                  borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 13,
                  outline: 'none',
                }}
              />
              <button onClick={handleSaveKey} style={btnStyle('#4CAF50')}>Save</button>
              <button onClick={() => setShowKeyInput(false)} style={btnStyle('#666')}>×</button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {provider.provider_type === 'api' && provider.api_key_set && (
          <button
            onClick={() => onTest(provider.id)}
            disabled={testing === provider.id}
            style={btnStyle(testing === provider.id ? '#444' : '#6C63FF')}
          >
            {testing === provider.id ? 'Testing...' : 'Test Connection'}
          </button>
        )}
        <button
          onClick={() => onToggle(provider.id, !provider.enabled)}
          style={btnStyle(provider.enabled ? '#f44336' : '#4CAF50')}
        >
          {provider.enabled ? 'Disable' : 'Enable'}
        </button>
        {provider.url && (
          <a href={provider.url} target="_blank" rel="noopener noreferrer"
            style={{ ...btnStyle('#2a3a4a'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Website ↗
          </a>
        )}
      </div>
    </div>
  );
}

function LeaderboardTable({ entries }) {
  if (!entries || entries.length === 0) {
    return <div style={{ color: '#667', fontSize: 13, padding: 20, textAlign: 'center' }}>
      No benchmark data yet. Data accumulates as providers are used.
    </div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a3a4a' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Provider</th>
            <th style={thStyle}>Model</th>
            <th style={thStyle}>Efficiency</th>
            <th style={thStyle}>Speed</th>
            <th style={thStyle}>Quality</th>
            <th style={thStyle}>Reliability</th>
            <th style={thStyle}>Cost/1K</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 10).map((e, i) => (
            <tr key={`${e.provider_id}:${e.model_id}`}
              style={{ borderBottom: '1px solid #1a2332' }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>{e.provider_id}</td>
              <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.model_id.split('/').pop()}
              </td>
              <td style={tdStyle}>
                <span style={{ color: e.efficiency_score > 1 ? '#4CAF50' : '#FF9800' }}>
                  {e.efficiency_score?.toFixed(3) || '—'}
                </span>
              </td>
              <td style={tdStyle}>{e.avg_tok_per_s?.toFixed(0) || '—'} tok/s</td>
              <td style={tdStyle}>{(e.quality_score * 100)?.toFixed(0) || '—'}%</td>
              <td style={tdStyle}>{(e.success_rate * 100)?.toFixed(0) || '—'}%</td>
              <td style={tdStyle}>${e.cost_per_1k_output_tokens?.toFixed(4) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = { textAlign: 'left', padding: '8px 10px', color: '#8899aa', fontWeight: 600 };
const tdStyle = { padding: '8px 10px', color: '#ccc', whiteSpace: 'nowrap' };

export default function ProviderManagementPage() {
  const [providers, setProviders] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [gatewayStats, setGatewayStats] = useState(null);
  const [resourceStats, setResourceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [provRes, lbRes, gwRes, rsRes] = await Promise.all([
        fetch('/api/admin/providers').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/providers/efficiency/leaderboard').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/providers/gateway/stats').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/resources/stats').then(r => r.ok ? r.json() : null),
      ]);
      if (provRes?.providers) setProviders(provRes.providers);
      if (lbRes) setLeaderboard(lbRes);
      if (gwRes) setGatewayStats(gwRes);
      if (rsRes) setResourceStats(rsRes);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTest = async (providerId) => {
    setTesting(providerId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ providerId, ...data });
    } catch (e) {
      setTestResult({ providerId, success: false, error: e.message });
    }
    setTesting(null);
  };

  const handleToggle = async (providerId, enabled) => {
    try {
      await fetch(`/api/admin/providers/${providerId}/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await fetchAll();
    } catch { /* ignore */ }
  };

  const handleSetKey = async (providerId, apiKey) => {
    try {
      await fetch(`/api/admin/providers/${providerId}/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      await fetchAll();
    } catch { /* ignore */ }
  };

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center' }}>Loading providers...</div>;

  const typeFilters = ['all', 'api', 'affiliate', 'local'];
  const filtered = filter === 'all' ? providers : providers.filter(p => p.provider_type === filter);
  const apiConfigured = providers.filter(p => p.provider_type === 'api' && p.api_key_set).length;
  const totalApi = providers.filter(p => p.provider_type === 'api' && p.id !== 'local').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Provider Management</h2>
        <span style={{ fontSize: 13, color: '#8899aa' }}>
          {apiConfigured}/{totalApi} API keys configured · {providers.length} total providers
        </span>
      </div>

      {/* Resource stats bar */}
      {resourceStats && (
        <div style={{
          background: '#1a2332', borderRadius: 8, padding: 12, marginBottom: 16,
          display: 'flex', gap: 24, fontSize: 13, color: '#8899aa',
          border: '1px solid #2a3a4a',
        }}>
          <span>Mode: <b style={{ color: resourceStats.mode === 'idle' ? '#4CAF50' : '#FF9800' }}>
            {resourceStats.mode?.toUpperCase()}</b></span>
          {resourceStats.cpu_percent !== undefined && (
            <span>CPU: <b style={{ color: resourceStats.cpu_percent > 80 ? '#f44336' : '#ccc' }}>
              {resourceStats.cpu_percent}%</b></span>
          )}
          {resourceStats.ram_used_gb !== undefined && (
            <span>RAM: <b style={{ color: '#ccc' }}>
              {resourceStats.ram_used_gb}/{resourceStats.ram_total_gb} GB</b></span>
          )}
          {resourceStats.gpu?.cuda_available && (
            <span>GPU: <b style={{ color: '#4CAF50' }}>
              {resourceStats.gpu.free_gb?.toFixed(1)}/{resourceStats.gpu.total_gb?.toFixed(1)} GB free</b></span>
          )}
          <span>Throttle: <b style={{ color: '#ccc' }}>
            {((resourceStats.throttle || 0) * 100).toFixed(0)}%</b></span>
        </div>
      )}

      {/* Gateway stats */}
      {gatewayStats && gatewayStats.total_requests > 0 && (
        <div style={{
          background: '#1a2332', borderRadius: 8, padding: 12, marginBottom: 16,
          display: 'flex', gap: 24, fontSize: 13, color: '#8899aa',
          border: '1px solid #2a3a4a',
        }}>
          <span>Gateway: <b style={{ color: '#ccc' }}>{gatewayStats.total_requests} requests</b></span>
          <span>Total cost: <b style={{ color: '#FF9800' }}>${gatewayStats.total_cost_usd?.toFixed(4)}</b></span>
        </div>
      )}

      {/* Test result toast */}
      {testResult && (
        <div style={{
          background: testResult.success ? '#1a332a' : '#331a1a',
          border: `1px solid ${testResult.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13,
        }}>
          <b style={{ color: testResult.success ? '#4CAF50' : '#f44336' }}>
            {testResult.success ? '✓' : '✗'} {testResult.providerId}
          </b>
          {testResult.success && (
            <span style={{ color: '#8899aa', marginLeft: 12 }}>
              {testResult.latency_ms?.toFixed(0)}ms · ${testResult.cost_usd?.toFixed(6)}
              {testResult.content && ` · "${testResult.content.slice(0, 50)}"`}
            </span>
          )}
          {testResult.error && <span style={{ color: '#f44336', marginLeft: 12 }}>{testResult.error}</span>}
          <button onClick={() => setTestResult(null)}
            style={{ float: 'right', ...btnStyle('#333'), padding: '2px 8px' }}>×</button>
        </div>
      )}

      {/* Type filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {typeFilters.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            ...btnStyle(filter === t ? '#6C63FF' : '#2a3a4a'),
            padding: '4px 12px',
          }}>
            {t === 'all' ? `All (${providers.length})` :
              `${PROVIDER_TYPE_LABELS[t] || t} (${providers.filter(p => p.provider_type === t).length})`}
          </button>
        ))}
      </div>

      {/* Provider grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12, marginBottom: 32 }}>
        {filtered.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            onTest={handleTest}
            onToggle={handleToggle}
            onSetKey={handleSetKey}
            testing={testing}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#667', padding: 40 }}>
          No providers found for this filter.
        </div>
      )}

      {/* Efficiency Leaderboard */}
      <h3 style={{ color: '#fff', fontSize: 17, marginBottom: 12 }}>Efficiency Leaderboard</h3>
      <div style={{
        background: '#1a2332', borderRadius: 8, padding: 16,
        border: '1px solid #2a3a4a', marginBottom: 24,
      }}>
        <LeaderboardTable entries={leaderboard?.leaderboard} />
      </div>
    </div>
  );
}
