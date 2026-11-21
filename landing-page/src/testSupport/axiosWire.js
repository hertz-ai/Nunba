/**
 * axios for the checkout suites, stubbed at the wire.
 *
 * A suite says
 *   jest.mock('axios', () =>
 *     jest.requireActual('../../testSupport/axiosWire').wireAxios());
 * and gets the real axios with one change: nothing leaves the process.  Every
 * request ends in `axios.post` / `axios.get` (jest.fn), called with
 * (url, body, config) where config is the request as it would go out: the
 * client's defaults, the caller's options and whatever the client's
 * interceptors added (the Authorization header, for one).  So a suite routes
 * and reads calls the same way whether the code under test calls axios itself
 * or goes through a client made by services/axiosFactory, and the factory's
 * own interceptors run for real.
 *
 * What the stub answers is turned into what the wire would give:
 *   resolves {status, data}            that response
 *   rejects an error with `.response`  an AxiosError carrying that response
 *                                      and the request's config
 *   rejects anything else              that error (no answer at all: a
 *                                      timeout, no network)
 *
 * It must not import axios (it IS the axios mock while it runs), and it is not
 * under __tests__, so jest does not collect it as a suite.
 */
export function wireAxios() {
  const real = jest.requireActual('axios');
  const post = jest.fn();
  const get = jest.fn();

  const adapter = async (config) => {
    const body =
      typeof config.data === 'string' && config.data
        ? JSON.parse(config.data)
        : config.data;
    const stub = String(config.method).toLowerCase() === 'post' ? post : get;
    let answer;
    try {
      answer = await stub(real.getUri(config), body, config);
    } catch (error) {
      if (error && error.response) {
        throw new real.AxiosError(
          error.message,
          'ERR_BAD_RESPONSE',
          config,
          null,
          {statusText: '', headers: {}, ...error.response, config}
        );
      }
      throw error;
    }
    return {status: 200, statusText: 'OK', headers: {}, ...answer, config};
  };

  return {
    ...real,
    post,
    get,
    create: (defaults = {}) => real.create({...defaults, adapter}),
  };
}
