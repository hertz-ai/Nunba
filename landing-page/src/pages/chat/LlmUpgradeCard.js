import React from 'react';

/**
 * Tier-1 (global) capability card: llama.cpp binary version upgrade.
 *
 * Agent-independent by design — the platform is polymorphic (any agent morphs
 * into / delegates to any other), so a newer engine benefits every agent. This
 * card therefore renders from GLOBAL state (Demopage `versionUpgrade`), pinned
 * above the welcome/message ternary so it survives agent switches — NOT inside
 * the per-agent message stream, which is wiped on morph.
 *
 * Queue-only: /api/llm/upgrade stages the swap (the running server holds the
 * binary open and the installer deletes-before-download), so it applies at the
 * next restart — the queued state shows the restart hint, not an in-place swap.
 */
const LlmUpgradeCard = ({ card, onUpgrade, onDismiss }) => {
  if (!card) return null;
  return (
    <div
      className="rounded-lg p-5 shadow-sm animate-slide-in-left mx-3 mt-2"
      style={{
        maxWidth: '100%',
        backgroundColor: '#142a26',
        color: '#FFFFFF',
        border: '1px solid #00e89d',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: '#00e89d', fontWeight: 'bold', fontSize: '1.1em' }}>
          AI Engine Upgrade
        </span>
        {(card.current_build || card.required_build) && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#00e89d22', color: '#00e89d' }}
          >
            {card.current_build ? `b${card.current_build}` : 'current'} → b
            {card.required_build || 'latest'}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-300 mb-4">
        {card.queued
          ? 'AI engine upgrade is queued — restart Nunba to apply.'
          : 'A newer local AI engine is available. Upgrading enables faster inference (speculative decoding) and the latest engine optimizations.'}
      </p>
      <div className="flex gap-3">
        {card.queued ? (
          <button
            disabled
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#2a3a36', color: '#9fe', cursor: 'default' }}
          >
            Queued — restart to apply
          </button>
        ) : (
          <button
            onClick={() => onUpgrade?.(card)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#00b87f', color: '#fff', cursor: 'pointer' }}
          >
            Upgrade engine
          </button>
        )}
        <button
          onClick={() => onDismiss?.(card)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: '#999',
            border: '1px solid #555',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default LlmUpgradeCard;
