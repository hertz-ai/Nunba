/**
 * Nunba's CreateAgentForm: a voice-only agent with a stock voice is the default (owner, 2026-11-26),
 * the same rule as hevolve.ai's form (Hevolve c6518da).  A face (a video agent) and a cloned voice
 * are choices; an unchosen one uploads nothing, and the agent is made either way.
 */
import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import CreateAgentForm from '../../pages/CreateAgentForm';
import {UPLOAD_IMAGE_URL, CREATE_PROMPT_URL} from '../../config/apiBase';

jest.mock('uuid', () => ({v4: () => 'req-1'}));

const fill = () => {
  fireEvent.change(screen.getByLabelText('Agent Name'), {target: {value: 'Arun'}});
  fireEvent.change(screen.getByLabelText('Agent Prompt'), {target: {value: 'Speech practice'}});
};

const createBody = () => {
  const call = global.fetch.mock.calls.find(([url]) => url === CREATE_PROMPT_URL);
  return JSON.parse(call[1].body);
};

describe('CreateAgentForm (Nunba)', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ok: true, json: () => Promise.resolve({})}));
    global.FileReader = class {
      readAsDataURL() {
        this.result = 'data:image/png;base64,x';
        if (this.onloadend) this.onloadend();
      }
    };
  });

  it('makes a voice-only agent with a stock voice by default, uploading nothing', async () => {
    const onSubmit = jest.fn();
    render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    expect(screen.queryByText('Upload an image for your agent')).toBeNull();
    expect(screen.queryByText("Upload an audio file for your agent's voice")).toBeNull();
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([CREATE_PROMPT_URL]);
    expect(createBody()).toMatchObject({name: 'Arun', media: 'voice', voice_clone: false});
  });

  it('a chosen face uploads on Create, with the final name, and makes a video agent', async () => {
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    fireEvent.click(screen.getByLabelText(/Give the agent a face/));
    const picker = container.querySelector('input[type="file"][accept="image/*"]');
    fireEvent.change(picker, {target: {files: [new File(['x'], 'face.png', {type: 'image/png'})]}});
    expect(global.fetch).not.toHaveBeenCalled(); // picking only keeps the file
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([UPLOAD_IMAGE_URL, CREATE_PROMPT_URL]);
    expect(global.fetch.mock.calls[0][1].body.get('name')).toBe('Arun');
    expect(createBody()).toMatchObject({media: 'video', voice_clone: false});
  });

  it('a failed upload still makes the agent', async () => {
    global.fetch = jest.fn((url) => Promise.resolve(
      url === UPLOAD_IMAGE_URL ? {ok: false} : {ok: true, json: () => Promise.resolve({})}));
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    fireEvent.click(screen.getByLabelText(/Give the agent a face/));
    const picker = container.querySelector('input[type="file"][accept="image/*"]');
    fireEvent.change(picker, {target: {files: [new File(['x'], 'face.png', {type: 'image/png'})]}});
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('untick a choice and its file is dropped', async () => {
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    fireEvent.click(screen.getByLabelText(/Speak in a recorded voice/));
    const picker = container.querySelector('input[type="file"][accept="audio/*"]');
    fireEvent.change(picker, {target: {files: [new File(['x'], 'voice.wav', {type: 'audio/wav'})]}});
    fireEvent.click(screen.getByLabelText(/Speak in a recorded voice/)); // untick
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([CREATE_PROMPT_URL]);
    expect(createBody()).toMatchObject({voice_clone: false});
  });
});
