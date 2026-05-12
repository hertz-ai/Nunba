/**
 * decodeTokenResponse — pure-JS coverage for the CallRoom helper that
 * normalizes the /api/social/calls/:id/token response into
 * {mode, token, url}.  Mirrors the equivalent RN normalization in
 * CallChannelScreen.js so the two clients behave identically.
 *
 * Stays JSX-free so it runs locally even though the rest of the .jsx
 * suite is blocked by the repo-wide babel config gap.
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  callsApi: {
    token: jest.fn(),
    get: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  },
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
}));

const {decodeTokenResponse} =
  require('../../../../components/Social/Calls/CallRoom');

describe('decodeTokenResponse — server token normalization', () => {
  test('mode=livekit + signed token + url', () => {
    expect(decodeTokenResponse({
      data: {mode: 'livekit', token: 'jwt.signed', url: 'wss://livekit.test'},
    })).toEqual({mode: 'livekit', token: 'jwt.signed', url: 'wss://livekit.test'});
  });

  test('mode=livekit_pending — token/url null', () => {
    expect(decodeTokenResponse({
      data: {mode: 'livekit_pending'},
    })).toEqual({mode: 'livekit_pending', token: null, url: null});
  });

  test('mode=p2p_mesh — token/url null, mode preserved', () => {
    expect(decodeTokenResponse({
      data: {mode: 'p2p_mesh'},
    })).toEqual({mode: 'p2p_mesh', token: null, url: null});
  });

  test('payload without nested .data — accepted (legacy callers)', () => {
    expect(decodeTokenResponse({
      mode: 'livekit', token: 'raw', url: 'wss://x.test',
    })).toEqual({mode: 'livekit', token: 'raw', url: 'wss://x.test'});
  });

  test('null / undefined → safe fallback', () => {
    expect(decodeTokenResponse(null)).toEqual({mode: null, token: null, url: null});
    expect(decodeTokenResponse(undefined)).toEqual({mode: null, token: null, url: null});
  });

  test('empty data dict → defaults to p2p_mesh + nulls', () => {
    expect(decodeTokenResponse({data: {}})).toEqual({
      mode: 'p2p_mesh', token: null, url: null,
    });
  });
});
