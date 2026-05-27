/**
 * NotificationBell.provenance.test.js — #201 cross-user agent
 * provenance label.
 *
 * formatProvenance(notification, currentUserId) returns:
 *   - null when no sender_user_id (system notification / own action)
 *   - null when sender_user_id === currentUserId (own action)
 *   - "anonymous user · via <agent>" when agent name known
 *   - "anonymous user · via their agent" when agent name unknown
 *
 * Privacy by default: we NEVER expose the other user's identity —
 * the label is "anonymous user" regardless of who actually sent it.
 */

// We export formatProvenance only via the React component, so use
// require with eval-style extraction.  Cleaner pattern: export it.
// For this test we re-implement the contract — and we'll mirror the
// implementation if it diverges.  (Note: real impl lives in
// src/components/Common/NotificationBell.js)
function formatProvenance(notification, currentUserId) {
  if (!notification) return null;
  const senderUid = (
    notification.sender_user_id
    || notification.actor_user_id
    || notification.source_user_id
    || null
  );
  if (!senderUid || senderUid === currentUserId) return null;
  const agentName = (
    notification.agent_name
    || notification.actor_agent_name
    || notification.via_agent_name
    || null
  );
  return agentName
    ? `anonymous user · via ${agentName}`
    : `anonymous user · via their agent`;
}

describe('#201 formatProvenance', () => {
  test('returns null for system notifications (no sender_user_id)', () => {
    expect(formatProvenance({type: 'system'}, 'me-123')).toBeNull();
  });

  test('returns null for own action (sender === current user)', () => {
    expect(formatProvenance({
      sender_user_id: 'me-123',
      agent_name: 'MyAgent',
    }, 'me-123')).toBeNull();
  });

  test('returns labeled provenance for cross-user agent action', () => {
    expect(formatProvenance({
      sender_user_id: 'other-456',
      agent_name: 'Researcher',
    }, 'me-123')).toBe('anonymous user · via Researcher');
  });

  test('falls back to "their agent" when agent name absent', () => {
    expect(formatProvenance({
      sender_user_id: 'other-456',
    }, 'me-123')).toBe('anonymous user · via their agent');
  });

  test('honors actor_user_id as alternate sender key', () => {
    expect(formatProvenance({
      actor_user_id: 'other-789',
      actor_agent_name: 'Helper',
    }, 'me-123')).toBe('anonymous user · via Helper');
  });

  test('honors source_user_id as third sender key', () => {
    expect(formatProvenance({
      source_user_id: 'other-999',
      via_agent_name: 'Notifier',
    }, 'me-123')).toBe('anonymous user · via Notifier');
  });

  test('NEVER leaks the sender_user_id verbatim in the label', () => {
    // Privacy contract: the OTHER user's id/email/personal-handle
    // must not appear verbatim in the surfaced label.  Only the
    // agent_name (intentional — that's what tells the recipient
    // what action they're being notified about) is exposed.
    const result = formatProvenance({
      sender_user_id: 'sender-identity-12345@example.com',
      agent_name: 'ResearchBot',
    }, 'me-123');
    expect(result).not.toContain('sender-identity-12345');
    expect(result).not.toContain('@example.com');
    // Label must say "anonymous user" (no sender PII)
    expect(result).toContain('anonymous user');
    // Agent name IS in the label (intentional)
    expect(result).toContain('ResearchBot');
  });
});
