/**
 * routeForRow.test.js — pure-JS dispatch table coverage for the
 * InboxPage routing helper.  Pairs with InboxPage.test.jsx (component
 * render + interactions) which runs in CI alongside the rest of the
 * .jsx test suite.  This file stays JSX-free so it also runs locally
 * on dev machines without the React Babel preset configured.
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  inboxApi: {list: jest.fn()},
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

const {routeForRow} =
  require('../../../../components/Social/Inbox/InboxPage');

describe('routeForRow — Nunba web dispatch table', () => {
  test('mention on post → /social/posts/:id', () => {
    expect(routeForRow({
      kind: 'mention', parent_kind: 'post', parent_id: 'p1',
    })).toEqual({kind: 'path', value: '/social/posts/p1'});
  });

  test('mention on comment → /social/posts/:id (comment lives in a post)', () => {
    expect(routeForRow({
      kind: 'mention', parent_kind: 'comment', parent_id: 'c1',
    })).toEqual({kind: 'path', value: '/social/posts/c1'});
  });

  test('mention on community → /social/communities/:id', () => {
    expect(routeForRow({
      kind: 'mention', parent_kind: 'community', parent_id: 'cm1',
    })).toEqual({kind: 'path', value: '/social/communities/cm1'});
  });

  test('mention on unknown parent → null (caller no-ops)', () => {
    expect(routeForRow({
      kind: 'mention', parent_kind: 'asteroid', parent_id: 'a1',
    })).toBeNull();
  });

  test('message → /social/conversations/:id', () => {
    expect(routeForRow({
      kind: 'message', parent_kind: 'conversation', parent_id: 'conv-7',
    })).toEqual({kind: 'path', value: '/social/conversations/conv-7'});
  });

  test('invite → /social/invites', () => {
    expect(routeForRow({kind: 'invite'})).toEqual({
      kind: 'path', value: '/social/invites',
    });
  });

  test('friendship → /social/friends', () => {
    expect(routeForRow({kind: 'friendship'})).toEqual({
      kind: 'path', value: '/social/friends',
    });
  });

  test('notification → /social/notifications', () => {
    expect(routeForRow({kind: 'notification'})).toEqual({
      kind: 'path', value: '/social/notifications',
    });
  });

  test('unknown kind → /social/notifications fallback', () => {
    expect(routeForRow({kind: 'eldritch_horror'})).toEqual({
      kind: 'path', value: '/social/notifications',
    });
  });

  test('row.deep_link wins over kind/parent dispatch', () => {
    expect(routeForRow({
      kind: 'message',
      parent_kind: 'conversation',
      parent_id: 'conv-x',
      deep_link: 'hevolve://post/p99',
    })).toEqual({kind: 'href', value: 'hevolve://post/p99'});
  });

  test('null / undefined row → null', () => {
    expect(routeForRow(null)).toBeNull();
    expect(routeForRow(undefined)).toBeNull();
  });
});
