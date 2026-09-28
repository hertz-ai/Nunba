/**
 * DiscoverableTogglePanel.test.jsx — Jest coverage for F1 GREENLIT
 * (master-orchestrator aa3ead1).
 *
 * Mandated cases:
 *   a) Mount → bleEncounterApi.getDiscoverable called once.
 *   b) Switch disabled until age-claim checkbox checked.
 *   c) Toggle on → setDiscoverable({enabled: true, age_claim_18: true, ...})
 *      with the chip-input's vibe_tags.
 *   d) Server returns 429 → Snackbar shows + Switch disabled.
 *   e) Server returns 403 → inline "Confirm 18+" rendered.
 *   f) Vibe-tags chip input enforces 10-tag cap.
 *   g) TTL countdown ticks down on visible interval (fake timers).
 *
 * Strategy: mock socialApi.bleEncounterApi so we control the response
 * shape per case.  We mount the panel via renderWithProviders (the
 * shared MUI/Theme/Router wrapper used by other social tests).
 */

// Mock the bleEncounterApi module BEFORE importing the component.
jest.mock('../../../../../services/socialApi', () => {
  const getDiscoverable = jest.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          enabled: false,
          expires_at: null,
          remaining_sec: 0,
          toggle_count_24h: 0,
          age_claim_18: false,
          face_visible: false,
          avatar_style: 'studio_ghibli',
          vibe_tags: [],
        },
      },
    }),
  );
  const setDiscoverable = jest.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          enabled: true,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          remaining_sec: 3600,
        },
      },
    }),
  );
  const getPersona = jest.fn(() =>
    Promise.resolve({data: {success: true, data: {interests_discoverable: false}}}),
  );
  const setPersona = jest.fn(() =>
    Promise.resolve({data: {success: true, data: {interests_discoverable: true}}}),
  );
  return {
    bleEncounterApi: {getDiscoverable, setDiscoverable, getPersona, setPersona},
  };
});

// eslint-disable-next-line import/first, import/order
import DiscoverableTogglePanel from '../../../../../components/Social/Encounters/shared/DiscoverableTogglePanel';
// eslint-disable-next-line import/first, import/order
import {bleEncounterApi} from '../../../../../services/socialApi';
// eslint-disable-next-line import/first, import/order
import {renderWithProviders} from '../../../../testHelpers';

// eslint-disable-next-line import/order
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
// eslint-disable-next-line import/order
import React from 'react';

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default mock implementations between tests.
  bleEncounterApi.getDiscoverable.mockImplementation(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          enabled: false,
          expires_at: null,
          remaining_sec: 0,
          toggle_count_24h: 0,
          age_claim_18: false,
          face_visible: false,
          avatar_style: 'studio_ghibli',
          vibe_tags: [],
        },
      },
    }),
  );
  bleEncounterApi.setDiscoverable.mockImplementation(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          enabled: true,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          remaining_sec: 3600,
        },
      },
    }),
  );
  bleEncounterApi.getPersona.mockImplementation(() =>
    Promise.resolve({data: {success: true, data: {interests_discoverable: false}}}),
  );
  bleEncounterApi.setPersona.mockImplementation(() =>
    Promise.resolve({data: {success: true, data: {interests_discoverable: true}}}),
  );
});

async function toggleOn() {
  fireEvent.click(screen.getByTestId('age-claim-checkbox'));
  const switchInput = screen.getByTestId('discoverable-switch');
  await waitFor(() => {
    expect(switchInput).not.toBeDisabled();
  });
  fireEvent.click(switchInput);
  await waitFor(() => {
    expect(bleEncounterApi.setDiscoverable).toHaveBeenCalledTimes(1);
  });
  return bleEncounterApi.setDiscoverable.mock.calls[0][0];
}

function loadedWith(data) {
  bleEncounterApi.getDiscoverable.mockImplementationOnce(() =>
    Promise.resolve({data: {success: true, data: {enabled: false, ...data}}}),
  );
}

