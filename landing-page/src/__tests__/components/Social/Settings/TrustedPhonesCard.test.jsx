/**
 * PrivacySettingsPage — the trusted-phones card (#111).
 *
 * HARTOS 29a188036: GET /api/social/consent rows of consent_type
 * device_access carry `label` (the name the phone signed into its first
 * ask, or null) and `fingerprint` (the first 16 hex of its key, four
 * groups).  The scope is the phone's key, so the owner reads a phone by
 * its label and fingerprint, never the key.  One phone = one scope; the
 * table is append-only, so a phone has several rows over time.
 *
 * Per phone the card shows ALLOWED (a granted, unrevoked row), BLOCKED (a
 * revoked row and no active grant) or PENDING (only pending rows), and
 * acts on that ONE scope: Allow = POST /consent, Block = POST
 * /consent/revoke, Don't allow (pending) = POST /consent/decline with
 * agent_id null.  There is no "Allow ALL phones": a blanket device_access
 * row admits no phone (consent_api refuses it with 400) and would only
 * look like one.
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  consentApi: {
    list: jest.fn(),
    grant: jest.fn(),
    revoke: jest.fn(),
    decline: jest.fn(),
  },
}));

import {consentApi} from '../../../../services/socialApi';
import {TrustedPhonesCard} from '../../../../components/Social/Settings/PrivacySettingsPage';
import {
  PHONE_STATES, trustedPhones,
} from '../../../../components/Social/Settings/trustedPhones';
import {renderWithProviders} from '../../../testHelpers';

import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import React from 'react';

const WAIT = {timeout: 5000};
const KEY_A = '3f9a1c0277deb4e1' + 'a'.repeat(48);
const KEY_B = 'b'.repeat(64);
const SCOPE_A = `device:${KEY_A}`;
const SCOPE_B = `device:${KEY_B}`;
const FP_A = '3f9a 1c02 77de b4e1';
const FP_B = 'bbbb bbbb bbbb bbbb';
const T0 = new Date(Date.now() - 3600 * 1000).toISOString();
const T1 = new Date(Date.now() - 60 * 1000).toISOString();

function row(over) {
  return {
    id: over.id, consent_type: 'device_access', scope: SCOPE_A, granted: false,
    granted_at: null, revoked_at: null, label: null, fingerprint: FP_A, ...over,
  };
}

const PENDING_A = row({id: 'p1', label: 'Giri'});
const GRANTED_A = row({id: 'g1', granted: true, granted_at: T1, label: 'Giri'});
const REVOKED_A = row({id: 'r1', granted: true, granted_at: T0, revoked_at: T1, label: 'Giri'});
const DECLINED_A = row({id: 'd1', granted: false, revoked_at: T1, label: 'Giri'});
const PENDING_B = row({id: 'p2', scope: SCOPE_B, fingerprint: FP_B});

function listAnswers(consents) {
  consentApi.list.mockResolvedValue({success: true, data: {consents, count: consents.length}});
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('trustedPhones — one entry per phone, from its append-only rows', () => {
  test('a granted, unrevoked row is ALLOWED, whatever else the phone has', () => {
    const [a] = trustedPhones([GRANTED_A, REVOKED_A, PENDING_A]);
    expect(a).toEqual({scope: SCOPE_A, label: 'Giri', fingerprint: FP_A, state: PHONE_STATES.ALLOWED});
  });

  test('a revoked row with no active grant is BLOCKED; a declined ask counts', () => {
    expect(trustedPhones([REVOKED_A, PENDING_A])[0].state).toBe(PHONE_STATES.BLOCKED);
    expect(trustedPhones([DECLINED_A])[0].state).toBe(PHONE_STATES.BLOCKED);
  });

  test('only pending rows is PENDING', () => {
    expect(trustedPhones([PENDING_A])[0].state).toBe(PHONE_STATES.PENDING);
  });

  test('a phone with no label is "Unnamed phone"; the fingerprint falls back to the key', () => {
    const [b] = trustedPhones([{...PENDING_B, fingerprint: undefined}]);
    expect(b.label).toBe('Unnamed phone');
    expect(b.fingerprint).toBe(FP_B);
  });

  test('keeps the server order (newest first) and skips rows of other types', () => {
    const out = trustedPhones([PENDING_B, GRANTED_A,
      {id: 'x', consent_type: 'computer_control', scope: '*', granted: true}]);
    expect(out.map((p) => p.scope)).toEqual([SCOPE_B, SCOPE_A]);
  });

  test('the label is the first one on file, never rewritten by a later row', () => {
    const [a] = trustedPhones([row({id: 'n', label: 'Someone else'}), GRANTED_A]);
    expect(a.label).toBe('Someone else');
  });
});

describe('the trusted-phones card', () => {
  test('lists every row of device_access and shows each phone by label, code and state', async () => {
    listAnswers([GRANTED_A, PENDING_B]);
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);

    await waitFor(() => {
      expect(consentApi.list).toHaveBeenCalledWith({consent_type: 'device_access'});
    }, WAIT);

    const rowA = await within(card).findByTestId('phone-row-3f9a1c0277deb4e1', {}, WAIT);
    expect(within(rowA).getByText('Giri')).toBeInTheDocument();
    const code = within(rowA).getByText(FP_A);
    expect(code.tagName).toBe('CODE');
    expect(within(rowA).getByTestId('phone-state-3f9a1c0277deb4e1')).toHaveTextContent('ALLOWED');

    const rowB = within(card).getByTestId('phone-row-bbbbbbbbbbbbbbbb');
    expect(within(rowB).getByText('Unnamed phone')).toBeInTheDocument();
    expect(within(rowB).getByText(FP_B)).toBeInTheDocument();
    expect(within(rowB).getByTestId('phone-state-bbbbbbbbbbbbbbbb')).toHaveTextContent('PENDING');
  });

  test('never offers an allow-all', async () => {
    listAnswers([GRANTED_A, REVOKED_A, PENDING_B]);
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);
    await within(card).findByTestId('phone-row-3f9a1c0277deb4e1', {}, WAIT);
    expect(within(card).queryByRole('button', {name: /ALL/})).toBeNull();
    expect(within(card).queryByText(/all phones/i)).toBeNull();
  });

  test('an allowed phone can be blocked: revoke on its scope, then the list is read again', async () => {
    listAnswers([GRANTED_A]);
    consentApi.revoke.mockResolvedValue({success: true, data: {}});
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);

    fireEvent.click(await within(card).findByTestId('phone-block-3f9a1c0277deb4e1', {}, WAIT));
    await waitFor(() => {
      expect(consentApi.revoke).toHaveBeenCalledWith({consent_type: 'device_access', scope: SCOPE_A});
    }, WAIT);
    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    expect(within(card).queryByTestId('phone-allow-3f9a1c0277deb4e1')).toBeNull();
  });

  test('a blocked phone can be allowed again: grant on its exact scope', async () => {
    listAnswers([REVOKED_A]);
    consentApi.grant.mockResolvedValue({success: true, data: {}});
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);
    expect(await within(card).findByTestId('phone-state-3f9a1c0277deb4e1', {}, WAIT))
      .toHaveTextContent('BLOCKED');

    fireEvent.click(within(card).getByTestId('phone-allow-3f9a1c0277deb4e1'));
    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({consent_type: 'device_access', scope: SCOPE_A});
    }, WAIT);
    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    expect(within(card).queryByTestId('phone-block-3f9a1c0277deb4e1')).toBeNull();
    expect(within(card).queryByTestId('phone-decline-3f9a1c0277deb4e1')).toBeNull();
  });

  test("a pending ask offers Allow and Don't allow; the no declines that phone's ask, agent_id null", async () => {
    listAnswers([PENDING_A]);
    consentApi.decline.mockResolvedValue({success: true, data: {}});
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);
    expect(await within(card).findByTestId('phone-state-3f9a1c0277deb4e1', {}, WAIT))
      .toHaveTextContent('PENDING');
    expect(within(card).getByTestId('phone-allow-3f9a1c0277deb4e1')).toHaveTextContent('Allow');

    fireEvent.click(within(card).getByTestId('phone-decline-3f9a1c0277deb4e1'));
    await waitFor(() => {
      expect(consentApi.decline).toHaveBeenCalledWith({
        consent_type: 'device_access', scope: SCOPE_A, agent_id: null,
      });
    }, WAIT);
    await waitFor(() => expect(consentApi.list).toHaveBeenCalledTimes(2), WAIT);
    expect(consentApi.revoke).not.toHaveBeenCalled();
  });

  test('with no phone on file it says so, and still offers nothing blanket', async () => {
    listAnswers([]);
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);
    expect(await within(card).findByTestId('phones-empty', {}, WAIT)).toBeInTheDocument();
    expect(within(card).queryByRole('button')).toBeNull();
  });

  test('a failed action leaves the phone as it was and says so', async () => {
    listAnswers([GRANTED_A]);
    consentApi.revoke.mockRejectedValue(new Error('down'));
    renderWithProviders(<TrustedPhonesCard />);
    const card = await screen.findByTestId('device-access-card', {}, WAIT);
    fireEvent.click(await within(card).findByTestId('phone-block-3f9a1c0277deb4e1', {}, WAIT));
    expect(await screen.findByRole('alert', {}, WAIT)).toHaveTextContent(/retry/i);
    expect(within(card).getByTestId('phone-state-3f9a1c0277deb4e1')).toHaveTextContent('ALLOWED');
  });
});
