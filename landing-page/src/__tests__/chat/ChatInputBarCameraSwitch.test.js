/**
 * The chat bar's camera switch (owner 2026-11-25: "why cant the switch in
 * Nunba chat be used to switch off camera?").  It shows whether the camera
 * consent is on and hands the click to onToggleCamera, which Demopage wires
 * to setCameraConsent: the Privacy page camera card's own consent calls.
 */
import ChatInputBar from '../../pages/chat/ChatInputBar';

import {fireEvent, render, screen} from '@testing-library/react';
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

  it('shows the camera off, and a click asks to turn it on', () => {
    const onToggleCamera = jest.fn();
    render(<ChatInputBar {...props({cameraOn: false, onToggleCamera})} />);
    const sw = screen.getByRole('button', {name: 'Turn camera on'});
    expect(sw).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(sw);
    expect(onToggleCamera).toHaveBeenCalledTimes(1);
  });

  it('has no switch where the page gives no handler', () => {
    render(<ChatInputBar {...props()} />);
    expect(screen.queryByRole('button', {name: /Turn camera/})).toBeNull();
  });
});
