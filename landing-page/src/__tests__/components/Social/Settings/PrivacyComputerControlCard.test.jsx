/**
 * PrivacySettingsPage — the computer_control consent card.
 *
 * HARTOS integrations/vlm/safety.computer_control_block asks the desktop
 * owner before any agent runs shell commands, writes files or drives the
 * mouse and keyboard.  The consent API grant writes a row with no agent,
 * so a grant here covers every agent (hartos-3e ruling (c): the card says
 * "Allow ALL agents to control this computer").  Revoking ends every
 * active grant (HARTOS consent_api.revoke_consent) and the next agent run
 * asks again.
 *
 * The list mock answers by consent_type, in the body shape the real
 * axios client returns ({success, data: {consents}}), so each card reads
 * its own rows whatever order the cards mount in.  Each card shows a
 * spinner until its own list call resolves, so every button is awaited.
 *
 * The way-back check covers two card shapes: a blanket card ("Allow ALL
 * agents to ...") and, for a per-requester type (device_access, #111), the
 * per-phone row whose Allow re-admits the one phone the owner said no to
 * -- a blanket device_access row admits no phone, so that card must never
 * offer an allow-all.
 */
/* eslint-disable import/order, import/first */

jest.mock('../../../../services/socialApi', () => ({
  consentApi: {
    list: jest.fn(),
    grant: jest.fn(),
    revoke: jest.fn(),
  },
}));

import {consentApi} from '../../../../services/socialApi';
import PrivacySettingsPage from '../../../../components/Social/Settings/PrivacySettingsPage';
import {renderWithProviders} from '../../../testHelpers';

import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import React from 'react';

// The page renders a spinner until its cloud_capability list resolves,
// then each card its own spinner until its list resolves.
const WAIT = {timeout: 5000};

const ACTIVE_ROW = {
  id: 'cc-active-1',
  consent_type: 'computer_control',
  scope: '*',
  granted: true,
  granted_at: new Date(Date.now() - 60 * 1000).toISOString(),
  revoked_at: null,
};

// A phone the owner said no to: the privacy page's Allow is its way back.
const BLOCKED_PHONE_ROW = {
  id: 'da-declined-1',
  consent_type: 'device_access',
  scope: `device:${'a'.repeat(64)}`,
  granted: false,
  granted_at: null,
  revoked_at: new Date(Date.now() - 60 * 1000).toISOString(),
  label: 'Giri',
  fingerprint: 'aaaa aaaa aaaa aaaa',
};

function listAnswers(rowsByType) {
  consentApi.list.mockImplementation(({consent_type} = {}) => {
    const consents = rowsByType[consent_type] || [];
    return Promise.resolve({
      success: true,
      data: {consents, count: consents.length},
    });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('computer_control card', () => {
  test('asks for active rows of computer_control only', async () => {
    listAnswers({});
    renderWithProviders(<PrivacySettingsPage />);
    await screen.findByTestId('computer-control-card', {}, WAIT);

    await waitFor(() => {
      expect(consentApi.list).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        active_only: true,
      });
    }, WAIT);
  });

  test('off by default; allowing needs "I understand" and grants every agent', async () => {
    listAnswers({});
    consentApi.grant.mockResolvedValueOnce({success: true, data: {}});

    renderWithProviders(<PrivacySettingsPage />);
    const card = await screen.findByTestId('computer-control-card', {}, WAIT);
    fireEvent.click(
      await within(card).findByRole(
        'button',
        {name: /Allow ALL agents to control this computer/},
        WAIT,
      ),
    );
    expect(within(card).getByTestId('computer-control-status')).toHaveTextContent('Off');

    const confirm = await screen.findByTestId('computer-control-confirm', {}, WAIT);
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByTestId('computer-control-understand'));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        scope: '*',
      });
    }, WAIT);
  });

  test('an active grant shows Enabled and revoke ends it', async () => {
    listAnswers({computer_control: [ACTIVE_ROW]});
    consentApi.revoke.mockResolvedValueOnce({success: true, data: {}});

    renderWithProviders(<PrivacySettingsPage />);
    const card = await screen.findByTestId('computer-control-card', {}, WAIT);
    fireEvent.click(
      await within(card).findByTestId('computer-control-revoke', {}, WAIT),
    );
    expect(within(card).getByTestId('computer-control-status')).toHaveTextContent('Enabled');

    await waitFor(() => {
      expect(consentApi.revoke).toHaveBeenCalledWith({
        consent_type: 'computer_control',
        scope: '*',
      });
    }, WAIT);
  });

  test('the public_exposure card is unchanged beside it', async () => {
    listAnswers({});
    renderWithProviders(<PrivacySettingsPage />);

    const card = await screen.findByTestId('public-exposure-card', {}, WAIT);
    expect(within(card).getByText('Autonomous external posting')).toBeInTheDocument();
    expect(
      await within(card).findByTestId('public-exposure-grant', {}, WAIT),
    ).toHaveTextContent('Enable external posting');
    expect(consentApi.list).toHaveBeenCalledWith({
      consent_type: 'public_exposure',
      active_only: true,
    });
  });
});

describe('the way back after a "Don\'t allow"', () => {
  test('every ask type a consent card can decline has its allow control on this page', async () => {
    // A no stands until the owner allows the type again here (HARTOS
    // consent_api.decline_consent), so a declinable type with no card here
    // would strand the owner.
    const {CONSENT_ASKS, PRIVACY_CARD_TYPES} = require('../../../../constants/consentAsks');
    expect(PRIVACY_CARD_TYPES.length).toBeGreaterThan(0);
    expect(PRIVACY_CARD_TYPES).toContain('device_access');
    listAnswers({device_access: [BLOCKED_PHONE_ROW]});
    renderWithProviders(<PrivacySettingsPage />);

    for (const type of PRIVACY_CARD_TYPES) {
      const card = await screen.findByTestId(
        `${type.replace(/_/g, '-')}-card`, {}, WAIT,
      );
      if (CONSENT_ASKS[type].perRequester) {
        // One phone, by its own row: Allow re-admits exactly it.
        expect(
          await within(card).findByRole('button', {name: 'Allow'}, WAIT),
        ).toBeInTheDocument();
        expect(within(card).queryByRole('button', {name: /ALL/})).toBeNull();
      } else {
        expect(
          await within(card).findByRole(
            'button', {name: /^Allow ALL agents to /}, WAIT,
          ),
        ).toBeInTheDocument();
      }
    }
  });
});
