/**
 * PrivacySettingsPage: a credential "no" can be taken back.
 *
 * Owner rule (2026-09-27): a no must be undoable, with no friction.  The
 * consent card's "Don't allow" on a credential ask (scope 'secret:NAME')
 * marks the ask revoked, and HARTOS then never asks for it again
 * (ConsentService.declined).  This card lists those credentials from the
 * same GET /api/social/consent the rest of the page reads, and "Allow
 * asking again" posts POST /api/social/consent/reopen (HARTOS
 * ConsentService.reopen): undecided again, nothing granted.
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  consentApi: {
    list: jest.fn(),
    grant: jest.fn(),
    revoke: jest.fn(),
    decline: jest.fn(),
    reopen: jest.fn(),
  },
}));

const realtimeHandlers = {};
jest.mock('../../../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: jest.fn((topic, cb) => {
      realtimeHandlers[topic] = cb;
      return () => { delete realtimeHandlers[topic]; };
    }),
  },
}));

import {consentApi} from '../../../../services/socialApi';
import {DeclinedCredentialsCard} from '../../../../components/Social/Settings/PrivacySettingsPage';
import {declinedCredentials} from '../../../../constants/consentAsks';
import {renderWithProviders} from '../../../testHelpers';

import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import React from 'react';

const WAIT = {timeout: 5000};
const T1 = new Date(Date.now() - 60 * 1000).toISOString();

function row(over) {
  return {
    id: over.id, consent_type: 'credential', scope: 'secret:SITE_PASSWORD',
    granted: false, granted_at: null, revoked_at: null, ...over,
  };
}

const DECLINED = row({id: 'd1', revoked_at: T1});
const PENDING = row({id: 'p1', scope: 'secret:OTHER_KEY'});
const GRANTED = row({id: 'g1', scope: 'secret:API_TOKEN', granted: true, granted_at: T1});

function listAnswers(consents) {
  consentApi.list.mockResolvedValue({success: true, data: {consents, count: consents.length}});
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('declinedCredentials', () => {
  test('a credential with a revoked row is declined; pending and granted ones are not', () => {
    expect(declinedCredentials([DECLINED, PENDING, GRANTED]))
      .toEqual([{scope: 'secret:SITE_PASSWORD', name: 'SITE_PASSWORD'}]);
  });

  test('a no taken back (reopened after it) is not listed; a no after a reopen is', () => {
    const T2 = new Date(Date.now() - 30 * 1000).toISOString();
    const reopened = row({id: 'r1', revoked_at: T1, reopened_at: T2});
    expect(declinedCredentials([reopened])).toEqual([]);
    const againNo = row({id: 'r2', revoked_at: T2, reopened_at: T1});
    expect(declinedCredentials([againNo]))
      .toEqual([{scope: 'secret:SITE_PASSWORD', name: 'SITE_PASSWORD'}]);
  });

  test('one entry per credential, and rows of other types are ignored', () => {
    const again = row({id: 'd2', revoked_at: T1, agent_id: '42'});
    const other = {...DECLINED, id: 'x', consent_type: 'computer_control', scope: '*'};
    expect(declinedCredentials([DECLINED, again, other]))
      .toEqual([{scope: 'secret:SITE_PASSWORD', name: 'SITE_PASSWORD'}]);
  });
});

describe('the declined-credentials card', () => {
  test('lists a credential the owner said no to and reads only credential rows', async () => {
    listAnswers([DECLINED, PENDING]);
    renderWithProviders(<DeclinedCredentialsCard />);
    const card = await screen.findByTestId('declined-credentials-card', {}, WAIT);
    expect(consentApi.list).toHaveBeenCalledWith({consent_type: 'credential'});
    expect(within(card).getByText('SITE_PASSWORD')).toBeInTheDocument();
    expect(within(card).queryByText('OTHER_KEY')).toBeNull();
  });

  test('"Allow asking again" reopens that credential, then the list is read again', async () => {
    listAnswers([DECLINED]);
    consentApi.reopen.mockImplementation(async () => {
      listAnswers([row({id: 'd1'})]);
      return {success: true, data: {reopened: 1}};
    });
    renderWithProviders(<DeclinedCredentialsCard />);
    const card = await screen.findByTestId('declined-credentials-card', {}, WAIT);

    fireEvent.click(within(card).getByRole('button', {name: 'Allow asking again'}));
    await waitFor(() => {
      expect(consentApi.reopen).toHaveBeenCalledWith({
        consent_type: 'credential', scope: 'secret:SITE_PASSWORD'});
    }, WAIT);
    expect(consentApi.grant).not.toHaveBeenCalled();
    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    await waitFor(() => {
      expect(screen.queryByTestId('declined-credentials-card')).toBeNull();
    }, WAIT);
  });

  test('a reopen that fails keeps the credential listed and says so', async () => {
    listAnswers([DECLINED]);
    consentApi.reopen.mockRejectedValue(new Error('down'));
    renderWithProviders(<DeclinedCredentialsCard />);
    const card = await screen.findByTestId('declined-credentials-card', {}, WAIT);
    fireEvent.click(within(card).getByRole('button', {name: 'Allow asking again'}));
    expect(await screen.findByRole('alert', {}, WAIT)).toHaveTextContent(/retry/i);
    expect(within(card).getByText('SITE_PASSWORD')).toBeInTheDocument();
  });

  test('a 404 (already taken back elsewhere) is nothing to do: the list is read again', async () => {
    listAnswers([DECLINED]);
    consentApi.reopen.mockImplementation(async () => {
      listAnswers([row({id: 'd1', revoked_at: T1, reopened_at: new Date().toISOString()})]);
      throw Object.assign(new Error('nothing declined'), {response: {status: 404}});
    });
    renderWithProviders(<DeclinedCredentialsCard />);
    const card = await screen.findByTestId('declined-credentials-card', {}, WAIT);
    fireEvent.click(within(card).getByRole('button', {name: 'Allow asking again'}));

    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    await waitFor(() => {
      expect(screen.queryByTestId('declined-credentials-card')).toBeNull();
    }, WAIT);
    expect(screen.queryByText(/Please retry/)).toBeNull();
  });

  test('while the reopen is on its way the button is busy and a second click sends nothing', async () => {
    listAnswers([DECLINED]);
    let finish;
    consentApi.reopen.mockImplementation(() => new Promise((r) => { finish = r; }));
    renderWithProviders(<DeclinedCredentialsCard />);
    const card = await screen.findByTestId('declined-credentials-card', {}, WAIT);
    const button = within(card).getByRole('button', {name: 'Allow asking again'});
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled(), WAIT);
    fireEvent.click(button);
    expect(consentApi.reopen).toHaveBeenCalledTimes(1);
    finish({success: true});
    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
  });

  test('a list that cannot be read offers Retry, and the error stays until closed', async () => {
    jest.useFakeTimers();
    try {
      consentApi.list.mockRejectedValueOnce(new Error('down'));
      renderWithProviders(<DeclinedCredentialsCard />);
      const alert = await screen.findByRole('alert', {}, WAIT);
      jest.advanceTimersByTime(10000);
      expect(screen.getByRole('alert')).toBe(alert);
      listAnswers([DECLINED]);
      fireEvent.click(within(alert).getByRole('button', {name: 'Retry'}));
      await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    } finally {
      jest.useRealTimers();
    }
  });

  test('another window taking the no back refreshes this page (consent.reopened)', async () => {
    listAnswers([DECLINED]);
    renderWithProviders(<DeclinedCredentialsCard />);
    await screen.findByTestId('declined-credentials-card', {}, WAIT);
    listAnswers([]);
    realtimeHandlers['consent.reopened']({type: 'consent.reopened',
      consent_type: 'credential', scope: 'secret:SITE_PASSWORD', agent_id: null});
    await waitFor(() => {
      expect(screen.queryByTestId('declined-credentials-card')).toBeNull();
    }, WAIT);
  });

  test('with no credential declined, nothing is shown', async () => {
    listAnswers([PENDING, GRANTED]);
    renderWithProviders(<DeclinedCredentialsCard />);
    await waitFor(() => expect(consentApi.list).toHaveBeenCalled(), WAIT);
    expect(screen.queryByTestId('declined-credentials-card')).toBeNull();
  });
});
