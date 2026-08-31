/* eslint-disable */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';

// Mock child components and assets
jest.mock('lottie-react', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => <div data-testid="lottie-animation" />,
  };
});

jest.mock('../../assets/hourglass-lottie.json', () => ({}), {virtual: true});

jest.mock('../../pages/chat/TypeWriterSubtitle', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({text}) => <span data-testid="typewriter">{text}</span>,
  };
});

jest.mock('../../pages/chat/ThinkingProcessContainer', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => (
      <div data-testid="thinking-container">
        {props.isContainerCompleted ? 'completed' : 'in-progress'}
      </div>
    ),
  };
});

jest.mock('../../pages/chat/WorkflowFlowchart', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({recipe}) => (
      <div data-testid="workflow-flowchart">{recipe.name}</div>
    ),
  };
});

jest.mock('../../pages/chat/SetupProgressCard', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({jobType}) => (
      <div data-testid="setup-progress">{jobType}</div>
    ),
  };
});

jest.mock('lucide-react', () => ({
  FileText: (props) => <svg data-testid="file-text-icon" {...props} />,
}));

// markdown-to-jsx@9.7.16 ships a CJS bundle (dist/index.cjs) that does
// `require('markdown-to-jsx/entities')` — a self-referential subpath
// that Jest's resolver can't follow without exports-field support.
// Mocking the public surface bypasses the CJS resolution path entirely.
jest.mock('markdown-to-jsx', () => {
  const React = require('react');
  // Record every parse (one push per render of the <Markdown> element) so the
  // PERF-6 memoization test can assert an unchanged bubble is NOT re-parsed.
  const Mock = ({children}) => {
    Mock.calls.push(children);
    return <div data-testid="markdown">{children}</div>;
  };
  Mock.calls = [];
  return {
    __esModule: true,
    default: Mock,
  };
});

import ChatMessageList from '../../pages/chat/ChatMessageList';

const defaultProps = {
  messages: [],
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
  onExecutePlan: jest.fn(),
  onSetupLlm: jest.fn(),
  onConfigureLlm: jest.fn(),
};

function renderList(overrides = {}) {
  return render(<ChatMessageList {...defaultProps} {...overrides} />);
}

