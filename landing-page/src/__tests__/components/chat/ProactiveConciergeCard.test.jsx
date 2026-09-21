import ProactiveConciergeCard from '../../../components/chat/ProactiveConciergeCard';

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock VoiceVisualizer since jsdom has no real AudioContext / canvas
jest.mock('../../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: ({ isActive }) => <div data-testid="viz" data-active={isActive ? '1' : '0'} />,
}));

describe('ProactiveConciergeCard — Privacy by Design speech consent gate', () => {
  test('renders proactive greeting and privacy disclosure upon landing', () => {
    render(<ProactiveConciergeCard onConsent={jest.fn()} guestName="Sathi" />);

    expect(screen.getByTestId('proactive-concierge-card')).toBeInTheDocument();
    expect(screen.getByText(/Proactive Concierge · Privacy by Design/i)).toBeInTheDocument();
    expect(screen.getByText(/May I speak with you\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome @Sathi!/i)).toBeInTheDocument();
    expect(screen.getByTestId('viz')).toBeInTheDocument();
    expect(screen.getByTestId('concierge-consent-speak')).toBeInTheDocument();
    expect(screen.getByTestId('concierge-consent-quiet')).toBeInTheDocument();
  });

  test('clicking "Yes, Speak Aloud" calls onConsent(true)', () => {
    const onConsent = jest.fn();
    render(<ProactiveConciergeCard onConsent={onConsent} />);

    const speakBtn = screen.getByTestId('concierge-consent-speak');
    fireEvent.click(speakBtn);

    expect(onConsent).toHaveBeenCalledTimes(1);
    expect(onConsent).toHaveBeenCalledWith(true);
  });

  test('clicking "Keep Quiet (Text Only)" calls onConsent(false)', () => {
    const onConsent = jest.fn();
    render(<ProactiveConciergeCard onConsent={onConsent} />);

    const quietBtn = screen.getByTestId('concierge-consent-quiet');
    fireEvent.click(quietBtn);

    expect(onConsent).toHaveBeenCalledTimes(1);
    expect(onConsent).toHaveBeenCalledWith(false);
  });
});
