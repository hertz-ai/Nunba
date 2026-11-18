/* eslint-disable */
/**
 * A workflow card in the chat opens, on a click, into a window that shows the
 * whole flow in full, and closes again.
 *
 * Owner 2026-11-10, on the workflow card: "This card when clicked shd zoom in
 * with dimiss button so that entire flow is understood by user at a glance".
 * Measured on the installed page with the owner's own chat: one agent's card
 * held 47 steps on a 6440 x 410 drawing squeezed into 775 x 49 px of chat, so
 * a step's text stood 1.3 px tall, and 94 of its 141 labels were cut short
 * with "...". Nothing on the card opened it any larger.
 */
import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

// ChatMessageList's own imports, mocked as ChatMessageListSetupCards.test.js
// does; the workflow card itself is the real one.
jest.mock('lottie-react', () => ({__esModule: true, default: () => null}));
jest.mock('../../assets/hourglass-lottie.json', () => ({}), {virtual: true});
jest.mock('../../pages/chat/TypeWriterSubtitle', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/ThinkingProcessContainer', () => ({__esModule: true, default: () => null}));
jest.mock('../../pages/chat/SetupProgressCard', () => ({__esModule: true, default: () => null}));
jest.mock('lucide-react', () => ({FileText: () => null}));
jest.mock('markdown-to-jsx', () => ({__esModule: true, default: ({children}) => <div>{children}</div>}));
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
import WorkflowFlowchart from '../../pages/chat/WorkflowFlowchart';

// The shape of the owner's agent: several flows, each with its persona, and
// steps far longer than the card has room for.
const FIRST_STEP =
  'get_user_uploaded_file: capture the video of the child at play and note every attempt at a word';
const SECOND_STEP =
  'save_data_in_memory: store the attention log for this session under the child profile';
const COACH_STEP =
  'send_message_to_user: tell the parent about the next coaching session and what to practise';

const recipe = {
  goal: 'Capture video activities, caption reasons, approximate speech, and establish name attention',
  flows: [
    {
      flow_name: 'Flow_1_Name_Attention_Training',
      persona: 'Executor',
      actions: [FIRST_STEP, SECOND_STEP],
    },
    {
      flow_name: 'Flow_3_Native_Language_Coaching',
      persona: 'Parent_Coach',
      actions: [COACH_STEP],
    },
  ],
};

// The other recipe shape the card reads: one action, its steps in recipe[],
// each naming the tool it uses, and the action's fallback.
const toolRecipe = {
  action: 'Post the weekly reel',
  persona: 'Reel_Maker',
  fallback_action: 'ask the owner which clip to use',
  recipe: [
    {steps: 'pick the three best clips from the week', tool_name: 'list_media_files'},
    {steps: 'cut them into one reel with captions', tool_name: 'edit_video'},
  ],
};

const openButton = () => screen.getByRole('button', {name: /whole workflow/i});

describe('the workflow card opens into the whole flow', () => {
  it('shows every step in full in a window that a button closes', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    // In the chat the card cuts these steps short.
    expect(screen.queryByText(FIRST_STEP)).toBeNull();

    fireEvent.click(openButton());
    const dialog = await screen.findByRole('dialog');
    [FIRST_STEP, SECOND_STEP, COACH_STEP].forEach((step) => {
      expect(within(dialog).getByText(step)).toBeTruthy();
    });
    expect(within(dialog).getByText('Flow_1_Name_Attention_Training')).toBeTruthy();
    expect(within(dialog).getByText('Flow_3_Native_Language_Coaching')).toBeTruthy();
    expect(within(dialog).getByText('Parent_Coach')).toBeTruthy();
    expect(within(dialog).getByText(recipe.goal)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', {name: /close/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens from the keyboard and closes on Escape', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    fireEvent.keyDown(openButton(), {key: 'Enter'});
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens on Space as well as Enter', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    fireEvent.keyDown(openButton(), {key: ' '});
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  // A screen reader hears which workflow the card opens, and the window it
  // opens is named by the same goal.
  it('names the card and the window by the goal', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    fireEvent.click(
      screen.getByRole('button', {name: `Open the whole workflow: ${recipe.goal}`})
    );
    expect(await screen.findByRole('dialog', {name: recipe.goal})).toBeTruthy();
  });

  it('shows the tool each step uses and the fallback', async () => {
    render(<WorkflowFlowchart recipe={toolRecipe} />);
    fireEvent.click(openButton());
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('pick the three best clips from the week')).toBeTruthy();
    expect(within(dialog).getByText('Tool: list_media_files')).toBeTruthy();
    expect(within(dialog).getByText('Tool: edit_video')).toBeTruthy();
    expect(
      within(dialog).getAllByText('Fallback: ask the owner which clip to use').length
    ).toBeGreaterThan(0);
  });

  it('gives focus back to the card when the window closes', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    const card = openButton();
    card.focus();
    fireEvent.keyDown(card, {key: 'Enter'});
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(card);
  });

  // jsdom does no layout, so this reads the rule itself: one column per flow
  // ran off the side of the 473 px portrait dock; the columns must wrap.
  it('lets the flows wrap in a narrow window', async () => {
    render(<WorkflowFlowchart recipe={recipe} />);
    fireEvent.click(openButton());
    const dialog = await screen.findByRole('dialog');
    const lane = within(dialog).getByRole('region', {name: 'Flow_1_Name_Attention_Training'});
    expect(lane.parentElement.style.gridTemplateColumns).toMatch(/auto-fit/);
  });
});

describe('the workflow card inside the chat', () => {
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

  it('opens into the whole flow from the chat list', async () => {
    const messages = [
      {type: 'user', content: 'make my agent', timestamp: '2026-11-10T08:00:00.000Z'},
      {type: 'workflow_flowchart', recipe, promptId: 1793365100141},
    ];
    render(<ChatMessageList {...props} messages={messages} />);
    fireEvent.click(openButton());
    const dialog = await screen.findByRole('dialog', {name: recipe.goal});
    expect(within(dialog).getByText(COACH_STEP)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', {name: /close/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