describe('ChatMessageList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('renders empty list without crashing', () => {
    const {container} = renderList();
    expect(container.querySelector('.w-full')).toBeInTheDocument();
  });

  it('does not show loading indicator when not in flight', () => {
    renderList();
    expect(screen.queryByTestId('lottie-animation')).not.toBeInTheDocument();
  });

  // ── User vs assistant messages ───────────────────────────────────────────

  it('renders user message with yellow background', () => {
    const {container} = renderList({
      messages: [{type: 'user', content: 'Hello'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({backgroundColor: '#EFEAAA'});
  });

  it('renders user message with black text', () => {
    const {container} = renderList({
      messages: [{type: 'user', content: 'Hello'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({color: '#000000'});
  });

  it('renders assistant message with dark background', () => {
    const {container} = renderList({
      messages: [{type: 'assistant', content: 'Hi there'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({backgroundColor: '#212A31'});
  });

  it('renders assistant message with white text', () => {
    const {container} = renderList({
      messages: [{type: 'assistant', content: 'Hi there'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({color: '#FFFFFF'});
  });

  it('applies slide-in-right animation for user messages', () => {
    const {container} = renderList({
      messages: [{type: 'user', content: 'Test'}],
    });
    const bubble = container.querySelector('.animate-slide-in-right');
    expect(bubble).toBeInTheDocument();
  });

  it('applies slide-in-left animation for assistant messages', () => {
    const {container} = renderList({
      messages: [{type: 'assistant', content: 'Reply'}],
    });
    const bubble = container.querySelector('.animate-slide-in-left');
    expect(bubble).toBeInTheDocument();
  });

  // ── maxWidth constraint on bubbles ───────────────────────────────────────
  //
  // Bubble maxWidth widened from 75% to 100% when the chat container
  // migrated to its own flex column that already constrains the horizontal
  // band (container-level layout does the 75% now, bubbles fill it fully).
  // Tests reflect the new layout — assert 100% so a future revert to
  // bubble-level 75% would trip this gate.

  it('applies maxWidth 100% on user message bubble', () => {
    const {container} = renderList({
      messages: [{type: 'user', content: 'Test'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({maxWidth: '100%'});
  });

  it('applies maxWidth 100% on assistant message bubble', () => {
    const {container} = renderList({
      messages: [{type: 'assistant', content: 'Reply'}],
    });
    const bubble = container.querySelector('.rounded-lg.p-6');
    expect(bubble).toHaveStyle({maxWidth: '100%'});
  });

  // ── thinking_container type ──────────────────────────────────────────────

  it('renders ThinkingProcessContainer for thinking_container type', () => {
    renderList({
      messages: [
        {
          type: 'thinking_container',
          id: 'tc-1',
          thinkingSteps: [],
          isMainExpanded: false,
          isCompleted: false,
        },
      ],
    });
    expect(screen.getByTestId('thinking-container')).toBeInTheDocument();
  });

  it('passes isCompleted to ThinkingProcessContainer', () => {
    renderList({
      messages: [
        {
          type: 'thinking_container',
          id: 'tc-2',
          thinkingSteps: [],
          isMainExpanded: false,
          isCompleted: true,
        },
      ],
    });
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  // ── LLM setup card ──────────────────────────────────────────────────────

  it('renders LLM setup card', () => {
    renderList({
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'Llama-3',
            size_mb: 4096,
            description: 'A great model',
            gpu_mode: 'GPU',
          },
        },
      ],
    });
    expect(screen.getByText('Local LLM Setup')).toBeInTheDocument();
    expect(screen.getByText('Llama-3')).toBeInTheDocument();
  });

  it('formats size in GB when >= 1024 MB', () => {
    renderList({
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'M1',
            size_mb: 2048,
            description: 'desc',
            gpu_mode: 'CPU',
          },
        },
      ],
    });
    expect(screen.getByText('2.0 GB')).toBeInTheDocument();
  });

  it('formats size in MB when < 1024 MB', () => {
    renderList({
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'M2',
            size_mb: 512,
            description: 'desc',
            gpu_mode: 'CPU',
          },
        },
      ],
    });
    expect(screen.getByText('512 MB')).toBeInTheDocument();
  });

  it('shows GPU badge for GPU mode', () => {
    renderList({
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'M3',
            size_mb: 100,
            description: 'desc',
            gpu_mode: 'GPU',
          },
        },
      ],
    });
    expect(screen.getByText('GPU')).toBeInTheDocument();
  });

  it('calls onSetupLlm when Auto Setup is clicked', () => {
    const onSetupLlm = jest.fn();
    renderList({
      onSetupLlm,
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'M4',
            size_mb: 100,
            description: 'desc',
            gpu_mode: 'GPU',
          },
        },
      ],
    });
    fireEvent.click(screen.getByText('Auto Setup'));
    expect(onSetupLlm).toHaveBeenCalledTimes(1);
  });

  it('disables Auto Setup button when request in flight', () => {
    renderList({
      isRequestInFlight: true,
      messages: [
        {
          type: 'llm_setup_card',
          setupCard: {
            model_name: 'M5',
            size_mb: 100,
            description: 'desc',
            gpu_mode: 'GPU',
          },
        },
      ],
    });
    expect(screen.getByText('Setting up...')).toBeDisabled();
  });

  // ── Plan card ────────────────────────────────────────────────────────────

  it('renders plan card with steps', () => {
    renderList({
      messages: [
        {
          type: 'plan_card',
          plan: {
            steps: [
              {step_num: 1, description: 'Step one'},
              {step_num: 2, description: 'Step two'},
            ],
          },
        },
      ],
    });
    expect(screen.getByText('Proposed Plan')).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByText('Step two')).toBeInTheDocument();
  });

  it('shows "Agent matched" badge when matched_agent_id is present', () => {
    renderList({
      messages: [
        {
          type: 'plan_card',
          plan: {matched_agent_id: 'agent-1', steps: []},
        },
      ],
    });
    expect(screen.getByText('Agent matched')).toBeInTheDocument();
  });

  it('shows "New agent needed" badge when requires_new_agent is true', () => {
    renderList({
      messages: [
        {
          type: 'plan_card',
          plan: {requires_new_agent: true, steps: []},
        },
      ],
    });
    expect(screen.getByText('New agent needed')).toBeInTheDocument();
  });

  it('calls onExecutePlan when Execute Plan is clicked', () => {
    const onExecutePlan = jest.fn();
    renderList({
      onExecutePlan,
      messages: [
        {
          type: 'plan_card',
          prompt_id: 'p1',
          plan: {steps: [{step_num: 1, description: 'Go'}]},
        },
      ],
    });
    fireEvent.click(screen.getByText('Execute Plan'));
    expect(onExecutePlan).toHaveBeenCalledTimes(1);
  });

  // ── Message status indicators ────────────────────────────────────────────

  it('shows Retry and Delete for failed messages', () => {
    renderList({
      messages: [
        {
          type: 'user',
          content: 'Oops',
          status: 'failed',
          error: 'Network error',
          messageId: 'msg-1',
        },
      ],
    });
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onRetryMessage on Retry click', () => {
    const onRetryMessage = jest.fn();
    renderList({
      onRetryMessage,
      messages: [
        {
          type: 'user',
          content: 'Oops',
          status: 'failed',
          error: 'err',
          messageId: 'msg-2',
        },
      ],
    });
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetryMessage).toHaveBeenCalledWith('msg-2');
  });

  it('shows Cancel for retrying messages', () => {
    renderList({
      messages: [
        {
          type: 'user',
          content: 'Wait',
          status: 'retrying',
          error: 'Retrying...',
          messageId: 'msg-3',
        },
      ],
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not show status indicator for sent messages', () => {
    renderList({
      messages: [
        {type: 'user', content: 'Done', status: 'sent', messageId: 'msg-4'},
      ],
    });
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  // ── Loading indicator (sending dots) ─────────────────────────────────────

  it('shows loading animation when request in flight and no thinking id', () => {
    renderList({isRequestInFlight: true, currentThinkingId: null});
    expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
  });

  it('keeps the loading animation visible even when a thinking id is active', () => {
    // Owner-confirmed 2026-08: the in-flight loading indicator always
    // animates while a request is pending, regardless of any active
    // thinking id — the thinking container and the loading row coexist.
    renderList({isRequestInFlight: true, currentThinkingId: 'tc-active'});
    expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
  });

  // ── System messages ──────────────────────────────────────────────────────

  it('renders system message with italic style', () => {
    const {container} = renderList({
      messages: [{type: 'system', content: 'System notice'}],
    });
    const systemDiv = container.querySelector('.italic');
    expect(systemDiv).toBeInTheDocument();
    expect(systemDiv).toHaveTextContent('System notice');
  });

  // ── Code button ──────────────────────────────────────────────────────────

  it('shows code button when message has code', () => {
    const setCodeContent = jest.fn();
    renderList({
      setCodeContent,
      messages: [{type: 'assistant', content: 'Here is code', code: 'print("hi")'}],
    });
    fireEvent.click(screen.getByText('Show Code'));
    expect(setCodeContent).toHaveBeenCalledWith('print("hi")');
  });

  // ── Intelligence source badge ────────────────────────────────────────────

  it('shows Local badge for local source', () => {
    renderList({
      messages: [{type: 'assistant', content: 'Answer', source: 'local_llm'}],
    });
    // Badge relabelled in d872d612: local served_by -> "🔒 On-device"
    // (formatTier, utils/tier.js). Emoji + label share one span, so a
    // substring matcher is used instead of an exact-text match.
    expect(screen.getByText(/On-device/)).toBeInTheDocument();
  });

  it('shows Hive badge for non-local source', () => {
    renderList({
      messages: [{type: 'assistant', content: 'Answer', source: 'hive_gpt'}],
    });
    // "🐝 Hive" — emoji + label in one span (see note above).
    expect(screen.getByText(/Hive/)).toBeInTheDocument();
  });

  // ── PERF-6: assistant Markdown memoization ───────────────────────────────
  //
  // markdown-to-jsx re-parses the content string on every render, and Demopage
  // re-renders this whole list on every SSE token.  An unchanged (prior)
  // assistant bubble must NOT re-parse when only the streaming bubble grows.
  // AssistantMarkdown (React.memo on `content`) guarantees that.

  it('does not re-parse an unchanged assistant bubble when another message changes', () => {
    const Markdown = require('markdown-to-jsx').default;
    Markdown.calls.length = 0;
    const {rerender} = render(
      <ChatMessageList
        {...defaultProps}
        messages={[
          {type: 'assistant', content: 'AAA'},
          {type: 'assistant', content: 'BBB'},
        ]}
      />
    );
    expect(Markdown.calls.filter((c) => c === 'AAA')).toHaveLength(1);
    expect(Markdown.calls.filter((c) => c === 'BBB')).toHaveLength(1);

    // Simulate a streaming token: ONLY the last bubble's content changes.
    rerender(
      <ChatMessageList
        {...defaultProps}
        messages={[
          {type: 'assistant', content: 'AAA'},
          {type: 'assistant', content: 'BBB more'},
        ]}
      />
    );
    // The unchanged 'AAA' bubble was memoized — NOT re-parsed on the rerender.
    expect(Markdown.calls.filter((c) => c === 'AAA')).toHaveLength(1);
    // Only the changed bubble re-parsed.
    expect(Markdown.calls.filter((c) => c === 'BBB more')).toHaveLength(1);
  });
});
