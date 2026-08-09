/* eslint-disable */
/**
 * SetupProgressCard — first-appearance timestamp + stale-card demotion.
 *
 * WHY THIS EXISTS (2026-08-09): a "chatterbox-turbo Failed" card sat in the
 * chat looking exactly like live status while a completely different pip
 * install was running underneath it.  There was no way — from the card — to
 * tell whether it described something from 10 seconds ago or an hour ago.
 * That ambiguity cost real debugging time and produced a nearly-filed false
 * bug report.
 *
 * The fix is deliberately two separate things, and these tests keep them
 * separate:
 *   1. WHEN did this card first appear (always shown, like a chat bubble)
 *   2. IS it still current (only demoted once it has stopped changing)
 *
 * THE LOAD-BEARING TEST IS `stale demotion never applies to a running job`.
 * Model downloads and TTS installs legitimately run for many minutes; if
 * staleness were age-only, every long install would grey itself out
 * mid-flight and look broken.  Staleness MUST require a terminal state.
 */
import React from 'react';
import {render, screen} from '@testing-library/react';

import SetupProgressCard, {STALE_AFTER_MS} from '../../pages/chat/SetupProgressCard';

const CARD = 'setup-progress-card';

const minsAgo = (n) => new Date(Date.now() - n * 60_000);

// A terminal, failed card — the exact shape that misled a reader.
const failed = (over = {}) => ({
  jobType: 'tts_setup_chatterbox_turbo',
  steps: [{message: 'setup failed — using fallback engine'}],
  isComplete: true,
  handshake: {status: 'failed', engine: 'chatterbox_turbo', err: 'no audio'},
  ...over,
});

describe('first-appearance timestamp', () => {
  it('renders when the card first appeared', () => {
    render(<SetupProgressCard {...failed()} firstSeen={minsAgo(7)} />);
    expect(screen.getByTestId('setup-first-seen')).toHaveTextContent('7m ago');
  });

  it('shows FIRST appearance, not latest activity', () => {
    // The distinction the incident turned on: a card that first appeared an
    // hour ago but ticked 1 minute ago must still read "1h ago" for origin.
    render(
      <SetupProgressCard {...failed()} firstSeen={minsAgo(60)} lastActivity={minsAgo(1)} />
    );
    expect(screen.getByTestId('setup-first-seen')).toHaveTextContent('1h ago');
  });

  it('renders no timestamp element when the card has no firstSeen', () => {
    // Legacy cards restored from history predate the field. Must not crash
    // and must not print a bogus "just now" implying it is current.
    render(<SetupProgressCard {...failed()} />);
    expect(screen.queryByTestId('setup-first-seen')).toBeNull();
  });
});

describe('stale demotion', () => {
  it('does NOT demote a terminal card that just finished', () => {
    render(<SetupProgressCard {...failed()} firstSeen={minsAgo(1)} lastActivity={minsAgo(1)} />);
    expect(screen.getByTestId(CARD)).not.toHaveAttribute('data-stale', 'true');
    expect(screen.queryByTestId('setup-stale-note')).toBeNull();
  });

  it('demotes a terminal card whose last activity is older than the threshold', () => {
    const old = new Date(Date.now() - STALE_AFTER_MS - 60_000);
    render(<SetupProgressCard {...failed()} firstSeen={old} lastActivity={old} />);
    const card = screen.getByTestId(CARD);
    expect(card).toHaveAttribute('data-stale', 'true');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('setup-stale-note')).toBeInTheDocument();
  });

  it('stale demotion never applies to a RUNNING job, however old', () => {
    // THE REGRESSION GUARD. A 40-minute model download is still live; if this
    // ever goes red, long installs are being greyed out mid-flight.
    const ancient = new Date(Date.now() - STALE_AFTER_MS * 10);
    render(
      <SetupProgressCard
        jobType="bootstrap"
        steps={[{message: 'pip: packages (elapsed 2400s)'}]}
        isComplete={false}
        handshake={{status: 'pending'}}
        firstSeen={ancient}
        lastActivity={ancient}
      />
    );
    expect(screen.getByTestId(CARD)).not.toHaveAttribute('data-stale', 'true');
  });

  it('keeps Retry reachable on a stale failed card', async () => {
    // Demoting must not strip the recovery path — re-running is exactly how a
    // user clears a stale failure.
    //
    // findBy*, not getBy*: the action row is gated on `showComplete`, which the
    // component flips on a 300ms timer, so a synchronous query races the render
    // and would fail for a reason that has nothing to do with staleness. The
    // assertion still bites — if demotion stripped Retry, this times out.
    const old = new Date(Date.now() - STALE_AFTER_MS - 60_000);
    render(
      <SetupProgressCard {...failed()} firstSeen={old} lastActivity={old} onRetry={() => {}} />
    );
    expect(await screen.findByRole('button', {name: /retry/i})).toBeEnabled();
  });

  it('falls back to firstSeen when lastActivity is absent', () => {
    // Cards restored from history carry timestamp but no updatedAt.
    const old = new Date(Date.now() - STALE_AFTER_MS - 60_000);
    render(<SetupProgressCard {...failed()} firstSeen={old} />);
    expect(screen.getByTestId(CARD)).toHaveAttribute('data-stale', 'true');
  });
});
