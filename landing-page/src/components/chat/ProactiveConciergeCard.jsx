import VoiceVisualizer from '../VoiceVisualizer';

import React, { useState } from 'react';

/**
 * ProactiveConciergeCard — The proactive servicing layer of Nunba/HART.
 *
 * Privacy by Design Invariant:
 * When users land on the platform, our servicing layer is proactive rather
 * than passive. But respecting acoustic, physical, and sensory privacy, its
 * FIRST proactive step is asking consent to speak aloud.
 *
 * - "Yes, Speak Aloud": Grants speech consent via user gesture (satisfying
 *   browser autoplay requirements), triggers warm spoken guidance, and
 *   activates VoiceVisualizer synchronously with TTS playback.
 * - "Keep Quiet (Text Only)": Adheres to silent privacy mode, presenting rich
 *   text assistance without emitting sound.
 *
 * Both choices record canonical state and can be toggled at any moment.
 */
export default function ProactiveConciergeCard({
  onConsent,
  agentName = 'Nunba',
  guestName = '',
}) {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChoice = (allowSpeak) => {
    if (submitting) return;
    setSubmitting(true);
    if (typeof onConsent === 'function') {
      onConsent(allowSpeak);
    }
  };

  return (
    <div
      data-testid="proactive-concierge-card"
      className="w-full max-w-xl mx-auto my-4 overflow-hidden text-center transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(20, 18, 35, 0.94) 0%, rgba(12, 10, 22, 0.98) 100%)',
        border: '1px solid rgba(108, 99, 255, 0.35)',
        borderRadius: '24px',
        padding: '28px 24px 22px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(108, 99, 255, 0.18)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Shimmering top border highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '15%',
          right: '15%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #6C63FF 50%, transparent 100%)',
          opacity: 0.8,
        }}
      />

      {/* Proactive Servicing Badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(108, 99, 255, 0.15)',
            border: '1px solid rgba(108, 99, 255, 0.35)',
            color: '#c4c0ff',
            fontSize: '0.72rem',
            fontFamily: '"SF Mono", "Fira Code", monospace',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#2ECC71',
              boxShadow: '0 0 8px #2ECC71',
              display: 'inline-block',
            }}
          />
          Proactive Concierge &middot; Privacy by Design
        </span>
      </div>

      {/* Animated Orb Presence Preview */}
      <div className="flex justify-center items-center my-3">
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #9B94FF 0%, #6C63FF 50%, #201b4b 100%)',
            boxShadow: '0 0 24px rgba(108, 99, 255, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 3s ease-in-out infinite',
            position: 'relative',
          }}
        >
          <VoiceVisualizer isActive={false} size={76} />
        </div>
      </div>

      {/* Headline Greeting */}
      <h2
        className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #E0DFFF 60%, #9B94FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: '"Inter", -apple-system, sans-serif',
        }}
      >
        May I speak with you?
      </h2>

      {/* Subtitle / Human-AI Trust Bond */}
      <p
        className="text-sm md:text-base mb-2"
        style={{
          color: 'rgba(255, 255, 255, 0.88)',
          lineHeight: 1.5,
          fontWeight: 400,
          maxWidth: '490px',
          margin: '0 auto 8px',
        }}
      >
        {guestName ? `Welcome @${guestName}! ` : 'Welcome! '}
        Hey, I'm getting permission before I speak anything loudly on the screen.
        The human creator is a true helper to the AI, and I am here as a true friend and helper to you.
      </p>

      {/* Earning Potential & Compute Exchange Preview */}
      <div
        className="text-xs md:text-sm my-3 p-3 rounded-xl mx-auto max-w-lg"
        style={{
          background: 'rgba(108, 99, 255, 0.12)',
          border: '1px solid rgba(108, 99, 255, 0.3)',
          color: '#c4c0ff',
          fontFamily: '"SF Mono", "Fira Code", monospace',
          lineHeight: 1.45,
        }}
      >
        ⚡ <strong>Earning Potential</strong>: Share idle compute when your machine is inactive to earn compute revenue ($15–$45/mo) or unlock Tier-1 frontier intelligence for your companion.
      </div>

      {/* Acoustic Privacy Explanation */}
      <p
        className="text-xs md:text-sm mb-5"
        style={{
          color: 'rgba(255, 255, 255, 0.65)',
          lineHeight: 1.45,
          maxWidth: '460px',
          margin: '0 auto 16px',
        }}
      >
        Everything runs private by design with zero unconsented data egress.
        Would you like me to speak aloud to guide you?
      </p>

      {/* Action Buttons: Consent to Speak vs Text Only */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        <button
          data-testid="concierge-consent-speak"
          disabled={submitting}
          onClick={() => handleChoice(true)}
          onMouseEnter={() => setHoveredBtn('speak')}
          onMouseLeave={() => setHoveredBtn(null)}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow:
              hoveredBtn === 'speak'
                ? '0 6px 24px rgba(108, 99, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.4)'
                : '0 4px 16px rgba(108, 99, 255, 0.35)',
            transform: hoveredBtn === 'speak' ? 'translateY(-1px) scale(1.02)' : 'none',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🔊</span>
          <span>Yes, Speak Aloud</span>
        </button>

        <button
          data-testid="concierge-consent-quiet"
          disabled={submitting}
          onClick={() => handleChoice(false)}
          onMouseEnter={() => setHoveredBtn('quiet')}
          onMouseLeave={() => setHoveredBtn(null)}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            background:
              hoveredBtn === 'quiet'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            transform: hoveredBtn === 'quiet' ? 'translateY(-1px)' : 'none',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          <span>Keep Quiet (Text Only)</span>
        </button>
      </div>

      {/* Privacy Guarantee Footer */}
      <div
        className="mt-4 pt-3 flex items-center justify-center gap-1.5"
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '0.72rem',
        }}
      >
        <span>🔒</span>
        <span>
          Reversible anytime via the voice toggle in the chat toolbar or Privacy settings.
        </span>
      </div>
    </div>
  );
}
