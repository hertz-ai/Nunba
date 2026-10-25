/* eslint-disable */
/**
 * An agent card in the chat shows the card, not an empty bubble.
 *
 * AgentOverlay forwards product_card / cart / checkout / comparison cards to
 * the chat (AgentOverlay.jsx handleEvent -> onInlineChatCard), and Demopage
 * appends each as {type: 'agent_ui', component}.  ChatMessageList had no
 * branch for that type, so the row fell through to the text bubble, which
 * draws only user / assistant / system text: an empty dark box in the
 * transcript.  The card is drawn by OverlayContent, the overlay's own
 * renderer, so the chat and the overlay show the same card.
 */
import React from 'react';
import {render, screen} from '@testing-library/react';

jest.mock('lottie-react', () => ({__esModule: true, default: () => null}));
jest.mock('../../assets/hourglass-lottie.json', () => ({}), {virtual: true});
jest.mock('../../pages/chat/TypeWriterSubtitle', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/ThinkingProcessContainer', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/WorkflowFlowchart', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/SetupProgressCard', () => ({__esModule: true, default: () => null}));
jest.mock('lucide-react', () => ({FileText: () => null}));
jest.mock('markdown-to-jsx', () => ({__esModule: true, default: ({children}) => <div>{children}</div>}));

// AgentOverlay's own imports, mocked as its tests mock them
// (AgentOverlayNotificationActions.test.js): no realtime transport, no API
// clients built at import.
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  agentFormApi: {submit: jest.fn()},
  chatApi: {vaultStore: jest.fn()},
  consentApi: {grant: jest.fn(), decline: jest.fn()},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
}));

import ChatMessageList from '../../pages/chat/ChatMessageList';

const props = {
  setMessages: jest.fn(),
  isRequestInFlight: false,
  currentThinkingId: null,
  animatingMessageIndex: -1,
  duration: 0,
  isTextMode: true,
  videoUrl: '',
  idleVideoUrl: 'idle.mp4',
  progress: 0,
  messagesEndRef: {current: null},
  onPdfClick: jest.fn(),
  onImageClick: jest.fn(),
  onImgError: jest.fn(),
  onRetryMessage: jest.fn(),
  onDeleteMessage: jest.fn(),
  setCodeContent: jest.fn(),
};

// The row Demopage's onInlineChatCard appends.
const agentRow = (component) => ({
  type: 'agent_ui', component, timestamp: new Date(), sender: 'agent',
});

describe('an agent card in the chat', () => {
  it('shows a cart card with its items and total', () => {
    render(<ChatMessageList {...props} messages={[agentRow({
      type: 'cart', items: [{name: 'Toor dal 1kg', qty: 2, price: 180}],
      total: 360, currency: 'INR', checkout_action: '/checkout',
    })]} />);
    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText(/Toor dal 1kg/)).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('shows a product card with its name and buy button', () => {
    render(<ChatMessageList {...props} messages={[agentRow({
      type: 'product_card', name: 'Basmati rice 5kg', price: 640, currency: 'INR',
      buy_action: 'https://shop.example/buy/1',
    })]} />);
    expect(screen.getByText('Basmati rice 5kg')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Buy'})).toBeInTheDocument();
  });

  it('shows a comparison card with each option and the winner', () => {
    render(<ChatMessageList {...props} messages={[agentRow({
      type: 'comparison', apps: [{name: 'Store A', rating: 4}, {name: 'Store B', rating: 4.5}],
      winner: 'Store B',
    })]} />);
    expect(screen.getByText('Comparison')).toBeInTheDocument();
    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.getByText('Winner: Store B')).toBeInTheDocument();
  });

  // Demopage appends one media row per item an agent's message carries
  // (AgentOverlay mediaCards): the picture, clip or page shows in the chat
  // under the agent's words.
  it("shows an agent's picture and page in the chat", () => {
    const {container} = render(<ChatMessageList {...props} messages={[
      agentRow({type: 'media', media_type: 'image', src: '/uploads/agent/cat.png', alt: 'a cat'}),
      agentRow({type: 'media', media_type: 'html', src: '/uploads/agent/page.html', alt: 'a chart'}),
    ]} />);
    expect(screen.getByAltText('a cat').getAttribute('src')).toBe('/uploads/agent/cat.png');
    expect(container.querySelector('iframe[src="/uploads/agent/page.html"]')).not.toBeNull();
  });

  it('shows a checkout card with its count and total', () => {
    render(<ChatMessageList {...props} messages={[agentRow({
      type: 'checkout', items_count: 3, total: 360, currency: 'INR',
    })]} />);
    expect(screen.getByRole('button', {name: 'Confirm Payment'})).toBeInTheDocument();
    expect(screen.getByText(/3 items/)).toBeInTheDocument();
  });
});
