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
import {act, render, screen} from '@testing-library/react';

import SetupProgressCard, {STALE_AFTER_MS, withSetupProgress} from '../../pages/chat/SetupProgressCard';

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

/*
 * A refusal or a failure must READ as one (review of Nunba be748369).
 *
 * The caption model's download (llama/llama_config.py, job_type
 * 'vlm_caption') ends its card with {status: 'error', complete: true} when it
 * refuses (no room on the disk) or the download fails.  The card decided
 * failure only from the words 'failed'/'error' in a step's message, and the
 * Demopage reducer opened a new card with isComplete:false whatever the event
 * said -- so a first refusal pulsed "Setting up ..." forever with no dismiss
 * control, and a later one turned into "Ready", a green banner and an
 * auto-dismiss.  These drive the real reducer (withSetupProgress, the one
 * Demopage's setup_progress listener runs) into the real card.
 */
const EVENT = (over = {}) => ({type: 'setup_progress', job_type: 'vlm_caption',
  model_name: 'Qwen3.5-0.8B VL (Caption)', ...over});
const REFUSED = EVENT({status: 'error', complete: true,
  message: 'Qwen3.5-0.8B VL (Caption) (the small vision model) was not downloaded: it needs about 0.8 GB free in /models and there is 0.1 GB.'});

function cardFrom(events) {
  const messages = events.reduce((prev, e) => withSetupProgress(prev, e), []);
  const cards = messages.filter((m) => m.type === 'setup_progress');
  expect(cards).toHaveLength(1);
  return cards[0];
}

function renderCard(card, onDismiss = jest.fn()) {
  render(
    <SetupProgressCard steps={card.steps} jobType={card.jobType} isComplete={card.isComplete}
                       handshake={card.handshake} onDismiss={onDismiss} />
  );
  return onDismiss;
}

describe('a refusal or failure reads as one', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a first event that refuses ends the card as Failed, with a dismiss control', () => {
    const card = cardFrom([REFUSED]);
    expect(card.isComplete).toBe(true);
    const onDismiss = renderCard(card);
    expect(screen.getByText(/Vision model Failed/)).toBeInTheDocument();
    expect(screen.queryByText(/Setting up/)).toBeNull();
    expect(screen.getByRole('button', {name: /dismiss setup card/i})).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText(/not downloaded: it needs about 0.8 GB/)).toBeInTheDocument();
  });

  it('a download that ends in error is Failed, never Ready, and is not auto-dismissed', () => {
    const card = cardFrom([
      EVENT({status: 'loading', complete: false, message: 'Downloading the small vision model...'}),
      EVENT({status: 'loading', complete: false, message: 'Download failed: <urlopen error offline>'}),
      EVENT({status: 'error', complete: true,
        message: 'The small vision model did not finish downloading (Download failed: <urlopen error offline>).'}),
    ]);
    const onDismiss = renderCard(card);
    expect(screen.getByText(/Vision model Failed/)).toBeInTheDocument();
    expect(screen.queryByText(/Ready/)).toBeNull();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('says the setup is incomplete once the verdict shows', () => {
    // REFUSED's words say neither "failed" nor "error": its status does.
    renderCard(cardFrom([REFUSED]));
    act(() => { jest.advanceTimersByTime(400); });
    expect(screen.getByText(/Vision model setup incomplete/)).toBeInTheDocument();
  });

  it('a download that ends done reads Ready and dismisses itself', () => {
    const card = cardFrom([
      EVENT({status: 'loading', complete: false, message: 'Downloading the small vision model...'}),
      EVENT({status: 'done', complete: true, message: 'Qwen3.5-0.8B VL (Caption) is downloaded.'}),
    ]);
    const onDismiss = renderCard(card);
    expect(screen.getByText(/Vision model Ready/)).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('a later run of the job starts the card over: an earlier refusal does not stick', () => {
    const card = cardFrom([
      REFUSED,
      EVENT({status: 'loading', complete: false, message: 'Downloading the small vision model...'}),
      EVENT({status: 'done', complete: true, message: 'Qwen3.5-0.8B VL (Caption) is downloaded.'}),
    ]);
    expect(card.steps.map((s) => s.status)).toEqual(['loading', 'done']);
    renderCard(card);
    expect(screen.getByText(/Vision model Ready/)).toBeInTheDocument();
  });
});

describe('withSetupProgress (the setup_progress reducer)', () => {
  const NOW = new Date('2026-10-15T04:00:00Z');

  it('opens a card that is complete when its first event says so', () => {
    const [card] = withSetupProgress([], REFUSED, NOW);
    expect(card).toMatchObject({type: 'setup_progress', jobType: 'vlm_caption',
      isComplete: true, steps: [REFUSED], handshake: {status: 'pending'}, timestamp: NOW});
  });

  it('opens a running card for a first event that is not complete', () => {
    const [card] = withSetupProgress([], EVENT({status: 'loading', message: 'x'}), NOW);
    expect(card.isComplete).toBe(false);
  });

  it('appends to a running card and records when it last changed', () => {
    const first = EVENT({status: 'loading', message: 'a'});
    const second = EVENT({status: 'loading', message: 'b'});
    const later = new Date(NOW.getTime() + 1000);
    const [card] = withSetupProgress(withSetupProgress([], first, NOW), second, later);
    expect(card.steps).toEqual([first, second]);
    expect(card.timestamp).toBe(NOW);
    expect(card.updatedAt).toBe(later);
  });

  it('a new run after an ended one starts the card over and shows it again if it was dismissed', () => {
    const ended = withSetupProgress([], REFUSED, NOW).map((m) => ({...m, dismissed: true}));
    const later = new Date(NOW.getTime() + 60000);
    const next = EVENT({status: 'loading', message: 'Downloading...'});
    const [card] = withSetupProgress(ended, next, later);
    expect(card.steps).toEqual([next]);
    expect(card.isComplete).toBe(false);
    expect(card.dismissed).toBe(false);
    expect(card.timestamp).toBe(later);
  });

  it('keeps every other message where it is', () => {
    const chat = [{type: 'user', content: 'hi'}, {type: 'assistant', content: 'hello'}];
    const out = withSetupProgress(chat, REFUSED, NOW);
    expect(out.slice(0, 2)).toEqual(chat);
    expect(out).toHaveLength(3);
  });

  it('a TTS install (no status on its steps) keeps appending as before, also after its end event', () => {
    const tts = {type: 'setup_progress', job_type: 'tts_setup_f5', step: 1, message: 'Installing...'};
    const end = {type: 'setup_progress', job_type: 'tts_setup_f5', complete: true};
    const more = {type: 'setup_progress', job_type: 'tts_setup_f5', step: 2, message: 'Verifying...'};
    const [card] = [tts, end, more].reduce((prev, e) => withSetupProgress(prev, e, NOW), []);
    expect(card.steps).toEqual([tts, end, more]);
    expect(card.isComplete).toBe(false);
  });
});
