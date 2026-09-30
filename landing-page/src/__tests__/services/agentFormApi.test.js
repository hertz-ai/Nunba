/* eslint-disable */
/**
 * agentFormApi.submit sends the signed-in user's Bearer token (the axios
 * factory's interceptor attaches it to every request the client makes,
 * whatever host).  A card names its own submit URL, and a card is data an
 * agent produced, so an absolute or protocol-relative `action` would carry
 * that token to any host the card names.  The client therefore only posts
 * to this app's own /api/ paths, which is every destination HARTOS emits
 * (/api/social/channels/<type>/connect, .../connect-pair-code).
 */

const mockPost = jest.fn(() => Promise.resolve({data: {success: true}}));

jest.mock('../../services/axiosFactory', () => ({
  createApiClient: jest.fn(() => ({
    get: jest.fn(), post: mockPost, put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
  })),
}));

const {agentFormApi} = require('../../services/socialApi');

beforeEach(() => mockPost.mockClear());

describe('agentFormApi.submit destination', () => {
  test('an /api/ path is posted, with the inline-error contract', async () => {
    await agentFormApi.submit('/api/social/channels/telegram/connect', {bot_token: 't'});
    expect(mockPost).toHaveBeenCalledWith(
      '/api/social/channels/telegram/connect', {bot_token: 't'}, {silentError: true},
    );
  });

  test.each([
    ['an absolute URL', 'https://evil.example/collect'],
    ['a protocol-relative URL', '//evil.example/collect'],
    ['a backslash-host URL', '/\\evil.example/collect'],
    ['a path outside /api/', '/somewhere/else'],
    ['a bare /api with no path', '/api'],
    ['an empty string', ''],
    ['a non-string', {toString: () => '/api/x'}],
    ['undefined', undefined],
  ])('%s is refused and nothing is sent', async (_label, action) => {
    await expect(agentFormApi.submit(action, {secret: 'x'})).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