describe('DiscoverableTogglePanel', () => {
  test('a) mount fetches discoverable state once', async () => {
    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalledTimes(1);
    });
  });

  test('b) Switch is disabled until age-claim checkbox is checked', async () => {
    renderWithProviders(<DiscoverableTogglePanel />);
    // Wait for initial fetch to settle.
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
    });

    const switchInput = screen.getByTestId('discoverable-switch');
    expect(switchInput).toBeDisabled();

    const checkbox = screen.getByTestId('age-claim-checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(switchInput).not.toBeDisabled();
    });
  });

  test('c) toggling on calls setDiscoverable with age_claim_18 and vibe_tags', async () => {
    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
    });

    // Add 2 vibe tags via Enter key.
    const vibeInput = screen.getByTestId('vibe-input');
    fireEvent.change(vibeInput, {target: {value: 'hiking'}});
    fireEvent.keyDown(vibeInput, {key: 'Enter'});
    fireEvent.change(vibeInput, {target: {value: 'coffee'}});
    fireEvent.keyDown(vibeInput, {key: 'Enter'});

    // Check 18+.
    fireEvent.click(screen.getByTestId('age-claim-checkbox'));

    // Toggle the Switch on.
    const switchInput = screen.getByTestId('discoverable-switch');
    await waitFor(() => {
      expect(switchInput).not.toBeDisabled();
    });
    fireEvent.click(switchInput);

    await waitFor(() => {
      expect(bleEncounterApi.setDiscoverable).toHaveBeenCalledTimes(1);
    });
    const callArgs = bleEncounterApi.setDiscoverable.mock.calls[0][0];
    expect(callArgs.enabled).toBe(true);
    expect(callArgs.age_claim_18).toBe(true);
    expect(callArgs.vibe_tags).toEqual(['hiking', 'coffee']);
    // Not edited here, so left to the server's stored value.
    expect(callArgs.avatar_style).toBeUndefined();
    expect(callArgs.face_visible).toBeUndefined();
  });

  test('c4) Backspace in the empty tag input removes the last tag and sends the edit', async () => {
    loadedWith({vibe_tags: ['chess', 'jazz']});
    renderWithProviders(<DiscoverableTogglePanel />);
    await screen.findByTestId('vibe-tag-jazz');
    fireEvent.keyDown(screen.getByTestId('vibe-input'), {key: 'Backspace'});
    await waitFor(() => {
      expect(screen.queryByTestId('vibe-tag-jazz')).toBeNull();
    });
    const args = await toggleOn();
    expect(args.vibe_tags).toEqual(['chess']);
  });

  test('c5) a toggle keeps stored face_visible / avatar_style unless edited here', async () => {
    loadedWith({face_visible: true, avatar_style: 'pixel'});
    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(screen.getByTestId('face-visible-switch')).toBeChecked();
    });
    const args = await toggleOn();
    expect(args.face_visible).toBeUndefined();
    expect(args.avatar_style).toBeUndefined();
  });

  test('c6) an edited face_visible is sent', async () => {
    loadedWith({face_visible: true});
    renderWithProviders(<DiscoverableTogglePanel />);
    const face = screen.getByTestId('face-visible-switch');
    await waitFor(() => {
      expect(face).toBeChecked();
    });
    fireEvent.click(face);
    const args = await toggleOn();
    expect(args.face_visible).toBe(false);
  });

  describe('share my interests switch', () => {
    test('s1) defaults OFF, and stays off when the card cannot be loaded', async () => {
      bleEncounterApi.getPersona.mockImplementationOnce(() =>
        Promise.reject(new Error('offline')),
      );
      renderWithProviders(<DiscoverableTogglePanel />);
      const share = screen.getByTestId('share-interests-switch');
      expect(share).not.toBeChecked();
      await waitFor(() => {
        expect(bleEncounterApi.getPersona).toHaveBeenCalled();
      });
      expect(share).not.toBeChecked();
      expect(bleEncounterApi.setPersona).not.toHaveBeenCalled();
    });

    test('s2) shows the saved yes', async () => {
      bleEncounterApi.getPersona.mockImplementationOnce(() =>
        Promise.resolve({data: {success: true, data: {interests_discoverable: true}}}),
      );
      renderWithProviders(<DiscoverableTogglePanel />);
      await waitFor(() => {
        expect(screen.getByTestId('share-interests-switch')).toBeChecked();
      });
    });

    test('s3) turning it on saves only interests_discoverable on the card', async () => {
      renderWithProviders(<DiscoverableTogglePanel />);
      const share = screen.getByTestId('share-interests-switch');
      await waitFor(() => {
        expect(share).not.toBeDisabled();
      });
      fireEvent.click(share);
      await waitFor(() => {
        expect(bleEncounterApi.setPersona).toHaveBeenCalledWith({
          interests_discoverable: true,
        });
      });
      await waitFor(() => {
        expect(share).toBeChecked();
      });
      // Not a discoverable toggle: spends no toggle.
      expect(bleEncounterApi.setDiscoverable).not.toHaveBeenCalled();
    });

    test('s3b) turning a saved yes off saves a no', async () => {
      bleEncounterApi.getPersona.mockImplementationOnce(() =>
        Promise.resolve({data: {success: true, data: {interests_discoverable: true}}}),
      );
      renderWithProviders(<DiscoverableTogglePanel />);
      const share = screen.getByTestId('share-interests-switch');
      await waitFor(() => {
        expect(share).toBeChecked();
      });
      fireEvent.click(share);
      await waitFor(() => {
        expect(bleEncounterApi.setPersona).toHaveBeenCalledWith({
          interests_discoverable: false,
        });
      });
      expect(share).not.toBeChecked();
    });

    test('s4) a failed save puts the switch back and says so', async () => {
      bleEncounterApi.setPersona.mockImplementationOnce(() =>
        Promise.reject(new Error('500')),
      );
      renderWithProviders(<DiscoverableTogglePanel />);
      const share = screen.getByTestId('share-interests-switch');
      await waitFor(() => {
        expect(share).not.toBeDisabled();
      });
      fireEvent.click(share);
      await waitFor(() => {
        expect(screen.getByTestId('discoverable-snackbar')).toBeInTheDocument();
      });
      expect(share).not.toBeChecked();
    });
  });

  test.each([
    ['the saved tags loaded', () =>
      Promise.resolve({
        data: {success: true, data: {enabled: false, vibe_tags: ['chess', 'jazz']}},
      })],
    ['the state fetch failed', () => Promise.reject(new Error('offline'))],
  ])(
    'c2) toggling without editing tags sends no vibe_tags (%s)',
    async (_label, getImpl) => {
      // The persona card also writes vibe_tags; a toggle that did not touch
      // them must not overwrite them (with [] after a failed fetch, or with
      // a stale copy after the card changed them).
      bleEncounterApi.getDiscoverable.mockImplementationOnce(getImpl);
      renderWithProviders(<DiscoverableTogglePanel />);
      await waitFor(() => {
        expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
      });
      fireEvent.click(screen.getByTestId('age-claim-checkbox'));
      const switchInput = screen.getByTestId('discoverable-switch');
      await waitFor(() => {
        expect(switchInput).not.toBeDisabled();
      });
      fireEvent.click(switchInput);
      await waitFor(() => {
        expect(bleEncounterApi.setDiscoverable).toHaveBeenCalledTimes(1);
      });
      const callArgs = bleEncounterApi.setDiscoverable.mock.calls[0][0];
      expect(callArgs.enabled).toBe(true);
      expect(callArgs.vibe_tags).toBeUndefined();
    },
  );

  test('c3) removing a loaded tag sends the edited list', async () => {
    bleEncounterApi.getDiscoverable.mockImplementationOnce(() =>
      Promise.resolve({
        data: {success: true, data: {enabled: false, vibe_tags: ['chess', 'jazz']}},
      }),
    );
    renderWithProviders(<DiscoverableTogglePanel />);
    const chip = await screen.findByTestId('vibe-tag-chess');
    // MUI Chip's delete icon is the chip's svg child.
    fireEvent.click(chip.querySelector('svg'));
    await waitFor(() => {
      expect(screen.queryByTestId('vibe-tag-chess')).toBeNull();
    });
    fireEvent.click(screen.getByTestId('age-claim-checkbox'));
    const switchInput = screen.getByTestId('discoverable-switch');
    await waitFor(() => {
      expect(switchInput).not.toBeDisabled();
    });
    fireEvent.click(switchInput);
    await waitFor(() => {
      expect(bleEncounterApi.setDiscoverable).toHaveBeenCalledTimes(1);
    });
    expect(bleEncounterApi.setDiscoverable.mock.calls[0][0].vibe_tags).toEqual([
      'jazz',
    ]);
  });

  test('d) 429 response surfaces Snackbar + locks Switch', async () => {
    bleEncounterApi.setDiscoverable.mockImplementationOnce(() => {
      const err = new Error('rate limited');
      err.response = {status: 429, data: {error: 'toggle limit reached'}};
      return Promise.reject(err);
    });

    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('age-claim-checkbox'));
    const switchInput = screen.getByTestId('discoverable-switch');
    await waitFor(() => {
      expect(switchInput).not.toBeDisabled();
    });
    fireEvent.click(switchInput);

    // Snackbar appears with the limit message.
    await waitFor(() => {
      expect(screen.getByTestId('discoverable-snackbar')).toBeInTheDocument();
    });
    expect(screen.getByTestId('discoverable-snackbar').textContent).toMatch(
      /toggle limit/i,
    );
    // Switch is now locked until next mount.
    await waitFor(() => {
      expect(switchInput).toBeDisabled();
    });
  });

  test('e) 403 response renders inline "Confirm 18+" hint', async () => {
    // Force the server to reject with 403 even though we lie that
    // age-claim was checked client-side.  In practice the inline hint
    // also shows when the user tries to enable WITHOUT the checkbox;
    // we verify the rendered hint here.
    bleEncounterApi.setDiscoverable.mockImplementationOnce(() => {
      const err = new Error('age claim required');
      err.response = {status: 403, data: {error: 'age_claim_18 required'}};
      return Promise.reject(err);
    });

    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
    });

    // Check 18+, then immediately toggle — server rejects.
    fireEvent.click(screen.getByTestId('age-claim-checkbox'));
    fireEvent.click(screen.getByTestId('discoverable-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('error-403')).toBeInTheDocument();
    });
    expect(screen.getByTestId('error-403').textContent).toMatch(
      /confirm 18\+/i,
    );
  });

  test('f) vibe-tags input enforces 10-tag cap', async () => {
    renderWithProviders(<DiscoverableTogglePanel />);
    await waitFor(() => {
      expect(bleEncounterApi.getDiscoverable).toHaveBeenCalled();
    });

    const input = screen.getByTestId('vibe-input');
    for (let i = 0; i < 12; i += 1) {
      fireEvent.change(input, {target: {value: `tag${i}`}});
      fireEvent.keyDown(input, {key: 'Enter'});
    }

    // Only 10 chips should be rendered.
    const chips = screen.getAllByText(/^tag\d+$/);
    expect(chips.length).toBe(10);
    // Input should now be disabled (max reached).
    expect(input).toBeDisabled();
  });

  test('g) TTL countdown chip ticks down with fake timers', async () => {
    jest.useFakeTimers();
    // Server returns enabled state with a future expires_at.
    const future = new Date(Date.now() + 120_000).toISOString(); // 2 min
    bleEncounterApi.getDiscoverable.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          success: true,
          data: {
            enabled: true,
            expires_at: future,
            remaining_sec: 120,
            toggle_count_24h: 1,
            age_claim_18: true,
            face_visible: false,
            avatar_style: 'studio_ghibli',
            vibe_tags: [],
          },
        },
      }),
    );

    renderWithProviders(<DiscoverableTogglePanel />);
    // Allow the initial state-fetch promise to resolve in fake-timer mode.
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Countdown is mounted.
    const chip = await screen.findByTestId('ttl-countdown');
    const initialText = chip.textContent || '';
    expect(initialText).toMatch(/Visible for/i);

    // Advance 30 seconds; the chip's interval tick should fire.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    const tickedText =
      screen.getByTestId('ttl-countdown').textContent || '';
    // The label should differ after 30s of countdown elapsed.
    // (Initial ~2m 0s -> after 30s it's ~1m 30s.)
    expect(tickedText).not.toEqual(initialText);

    jest.useRealTimers();
  });
});
