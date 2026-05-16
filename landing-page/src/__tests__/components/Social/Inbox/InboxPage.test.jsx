/**
 * InboxPage.test.jsx — PR D Nunba web parity.
 *
 * Mirrors the Hevolve_RN InboxScreen.test.js contract:
 *   1. routeForRow() pure dispatch — every kind × parent_kind branch
 *   2. mount → inboxApi.list called → rows render
 *   3. clicking a row navigates via routeForRow target path
 *   4. filter chip narrows visible rows by kind
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  inboxApi: {list: jest.fn()},
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import {inboxApi} from '../../../../services/socialApi';
import InboxPage, {routeForRow}
  from '../../../../components/Social/Inbox/InboxPage';

import {fireEvent, render, screen, waitFor, within}
  from '@testing-library/react';
import React from 'react';

const SAMPLE = [
  {
    id: 'm1',
    kind: 'mention',
    parent_kind: 'post',
    parent_id: 'post-42',
    sender: {username: 'aru', display_name: 'Aru'},
    content_preview: 'curious about saturn',
    channel_type: 'discord:abc',
    is_unread: true,
    last_activity_at: new Date().toISOString(),
  },
  {
    id: 'msg1',
    kind: 'message',
    parent_kind: 'conversation',
    parent_id: 'conv-7',
    sender: {username: 'bee', display_name: 'Bee'},
    sender_kind: 'human',
    content_preview: 'tomorrow at my place',
    is_unread: true,
    last_activity_at: new Date().toISOString(),
  },
  {
    id: 'inv1',
    kind: 'invite',
    parent_kind: 'community',
    parent_id: 'comm-cosmic',
    sender: {username: 'cara', display_name: 'Cara'},
    content_preview: 'Cara invited you to #cosmic-tea-club',
    parent_label: '#cosmic-tea-club',
    is_unread: false,
    last_activity_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

describe('routeForRow — web dispatch table', () => {
  test('mention on post → /social/posts/:id', () => {
    expect(routeForRow(SAMPLE[0])).toEqual({
      kind: 'path', value: '/social/posts/post-42',
    });
  });
  test('message → /social/conversations/:id', () => {
    expect(routeForRow(SAMPLE[1])).toEqual({
      kind: 'path', value: '/social/conversations/conv-7',
    });
  });
  test('invite → /social/invites', () => {
    expect(routeForRow(SAMPLE[2])).toEqual({
      kind: 'path', value: '/social/invites',
    });
  });
  test('mention on community → /social/communities/:id', () => {
    expect(
      routeForRow({kind: 'mention', parent_kind: 'community', parent_id: 'c1'}),
    ).toEqual({kind: 'path', value: '/social/communities/c1'});
  });
  test('row.deep_link wins', () => {
    expect(
      routeForRow({kind: 'message', parent_id: 'x', deep_link: '/foo'}),
    ).toEqual({kind: 'href', value: '/foo'});
  });
  test('null guard', () => {
    expect(routeForRow(null)).toBeNull();
    expect(routeForRow(undefined)).toBeNull();
  });
});

describe('InboxPage — render + interactions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    inboxApi.list.mockReset();
  });

  test('mount → fetches inboxApi.list and renders rows', async () => {
    inboxApi.list.mockResolvedValue({
      data: {rows: SAMPLE, cursor: null, has_more: false},
    });
    render(<InboxPage />);
    await waitFor(() => {
      expect(inboxApi.list).toHaveBeenCalled();
    });
    expect(await screen.findByText('Aru')).toBeInTheDocument();
    expect(await screen.findByText('Bee')).toBeInTheDocument();
    expect(await screen.findByText('curious about saturn')).toBeInTheDocument();
  });

  test('clicking a row navigates to the routeForRow target', async () => {
    inboxApi.list.mockResolvedValue({
      data: {rows: SAMPLE, cursor: null, has_more: false},
    });
    render(<InboxPage />);
    const aruRow = await screen.findByText('Aru');
    fireEvent.click(aruRow);
    expect(mockNavigate).toHaveBeenCalledWith('/social/posts/post-42');
  });

  test('filter chip narrows by kind', async () => {
    inboxApi.list.mockResolvedValue({
      data: {rows: SAMPLE, cursor: null, has_more: false},
    });
    render(<InboxPage />);
    await screen.findByText('Aru');

    // Click "Messages" filter — only the message row should remain.
    fireEvent.click(screen.getByText(/^Messages/));
    await waitFor(() => {
      expect(screen.queryByText('Aru')).toBeNull();
      expect(screen.queryByText('Cara')).toBeNull();
    });
    expect(screen.getByText('Bee')).toBeInTheDocument();
  });

  test('list rejection — page renders Inbox header without crash', async () => {
    inboxApi.list.mockRejectedValue(new Error('503'));
    render(<InboxPage />);
    expect(await screen.findByText('Inbox')).toBeInTheDocument();
  });

  test('empty rows → EmptyState renders', async () => {
    inboxApi.list.mockResolvedValue({
      data: {rows: [], cursor: null, has_more: false},
    });
    render(<InboxPage />);
    expect(await screen.findByText('Inbox zero')).toBeInTheDocument();
  });
});
