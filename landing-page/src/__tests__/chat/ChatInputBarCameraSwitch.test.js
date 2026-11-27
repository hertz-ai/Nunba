/**
 * The chat bar's camera switch (owner 2026-11-25: "why cant the switch in
 * Nunba chat be used to switch off camera?").  It shows whether the camera
 * consent is on and hands the click to onToggleCamera, which Demopage wires
 * to setCameraConsent: the Privacy page camera card's own consent calls.
 * On grants every agent the camera, so it first asks the camera card's own
 * confirmation (owner 11-22: a whole-kind switch says so before it is
 * pressed; hartos-17 on c5aeb1ee).  Off is one press.
 */
import ChatInputBar from '../../pages/chat/ChatInputBar';

import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import React from 'react';

const props = (over = {}) => ({
  messageQueue: [],
  setMessageQueue: jest.fn(),
  editingQueueId: null,
  setEditingQueueId: jest.fn(),
  pdfFile: null,
  userImage: null,
  showAgentMentionList: false,
  setShowAgentMentionList: jest.fn(),
  allAgents: [],
  mentionFilter: '',
  setMentionFilter: jest.fn(),
  inputMessage: '',
  setInputMessage: jest.fn(),
  isAuthenticated: true,
  loading: false,
  ttsEnabled: false,
  setTtsEnabled: jest.fn(),
  isRecording: false,
  textareaRef: React.createRef(),
  handleRemovePdf: jest.fn(),
  handleRemoveImage: jest.fn(),
  selectMentionedAgent: jest.fn(),
  handleFocus: jest.fn(),
  handleBlur: jest.fn(),
  handleKeyPress: jest.fn(),
  handleSend: jest.fn(),
  handleStart: jest.fn(),
  handleStop: jest.fn(),
  handleImageSelect: jest.fn(),
  handlePdfSelect: jest.fn(),
  setIsModalOpen: jest.fn(),
  ...over,
});

describe('ChatInputBar camera switch', () => {
  it('shows the camera on, and a click asks to turn it off', () => {
    const onToggleCamera = jest.fn();
    render(<ChatInputBar {...props({cameraOn: true, onToggleCamera})} />);
    const sw = screen.getByRole('button', {name: 'Turn camera off'});
    expect(sw).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sw);
    expect(onToggleCamera).toHaveBeenCalledTimes(1);
  });

  it('shows the camera off, and turns it on only once the every-agent confirmation is accepted', () => {
    const onToggleCamera = jest.fn();
    render(<ChatInputBar {...props({cameraOn: false, onToggleCamera})} />);
    const sw = screen.getByRole('button', {name: 'Turn camera on'});
    expect(sw).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(sw);

    // The press writes nothing: the person first reads what On allows.
    expect(onToggleCamera).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(
      /Every agent will be able to use this camera without asking you first/,
    )).toBeInTheDocument();
    const allow = within(dialog).getByRole('button', {name: 'Allow'});
    expect(allow).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('checkbox', {
      name: 'I understand every agent can use this camera without asking.',
    }));
    expect(onToggleCamera).not.toHaveBeenCalled();
    fireEvent.click(allow);
    expect(onToggleCamera).toHaveBeenCalledTimes(1);
  });

  it('turns nothing on when the confirmation is cancelled', async () => {
    const onToggleCamera = jest.fn();
    render(<ChatInputBar {...props({cameraOn: false, onToggleCamera})} />);
    fireEvent.click(screen.getByRole('button', {name: 'Turn camera on'}));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox', {
      name: 'I understand every agent can use this camera without asking.',
    }));
    fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onToggleCamera).not.toHaveBeenCalled();
  });

  it('never turns the camera off from Allow when it came on elsewhere meanwhile', () => {
    // Demopage's handler flips the current answer, so an Allow pressed after
    // the camera came on (the Privacy page, another tab) would turn it off.
    const onToggleCamera = jest.fn();
    const {rerender} = render(
      <ChatInputBar {...props({cameraOn: false, onToggleCamera})} />);
    fireEvent.click(screen.getByRole('button', {name: 'Turn camera on'}));
    rerender(<ChatInputBar {...props({cameraOn: true, onToggleCamera})} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox', {
      name: 'I understand every agent can use this camera without asking.',
    }));
    fireEvent.click(within(dialog).getByRole('button', {name: 'Allow'}));
    expect(onToggleCamera).not.toHaveBeenCalled();
  });

  it('asks again on the next press: a tick from before does not carry over', () => {
    const onToggleCamera = jest.fn();
    render(<ChatInputBar {...props({cameraOn: false, onToggleCamera})} />);
    const sw = screen.getByRole('button', {name: 'Turn camera on'});
    fireEvent.click(sw);
    let dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox', {
      name: 'I understand every agent can use this camera without asking.',
    }));
    fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));
    fireEvent.click(sw);
    dialog = screen.getAllByRole('dialog').pop();
    expect(within(dialog).getByRole('button', {name: 'Allow'})).toBeDisabled();
    expect(onToggleCamera).not.toHaveBeenCalled();
  });

  it('has no switch where the page gives no handler', () => {
    render(<ChatInputBar {...props()} />);
    expect(screen.queryByRole('button', {name: /Turn camera/})).toBeNull();
  });
});
