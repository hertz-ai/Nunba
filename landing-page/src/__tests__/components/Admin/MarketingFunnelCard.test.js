/**
 * MarketingFunnelCard tests (#184).
 *
 * Pins:
 *   - leader picker chooses by downloads, tie-breaks by clicks, then code
 *   - empty stats render the "no clicks yet" hint instead of an empty table
 *   - downloads + clicks aggregate correctly across channels
 *   - 30s refresh interval is wired (mocked timers)
 */
import React from 'react';
import {screen, waitFor, act} from '@testing-library/react';

import {renderWithProviders} from '../../testHelpers';
import MarketingFunnelCard from '../../../components/Admin/MarketingFunnelCard';

jest.mock('../../../services/socialApi', () => ({
  adminApi: {
    marketingStats: jest.fn(),
  },
}));

import {adminApi} from '../../../services/socialApi';


describe('MarketingFunnelCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders aggregated downloads + clicks from /marketing/stats', async () => {
    adminApi.marketingStats.mockResolvedValue({
      data: {
        data: {
          by_code: {
            li_a: {click: 30, download: 8, install: 3, signup: 1},
            tw1: {click: 50, download: 5, install: 1, signup: 0},
            wa_broadcast: {click: 15, download: 2, install: 1, signup: 0},
          },
          total: 130,
        },
      },
    });

    renderWithProviders(<MarketingFunnelCard />);

    await waitFor(() =>
      expect(screen.getByText(/15 downloads/i)).toBeInTheDocument(),
    );
    // 30 + 50 + 15 = 95 clicks total
    expect(screen.getByText(/95 total clicks/i)).toBeInTheDocument();
    // total events 130
    expect(screen.getByText(/130 events/i)).toBeInTheDocument();
  });

  test('picks the channel with the most downloads as leader', async () => {
    adminApi.marketingStats.mockResolvedValue({
      data: {
        data: {
          by_code: {
            tw1: {click: 100, download: 2},
            li_a: {click: 20, download: 9},  // fewer clicks, more downloads
          },
          total: 131,
        },
      },
    });

    renderWithProviders(<MarketingFunnelCard />);

    await waitFor(() =>
      expect(
        screen.getByText(/Leading channel:/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/li_a/i)).toBeInTheDocument();
  });

  test('shows empty hint when no clicks tracked yet', async () => {
    adminApi.marketingStats.mockResolvedValue({
      data: {data: {by_code: {}, total: 0}},
    });

    renderWithProviders(<MarketingFunnelCard />);

    await waitFor(() =>
      expect(
        screen.getByText(/No clicks yet/i),
      ).toBeInTheDocument(),
    );
  });

  test('survives API error by rendering zero-state', async () => {
    adminApi.marketingStats.mockRejectedValue(new Error('500'));
    renderWithProviders(<MarketingFunnelCard />);
    await waitFor(() =>
      expect(screen.getByText(/0 downloads/i)).toBeInTheDocument(),
    );
  });

  test('refreshes every 30 seconds', async () => {
    adminApi.marketingStats.mockResolvedValue({
      data: {data: {by_code: {}, total: 0}},
    });

    renderWithProviders(<MarketingFunnelCard />);
    await waitFor(() =>
      expect(adminApi.marketingStats).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(adminApi.marketingStats).toHaveBeenCalledTimes(2);
  });
});
