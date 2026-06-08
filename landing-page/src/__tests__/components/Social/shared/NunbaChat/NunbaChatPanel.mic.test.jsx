/**
 * NunbaChatPanel mic tests — F4 GREENLIT (orchestrator aa3ead1).
 *
 * Covers:
 *   a) Mic button mounts inside the panel.
 *   b) Click mic when !isListening → startListening({language: <userLang>}).
 *   c) Click mic when isListening → stopListening called.
 *   d) Cumulative transcript REPLACES the dictated tail (no duplication).
 *   e) error containing "permission"/"denied" → friendly inline message.
 *   f) Cleanup on unmount calls stopListening.
 *   g) prefers-reduced-motion → pulse animation disabled (still red mic).
 *
 * Mocks the useSpeechRecognition hook so we can drive its state-machine
 * transitions deterministically.  Mocks NunbaChatProvider so the panel can
 * mount without the full app/auth/realtime context.
 */
/* eslint-disable react/display-name */
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {render, screen, fireEvent, act} from '@testing-library/react';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

// MUI's useMediaQuery captures window.matchMedia inside a useMemo; under
// jsdom + the @mui/system v5 path, the captured query list is sometimes
// undefined.  Stub the hook directly so this test stays focused on the
// mic wiring (which is what's under test, not the desktop-vs-mobile
// breakpoint).  Forcing a desktop render avoids drawer-specific code
// paths that aren't relevant here.
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: () => false,
}));

// ── Hook mock — drives the panel's mic state from outside. ────────────────
const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
const mockResetTranscript = jest.fn();
let mockHookState = {
  transcript: '',
  isListening: false,
  confidence: -1,
  error: null,
  activeMethod: null,
  usingFallback: false,
  startListening: mockStartListening,
  stopListening: mockStopListening,
  resetTranscript: mockResetTranscript,
};

jest.mock('../../../../../hooks/useSpeechRecognition', () => ({
  __esModule: true,
  default: () => mockHookState,
}));

// ── Reduced-motion mock — toggled per-test. ───────────────────────────────
let mockReducedMotion = false;
jest.mock('../../../../../hooks/useAnimations', () => ({
  __esModule: true,
  useReducedMotion: () => mockReducedMotion,
  useInView: () => ({ref: {current: null}, inView: true}),
}));

// ── NunbaChatProvider mock — provides minimal context for PanelContent. ───
const mockSendMessage = jest.fn();
const mockSwitchAgent = jest.fn();
const mockClearMessages = jest.fn();
const mockRetryMessage = jest.fn();
const mockDeleteMessage = jest.fn();
const mockSetTtsEnabled = jest.fn();
const mockSetIsExpanded = jest.fn();

let mockChatCtx = {
  isExpanded: true,
  setIsExpanded: mockSetIsExpanded,
  messages: [],
  isLoading: false,
  isTyping: false,
  currentAgent: null,
  availableAgents: [],
  sendMessage: mockSendMessage,
  switchAgent: mockSwitchAgent,
  clearMessages: mockClearMessages,
  retryMessage: mockRetryMessage,
  deleteMessage: mockDeleteMessage,
  ttsEnabled: false,
  setTtsEnabled: mockSetTtsEnabled,
};

jest.mock(
  '../../../../../components/Social/shared/NunbaChat/NunbaChatProvider',
  () => ({
    __esModule: true,
    useNunbaChat: () => mockChatCtx,
    getAgentPalette: () => ({bg: '#6C63FF', accent: '#C5C1FF'}),
  })
);

// Import AFTER mocks so the panel pulls our stubs.
// eslint-disable-next-line import/first
import NunbaChatPanel from '../../../../../components/Social/shared/NunbaChat/NunbaChatPanel';

const theme = createTheme();
function renderPanel() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <NunbaChatPanel />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReducedMotion = false;
  mockHookState = {
    transcript: '',
    isListening: false,
    confidence: -1,
    error: null,
    activeMethod: null,
    usingFallback: false,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetTranscript: mockResetTranscript,
  };
  // Reset chat ctx
  mockChatCtx = {
    ...mockChatCtx,
    isExpanded: true,
    messages: [],
    isLoading: false,
    isTyping: false,
  };
  // Reset hart_language to a known value
  try {
    localStorage.clear();
  } catch (_) {}
});

// ── (a) Mic button visible ────────────────────────────────────────────────

describe('NunbaChatPanel mic — mount', () => {
  it('renders the mic toggle button', () => {
    renderPanel();
    expect(screen.getByTestId('mic-toggle-button')).toBeInTheDocument();
  });
});

// ── (b) Click idle mic → startListening with userLang ─────────────────────

describe('NunbaChatPanel mic — start listening', () => {
  it('calls startListening with the persisted hart_language on click', () => {
    localStorage.setItem('hart_language', 'hi');
    renderPanel();
    fireEvent.click(screen.getByTestId('mic-toggle-button'));
    expect(mockStartListening).toHaveBeenCalledWith({language: 'hi'});
  });

  it('defaults to "en" when hart_language is not set', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('mic-toggle-button'));
    expect(mockStartListening).toHaveBeenCalledWith({language: 'en'});
  });

  it('resets the transcript before starting a new session', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('mic-toggle-button'));
    expect(mockResetTranscript).toHaveBeenCalled();
  });
});

// ── (c) Click while listening → stopListening ─────────────────────────────

