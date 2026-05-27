/**
 * GatewayQRDisplay — #225 regression coverage.
 *
 * Locks in the architecture decision: WhatsApp pairing must NOT
 * route through the Hevolve device-pair QRPairingDisplay.  Tests:
 *   1. Calls channelUserApi.gatewayQr(channelType) on mount (NOT
 *      generatePairCode).
 *   2. Renders the QR string returned by the gateway (real WhatsApp-
 *      Web format), NOT a hevolve:// URL.
 *   3. Switches to phone-code mode and requests the 8-char Baileys
 *      pairing code.
 *   4. Calls onPaired exactly once when the gateway reports
 *      authenticated.
 *   5. Surfaces a clear error when the gateway is unreachable.
 */
/* eslint-disable */
import React from 'react';
import {act, render, screen, fireEvent, waitFor} from '@testing-library/react';

// Mock qrcode.react — capture the QR string passed in so we can assert
// it's the WhatsApp-Web string, not hevolve://pair?code=…
jest.mock('qrcode.react', () => ({
  __esModule: true,
  QRCodeSVG: ({value}) => <div data-testid="qr-svg" data-value={value} />,
}));

const mockGatewayQr = jest.fn();
const mockGatewayPairCode = jest.fn();
const mockGeneratePairCode = jest.fn();  // must NEVER be called

jest.mock('../../../services/socialApi', () => ({
  channelUserApi: {
    gatewayQr: (...args) => mockGatewayQr(...args),
    gatewayPairCode: (...args) => mockGatewayPairCode(...args),
    generatePairCode: (...args) => mockGeneratePairCode(...args),
  },
}));

import GatewayQRDisplay from '../../../components/Channels/GatewayQRDisplay';


function _qrResp(overrides = {}) {
  return {
    data: {
      success: true,
      data: {
        qr: 'WHATSAPP-WEB-QR-STRING',
        authenticated: false,
        state: 'connecting',
        account_id: 'user_42',
        ...overrides,
      },
    },
  };
}


describe('GatewayQRDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGatewayQr.mockReset();
    mockGatewayPairCode.mockReset();
    mockGeneratePairCode.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls gatewayQr (NOT generatePairCode) for the specified channelType', async () => {
    mockGatewayQr.mockResolvedValue(_qrResp());
    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" />);
    });
    expect(mockGatewayQr).toHaveBeenCalledWith('whatsapp');
    // Regression: must not have called the Hevolve device-pair API
    // (that's what was wrong before #225 — wizard sent WhatsApp to
    // QRPairingDisplay which calls generatePairCode).
    expect(mockGeneratePairCode).not.toHaveBeenCalled();
  });

  it('renders the WhatsApp-Web QR string returned by the gateway, not a hevolve:// URL', async () => {
    mockGatewayQr.mockResolvedValue(_qrResp({qr: '2@abc123,xyz==,...'}));
    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" />);
    });
    const qr = await screen.findByTestId('qr-svg');
    expect(qr.getAttribute('data-value')).toBe('2@abc123,xyz==,...');
    expect(qr.getAttribute('data-value')).not.toMatch(/^hevolve:\/\//);
  });

  it('calls onPaired exactly once when the gateway reports authenticated', async () => {
    const onPaired = jest.fn();
    // First poll: not authenticated.  Second poll: authenticated.
    mockGatewayQr
      .mockResolvedValueOnce(_qrResp())
      .mockResolvedValueOnce(_qrResp({qr: null, authenticated: true, state: 'connected'}))
      .mockResolvedValue(_qrResp({qr: null, authenticated: true, state: 'connected'}));

    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" onPaired={onPaired} />);
    });
    // Advance past the poll interval (3s)
    await act(async () => { jest.advanceTimersByTime(3500); });
    await waitFor(() => expect(onPaired).toHaveBeenCalledTimes(1));
    expect(onPaired).toHaveBeenCalledWith(expect.objectContaining({
      account_id: 'user_42',
    }));
    // Even if the timer fires again, onPaired must not be called again
    await act(async () => { jest.advanceTimersByTime(3500); });
    expect(onPaired).toHaveBeenCalledTimes(1);
  });

  it('requests a Baileys pair code when in "Link with phone number" mode', async () => {
    mockGatewayQr.mockResolvedValue(_qrResp());
    mockGatewayPairCode.mockResolvedValue({
      data: {success: true, data: {code: 'ABCD1234', account_id: 'user_42'}},
    });
    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" />);
    });

    // Switch mode
    fireEvent.click(screen.getByText('Link with phone number'));

    // Enter phone, click button
    const input = screen.getByPlaceholderText(/\+91 90030/);
    fireEvent.change(input, {target: {value: '+91 90030 54371'}});
    await act(async () => {
      fireEvent.click(screen.getByText('Get pairing code'));
    });

    expect(mockGatewayPairCode).toHaveBeenCalledWith('whatsapp', {phone: '+91 90030 54371'});
    expect(screen.getByText('ABCD1234')).toBeInTheDocument();
  });

  it('shows an error when the gateway is unreachable', async () => {
    mockGatewayQr.mockRejectedValue({
      response: {data: {error: 'WhatsApp gateway unreachable'}},
    });
    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" />);
    });
    expect(await screen.findByText(/gateway unreachable/i)).toBeInTheDocument();
  });

  it('does not request a pair code without a phone number', async () => {
    mockGatewayQr.mockResolvedValue(_qrResp());
    await act(async () => {
      render(<GatewayQRDisplay channelType="whatsapp" />);
    });
    fireEvent.click(screen.getByText('Link with phone number'));
    await act(async () => {
      fireEvent.click(screen.getByText('Get pairing code'));
    });
    expect(mockGatewayPairCode).not.toHaveBeenCalled();
    // The error alert specifically (label also contains "E.164",
    // so match on the alert's distinguishing wording instead).
    expect(screen.getByText(/Enter your WhatsApp phone number/i)).toBeInTheDocument();
  });
});
