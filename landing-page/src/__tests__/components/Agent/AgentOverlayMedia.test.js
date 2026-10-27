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

const {OverlayContent} = require('../../../components/AgentOverlay/AgentOverlay');

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
