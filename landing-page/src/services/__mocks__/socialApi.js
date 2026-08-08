/**
 * The one mock of socialApi.
 *
 * Nine Admin test files each hand-wrote a factory naming the two or three of
 * this module's 49 exports they believed their page touched. Nothing verified
 * that belief. When ChannelsPage grew a presence indicator several levels down
 * the tree, its test's factory -- which listed only channelsApi -- handed the
 * indicator `undefined` for channelUserApi, and the suite died on
 * "Cannot read properties of undefined (reading 'presence')" in a component the
 * test was never written to exercise. Every one of those files carried the same
 * latent fault, waiting on whichever import landed next.
 *
 * This is jest's manual-mock convention: `jest.mock('services/socialApi')` with
 * no factory picks this file up automatically. The shape is derived from the
 * real module rather than restated, so it cannot drift from it -- a new export,
 * or a new method on an existing one, appears here the moment it is written.
 *
 * Every method resolves to `{ data: [] }`, the shape an axios call returns, so
 * a component that renders a list before its test has stubbed anything gets an
 * empty list rather than a crash. Tests override per case exactly as before:
 *
 *     channelsApi.list.mockResolvedValue({ data: mockChannels });
 */
const actual = jest.requireActual('../socialApi');

const emptyResponse = () => Promise.resolve({ data: [] });

/** Replace every function on an API object with a resolving jest.fn(). */
function mockApiObject(source) {
  const out = {};
  for (const key of Object.keys(source)) {
    out[key] = typeof source[key] === 'function' ? jest.fn(emptyResponse) : source[key];
  }
  return out;
}

// Marked as an ES module so babel's interop resolves `import socialApi from` to
// the mocked default export rather than to this whole namespace object.
const mocked = { __esModule: true };
for (const [name, value] of Object.entries(actual)) {
  if (typeof value === 'function') {
    mocked[name] = jest.fn(emptyResponse);
  } else if (value && typeof value === 'object') {
    mocked[name] = mockApiObject(value);
  } else {
    // Primitives (base URLs, enums) are passed through untouched: a test that
    // asserts on a constant should see the real one.
    mocked[name] = value;
  }
}

module.exports = mocked;