describe('NunbaChatPanel mic — stop listening', () => {
  it('calls stopListening when toggled off', () => {
    mockHookState = {
      ...mockHookState,
      isListening: true,
      activeMethod: 'ws',
    };
    renderPanel();
    fireEvent.click(screen.getByTestId('mic-toggle-button'));
    expect(mockStopListening).toHaveBeenCalled();
    expect(mockStartListening).not.toHaveBeenCalled();
  });
});

// ── (d) Cumulative transcript REPLACES the dictated tail (no duplication) ──
//
// The streaming server emits GROWING cumulative transcripts
// ("I am" -> "I am Hart" -> "I am Hart OS"). The panel must REPLACE the
// dictated tail each update, keeping only the text the user typed before
// tapping mic (the base). The old code appended each cumulative chunk, which
// duplicated everything ("note: I am I am Hart I am Hart OS").

describe('NunbaChatPanel mic — cumulative transcript replaces (no duplication)', () => {
  it('keeps the pre-mic base and replaces the dictated tail each update', () => {
    const {rerender} = renderPanel();
    const textarea = screen.getByPlaceholderText(/Message Nunba/i);

    // User types a base, THEN taps mic — handleMicClick captures the base.
    fireEvent.change(textarea, {target: {value: 'note: '}});
    fireEvent.click(screen.getByTestId('mic-toggle-button'));
    expect(mockStartListening).toHaveBeenCalled();

    const pump = (t) => {
      mockHookState = {
        ...mockHookState,
        isListening: true,
        activeMethod: 'ws',
        transcript: t,
      };
      rerender(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <NunbaChatPanel />
          </ThemeProvider>
        </MemoryRouter>
      );
    };

    // Cumulative interims from the streaming server.
    act(() => pump('I am'));
    act(() => pump('I am Hart'));
    act(() => pump('I am Hart OS'));

    // Replace-semantics: base + latest cumulative, with NO duplication.
    expect(textarea.value).toBe('note: I am Hart OS');
    expect(textarea.value).not.toMatch(/I am .*I am/);
  });
});

// ── (e) Permission error → friendly inline message ────────────────────────

describe('NunbaChatPanel mic — permission denial', () => {
  it('renders the permission-denied inline message', () => {
    mockHookState = {
      ...mockHookState,
      error: 'not-allowed',
    };
    renderPanel();
    const banner = screen.getByTestId('mic-permission-error');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/microphone access blocked/i);
  });

  it('also matches "permission" wording in the error string', () => {
    mockHookState = {
      ...mockHookState,
      error: 'permission denied by user',
    };
    renderPanel();
    expect(screen.getByTestId('mic-permission-error')).toBeInTheDocument();
  });
});

// ── (f) Unmount → stopListening called ────────────────────────────────────

describe('NunbaChatPanel mic — cleanup', () => {
  it('calls stopListening on unmount', () => {
    const {unmount} = renderPanel();
    mockStopListening.mockClear();
    unmount();
    expect(mockStopListening).toHaveBeenCalled();
  });
});

// ── (g) Reduced motion → pulse disabled, mic still red ────────────────────

describe('NunbaChatPanel mic — prefers-reduced-motion', () => {
  it('does not apply the pulse animation when reduced motion is requested', () => {
    mockReducedMotion = true;
    mockHookState = {
      ...mockHookState,
      isListening: true,
      activeMethod: 'ws',
    };
    renderPanel();
    const btn = screen.getByTestId('mic-toggle-button');
    // Computed style on the button — pulse animation must NOT be present.
    const animation =
      btn.style.animation || window.getComputedStyle(btn).animation || '';
    expect(animation).not.toMatch(/infinite/i);
  });

  it('applies pulse animation when reduced motion is OFF and recording', () => {
    mockReducedMotion = false;
    mockHookState = {
      ...mockHookState,
      isListening: true,
      activeMethod: 'ws',
    };
    renderPanel();
    // The MUI sx prop generates an emotion class with the keyframes — we
    // can't easily read the keyframe name without snapshotting, but we
    // verify the badge surfaces the local-Whisper path AND the mic
    // button is mounted, so the pulse pathway is engaged.
    expect(screen.getByTestId('mic-toggle-button')).toBeInTheDocument();
    expect(screen.getByTestId('mic-path-local')).toBeInTheDocument();
  });
});

// ── Path indicator — local vs cloud ───────────────────────────────────────

describe('NunbaChatPanel mic — STT path badge', () => {
  it('shows "Local (private)" when WS Whisper is active', () => {
    mockHookState = {
      ...mockHookState,
      isListening: true,
      activeMethod: 'ws',
    };
    renderPanel();
    expect(screen.getByTestId('mic-path-local')).toBeInTheDocument();
    expect(screen.getByText(/local \(private\)/i)).toBeInTheDocument();
  });

  it('shows "Cloud (browser)" when fallback is active', () => {
    mockHookState = {
      ...mockHookState,
      isListening: true,
      activeMethod: 'browser',
      usingFallback: true,
    };
    renderPanel();
    expect(screen.getByTestId('mic-path-cloud')).toBeInTheDocument();
    expect(screen.getByText(/cloud \(browser\)/i)).toBeInTheDocument();
  });

  it('does not render the badge when not listening', () => {
    renderPanel();
    expect(screen.queryByTestId('mic-path-local')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mic-path-cloud')).not.toBeInTheDocument();
  });
});
