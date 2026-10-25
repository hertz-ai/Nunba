/* eslint-disable */
/**
 * A media card plays what its producer sent.
 *
 * HARTOS COMPONENT_TYPES['media'] declares the source as `src`, and its one
 * producer, the game-sound review card (core/agent_tools
 * offer_sound_for_review), sends `src`.  MediaOverlay read `url`, so the audio
 * player came up with no source: the card asked the person to have a listen
 * and gave them nothing to play.
 */

import React from 'react';
import {render} from '@testing-library/react';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../../services/socialApi', () => ({
  agentFormApi: {submit: jest.fn()},
  consentApi: {grant: jest.fn(), decline: jest.fn()},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  chatApi: {vaultStore: jest.fn()},
}));

const {OverlayContent, mediaCards} = require('../../../components/AgentOverlay/AgentOverlay');

// The card offer_sound_for_review sends (HARTOS core/agent_tools.py).
const SOUND_CARD = {
  type: 'media', agent_id: '42', media_type: 'audio',
  src: '/api/games/sounds/tetris_win.wav', controls: true,
  alt: 'win sound for tetris', title: 'win sound for tetris',
};

describe('media card', () => {
  test('the game sound card plays the sound it was sent', () => {
    const {container} = render(<OverlayContent data={SOUND_CARD} />);
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio.getAttribute('src')).toBe('/api/games/sounds/tetris_win.wav');
  });

  test('without media_type the kind is read from the source', () => {
    const {container} = render(
      <OverlayContent data={{type: 'media', src: '/m/clip.mp4'}} />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video.getAttribute('src')).toBe('/m/clip.mp4');
  });
});

/**
 * An agent's message can carry media to SHOW the person (owner, 2026-10-25).
 *
 * HARTOS publish_agent_message sends them under `media`, one item per file
 * the store vouched for (hartos/helper.py media_items_for): {kind, url, xid,
 * sha256, mime, size, prompt_id, request_id, caption?}.  The desktop shows an
 * item by its `url`, served by this same Flask; a reel item has no url (the
 * phone fetches it by xid) and gets no card here.
 */
const SHA = 'a'.repeat(64);
const item = (kind, url, extra = {}) => ({
  kind, url, xid: SHA, sha256: SHA, mime: 'x', size: 10,
  prompt_id: '7', request_id: 'r1', ...extra,
});

describe("an agent message's media", () => {
  test('each item with a url becomes a media card', () => {
    expect(mediaCards([
      item('image', '/uploads/agent/cat.png', {caption: 'a cat'}),
      item('video', '/uploads/agent/clip.mp4'),
      item('html', '/uploads/agent/page.html', {caption: 'a chart'}),
      {kind: 'video', xid: SHA, sha256: SHA, reel_id: 'r'},
    ])).toEqual([
      {type: 'media', media_type: 'image', src: '/uploads/agent/cat.png', alt: 'a cat'},
      {type: 'media', media_type: 'video', src: '/uploads/agent/clip.mp4', alt: ''},
      {type: 'media', media_type: 'html', src: '/uploads/agent/page.html', alt: 'a chart'},
    ]);
  });

  test('a message without a media list gives no cards', () => {
    expect(mediaCards(undefined)).toEqual([]);
    expect(mediaCards({kind: 'image', url: '/uploads/x.png'})).toEqual([]);
    expect(mediaCards([null, 'x', {kind: 'image', url: 5}])).toEqual([]);
  });

  test('a page shows in a frame whose scripts cannot reach the app', () => {
    const {container} = render(<OverlayContent data={{
      type: 'media', media_type: 'html', src: '/uploads/agent/page.html', alt: 'a chart'}} />);
    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.getAttribute('src')).toBe('/uploads/agent/page.html');
    expect(frame.getAttribute('title')).toBe('a chart');
    // allow-scripts alone: the page runs in an opaque origin, so it cannot
    // read this app's storage or call its API as the person.
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(container.querySelector('img')).toBeNull();
  });
});
