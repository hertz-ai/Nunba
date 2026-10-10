/**
 * The composer's PDF / image buttons choose between the native file dialog and
 * the browser's own file input.
 *
 * Measured 2026-10-10: they tested `window.pywebview && window.pywebview.api`.
 * On Windows that is true (WindowApi gives the titlebar its window_* methods)
 * but the api has no `native_file_pick`, so the button called the native
 * handler, which threw, and the hidden <input type=file> was never opened.
 */
import ChatInputBar from '../../pages/chat/ChatInputBar';

import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';

const WINDOWS_API = {window_minimize: () => {}, window_close: () => {}};
const MAC_API = {window_minimize: () => {}, native_file_pick: () => Promise.resolve('')};

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

afterEach(() => {
  delete window.pywebview;
});

// [button label, hidden input id, handler prop]
const BUTTONS = [
  ['Upload PDF', 'pdfInput', 'handlePdfSelect'],
  ['Upload image', 'fileInput', 'handleImageSelect'],
];

describe.each(BUTTONS)('%s button', (label, inputId, handlerProp) => {
  test('Windows (an api with no native_file_pick) opens the browser file input', () => {
    window.pywebview = {api: WINDOWS_API};
    const p = props();
    render(<ChatInputBar {...p} />);
    const click = jest.spyOn(document.getElementById(inputId), 'click');

    fireEvent.click(screen.getByLabelText(label));

    expect(click).toHaveBeenCalledTimes(1);
    expect(p[handlerProp]).not.toHaveBeenCalled();
  });

  test('macOS (an api with native_file_pick) goes to the native handler', () => {
    window.pywebview = {api: MAC_API};
    const p = props();
    render(<ChatInputBar {...p} />);
    const click = jest.spyOn(document.getElementById(inputId), 'click');

    fireEvent.click(screen.getByLabelText(label));

    expect(p[handlerProp]).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
  });

  test('a plain browser opens the browser file input', () => {
    const p = props();
    render(<ChatInputBar {...p} />);
    const click = jest.spyOn(document.getElementById(inputId), 'click');

    fireEvent.click(screen.getByLabelText(label));

    expect(click).toHaveBeenCalledTimes(1);
    expect(p[handlerProp]).not.toHaveBeenCalled();
  });
});
