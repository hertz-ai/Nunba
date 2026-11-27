/**
 * A 401 erases the stored token only when the failed request carried that
 * same current token.
 *
 * Live 2026-11-25: requests of the startup burst (GET /agents/sync, the
 * notification polls) went out before useStorageSync restored the sign-in,
 * so they carried no token and got 401.  The 401 handler erased whatever
 * token the page held when the answer came back, so an answer landing just
 * after the restore signed the window out again.  A request that sent no
 * token, or an older one, says nothing about the token the page holds now.
 */
import axios from 'axios';

import {createApiClient} from '../../services/axiosFactory';

const CURRENT = 'current-token';

// Stands in for the server: lets `restore` run while the request is in
// flight (the startup restore landing), then answers 401.
function answers401(restore) {
  return (config) => {
    if (restore) restore();
    const response = {status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config};
    return Promise.reject(new axios.AxiosError(
      'Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, response));
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('a 401 erases only the token the failed request carried', () => {
  test.each([
    ['a request that sent no token', null],
    ['a request that sent an older token', 'older-token'],
  ])('%s leaves the current token', async (_label, sentToken) => {
    if (sentToken) localStorage.setItem('access_token', sentToken);
    const client = createApiClient('http://localhost:5000', {cache: false});

    await expect(client.get('/agents/sync', {
      adapter: answers401(() => localStorage.setItem('access_token', CURRENT)),
    })).rejects.toBeTruthy();

    expect(localStorage.getItem('access_token')).toBe(CURRENT);
  });

  test('a request carrying the current token clears it as before', async () => {
    localStorage.setItem('access_token', CURRENT);
    const client = createApiClient('http://localhost:5000', {cache: false});

    await expect(client.get('/agents/sync', {adapter: answers401()}))
      .rejects.toBeTruthy();

    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
