/* eslint-disable */
/**
 * A chat restored with several setup cards of one job keeps one card per
 * message on the page, however often the list renders.
 *
 * Measured 2026-11-10 on the owner's stored chats: one conversation held 18
 * setup cards for the job 'tts' (one more per session), and each card was
 * keyed `setup-<jobType>`.  Two children with one key made React add the
 * cards to the page again on every render: 27 cards in state, 521 on the page
 * after two minutes, and the page kept growing under the reader while they
 * scrolled.  A dismissed card (rendered as nothing) earlier in the list is
 * what sends React down the keyed path where the copies pile up.
 */
import React from 'react';
import {render, screen} from '@testing-library/react';

jest.mock('lottie-react', () => ({__esModule: true, default: () => null}));
jest.mock('../../assets/hourglass-lottie.json', () => ({}), {virtual: true});
jest.mock('../../pages/chat/TypeWriterSubtitle', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/ThinkingProcessContainer', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/WorkflowFlowchart', () => ({__esModule: true, default: () => null}));
// Every card mount, so a test can tell a card kept from a card rebuilt.
const mockMounts = [];
jest.mock('../../pages/chat/SetupProgressCard', () => {
  const ReactInMock = require('react');
  return {
    __esModule: true,
    default: ({jobType, firstSeen}) => {
      ReactInMock.useEffect(() => {
        mockMounts.push(`${jobType}@${firstSeen}`);
      }, []);
      return <div data-testid="setup-card">{jobType}</div>;
    },
  };
});
jest.mock('lucide-react', () => ({FileText: () => null}));
jest.mock('markdown-to-jsx', () => ({__esModule: true, default: ({children}) => <div>{children}</div>}));

// AgentOverlay's own imports, mocked as ChatMessageListAgentUi.test.js does.
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

// Each card carries its own creation timestamp, as every one of the 139
// cards in the owner's stored chats does (no two alike within a job).
let stamp = 0;
const card = (jobType, extra = {}) => ({
  type: 'setup_progress', jobType, steps: [], isComplete: true,
  handshake: {status: 'pending'},
  timestamp: `2026-11-04T07:52:${String(10 + stamp++).padStart(2, '0')}.759Z`,
  ...extra,
});

// The shape of the owner's stored chat: a dismissed card first, then one job
// repeated, then another job.
const restored = [
  {type: 'user', content: 'hello', timestamp: '2026-11-04T07:50:00.000Z'},
  card('tts', {dismissed: true}),
  card('tts'),
  card('tts'),
  card('tts'),
  card('llm'),
];

describe('setup cards restored from an old chat', () => {
  it('stay one card per message across renders', () => {
    const {rerender} = render(<ChatMessageList {...props} messages={restored} />);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(4);
    for (let i = 0; i < 3; i += 1) {
      rerender(<ChatMessageList {...props} messages={[...restored]} />);
    }
    expect(screen.getAllByTestId('setup-card')).toHaveLength(4);
  });

  // A card keyed by its place in the list is rebuilt whenever a message
  // above it goes away, which replays its fade and restarts its auto-dismiss.
  it('stay mounted when a message above them is deleted', () => {
    const {rerender} = render(<ChatMessageList {...props} messages={restored} />);
    const mountsBefore = mockMounts.length;
    rerender(<ChatMessageList {...props} messages={restored.slice(1)} />);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(4);
    expect(mockMounts.length).toBe(mountsBefore);
  });
});
