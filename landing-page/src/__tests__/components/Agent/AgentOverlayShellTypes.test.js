/* eslint-disable */
/**
 * AgentOverlay and the two HARTOS emits meant for its own shell.
 *
 * app_installed (app_installer._push_desktop_icon): the HARTOS shell pins a
 * desktop icon and toasts "Installed".  The web app has no desktop icons, so
 * it shows the same notice as a notification card.
 *
 * home_compose / home (LiquidUIService.compose_home, driven by the agent
 * daemon when the box is idle): the HARTOS shell repaints its HOME screen
 * (HartHome.compose).  The web app has no HOME to compose, so it is not a
 * card at all.
 *
 * Both used to fall to OverlayContent's default branch and show the payload
 * as raw JSON (tests/test_liquid_ui_substrate.py found them once its walker
 * scanned the real trees).
 */

import React from 'react';
import {render, screen, act} from '@testing-library/react';

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

const {default: AgentOverlay, OverlayContent} = require('../../../components/AgentOverlay/AgentOverlay');

function mountOverlay() {
  const handlers = {};
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  const view = render(<AgentOverlay navigate={jest.fn()} />);
  return {view, send: (payload) => act(() => { handlers['agent.ui.update'](payload); })};
}

const INSTALLED = {
  type: 'app_installed', id: 'gimp', title: 'GIMP', icon: 'apps',
  exec: 'gimp', group: 'Installed', platform: 'nix',
};
const HOME = {
  type: 'home_compose',
  hero: {title: 'Good evening'},
  rows: [{title: 'Continue', cards: []}],
  mood: 'dusk',
};

test('app_installed shows an Installed notice, not its JSON', () => {
  const {send} = mountOverlay();
  send(INSTALLED);
  expect(screen.getByText('Installed')).toBeTruthy();
  expect(screen.getByText('GIMP was installed.')).toBeTruthy();
  expect(screen.queryByText(/"exec"/)).toBeNull();
});

test.each(['home_compose', 'home'])('%s makes no card', (type) => {
  const {view, send} = mountOverlay();
  send({...HOME, type});
  expect(view.container.firstChild).toBeNull();
  expect(screen.queryByText(/Good evening|"rows"/)).toBeNull();
});

test('a home composition inside a layout renders nothing', () => {
  const {container} = render(<OverlayContent data={HOME} onDismiss={() => {}} />);
  expect(container.firstChild).toBeNull();
});
