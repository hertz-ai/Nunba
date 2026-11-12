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
// Every card mount, so a test can tell a card kept from a card rebuilt.  The
// module's reducers stay real; only the card itself is replaced.
const mockMounts = [];
jest.mock('../../pages/chat/SetupProgressCard', () => {
  const ReactInMock = require('react');
  return {
    ...jest.requireActual('../../pages/chat/SetupProgressCard'),
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
import {pollBootstrapStatus} from '../../pages/chat/SetupProgressCard';
import {mergeRestoredMessages} from '../../utils/mergeRestoredMessages';

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

  // The key's two other parts: the job, for cards of two jobs stamped in the
  // same instant (the backfill stamps every unstamped message with one time),
  // and the place, for a card the backfill has not stamped yet.
  it('stay one per message when two jobs share a time or a card has none yet', () => {
    const at = '2026-11-11T09:00:05.000Z';
    const list = [
      {type: 'user', content: 'hello', timestamp: '2026-11-11T09:00:00.000Z'},
      card('tts', {dismissed: true}),
      card('tts', {timestamp: at}),
      card('llm', {timestamp: at}),
      card('vlm_caption', {timestamp: undefined}),
      card('vlm_caption', {timestamp: undefined}),
    ];
    const {rerender} = render(<ChatMessageList {...props} messages={list} />);
    for (let i = 0; i < 3; i += 1) {
      rerender(<ChatMessageList {...props} messages={[...list]} />);
    }
    expect(screen.getAllByTestId('setup-card')).toHaveLength(4);
  });
});

// Demopage's backfill effect: messages added without a time are stamped, all
// with one time, on the render after they appear (Demopage.js, "Backfill
// timestamp on any message added without one").
const backfill = (list) => {
  if (!list.some((m) => !m.timestamp)) return list;
  const now = new Date().toISOString();
  return list.map((m) => (m.timestamp ? m : {...m, timestamp: now}));
};

// /api/ai/bootstrap/status replies while the models download, then the end.
const bootstrapStatus = {
  phase: 'running',
  steps: {
    llm: {model_type: 'llm', model_name: 'Qwen3-4B', status: 'downloading', detail: '41%'},
    tts: {model_type: 'tts', model_name: 'Piper', status: 'pending'},
  },
};
const bootstrapDone = {
  phase: 'done',
  steps: {
    llm: {model_type: 'llm', model_name: 'Qwen3-4B', status: 'ready', detail: 'Running on gpu'},
    tts: {model_type: 'tts', model_name: 'Piper', status: 'ready', detail: 'Running on cpu'},
  },
};

// The chat list as Demopage drives it during Auto Setup: the poll's update
// renders, then the backfill renders.
function autoSetup(initial) {
  let messages = initial;
  const view = render(<ChatMessageList {...props} messages={messages} />);
  const show = (next) => {
    messages = next;
    view.rerender(<ChatMessageList {...props} messages={messages} />);
  };
  const poll = (replies) => {
    let n = 0;
    return pollBootstrapStatus({
      fetchStatus: async () => replies[Math.min(n++, replies.length - 1)],
      setMessages: (update) => { show(update(messages)); show(backfill(messages)); },
      wait: () => Promise.resolve(),
      onDone: () => {},
      onTimeout: () => {},
    });
  };
  return {poll, messages: () => messages, unmount: view.unmount};
}

describe('the setup card of a live chat', () => {
  // First-run Auto Setup polls once a second for up to 2 minutes; the card
  // must be the same card throughout (review of b6c45ee7: 10 mounts over 5
  // polls).  Driven through the poll Demopage runs.
  it('stays mounted while Auto Setup polls its status', async () => {
    const chat = autoSetup([{type: 'user', content: 'set up', timestamp: '2026-11-11T09:00:00.000Z'}]);
    const mountsBefore = mockMounts.length;
    await chat.poll([bootstrapStatus, bootstrapStatus, bootstrapStatus, bootstrapStatus, bootstrapStatus, bootstrapDone]);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(1);
    expect(mockMounts.length - mountsBefore).toBe(1);
  });

  // The card says Ready and dismisses itself 4 s later.  A later Auto Setup
  // run must show its card again (review of 526ce3fd: 0 cards on screen).
  it('shows again for a second Auto Setup run after it dismissed itself', async () => {
    const chat = autoSetup([{type: 'user', content: 'set up', timestamp: '2026-11-11T09:00:00.000Z'}]);
    await chat.poll([bootstrapStatus, bootstrapDone]);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(1);
    // SetupProgressCard's own 4 s dismiss, as Demopage's onDismiss marks it.
    const dismissed = chat.messages().map((m) => (m.type === 'setup_progress' ? {...m, dismissed: true} : m));
    chat.unmount();
    const again = autoSetup(dismissed);
    expect(screen.queryAllByTestId('setup-card')).toHaveLength(0);
    await again.poll([bootstrapStatus, bootstrapStatus, bootstrapDone]);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(1);
  });

  // A sign-in or sign-out reloads the agents and merges the stored chat back
  // (Demopage.js, mergeRestoredMessages).  The stored copy, whose times are
  // ISO strings, replaces the live one, whose times are Dates.
  it('keeps its key when the stored chat is merged back over it', () => {
    const live = [
      {type: 'user', content: 'hello', timestamp: new Date(Date.UTC(2026, 10, 11, 9, 0, 0))},
      {type: 'setup_progress', jobType: 'tts', steps: [], isComplete: false,
        handshake: {status: 'pending'}, timestamp: new Date(Date.UTC(2026, 10, 11, 9, 0, 1, 250))},
    ];
    const {rerender} = render(<ChatMessageList {...props} messages={live} />);
    const mountsBefore = mockMounts.length;
    const stored = JSON.parse(JSON.stringify(live));
    rerender(<ChatMessageList {...props} messages={mergeRestoredMessages(stored, live)} />);
    expect(screen.getAllByTestId('setup-card')).toHaveLength(1);
    expect(mockMounts.length).toBe(mountsBefore);
  });
});
