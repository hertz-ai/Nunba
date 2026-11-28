/**
 * Nunba's CreateAgentForm: a voice-only agent with a stock voice is the default (owner, 2026-11-26),
 * the same rule as hevolve.ai's form (Hevolve c6518da).  A face (a video agent) and a cloned voice
 * are choices; an unchosen one uploads nothing, and the agent is made either way.
 *
 * The agent is made on this desktop (owner 2026-11-28, "Create locally, sync up"): the form hands
 * its name, description and the uploaded face's teacher_avatar_id to the page's own conversational
 * creation (Demopage handleCreateAgentClick), and posts nothing to central's /db/create_prompt.
 */
import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import CreateAgentForm from '../../pages/CreateAgentForm';
import {UPLOAD_IMAGE_URL, UPLOAD_AUDIO_URL} from '../../config/apiBase';

jest.mock('uuid', () => ({v4: () => 'req-1'}));

const fill = () => {
  fireEvent.change(screen.getByLabelText('Agent Name'), {target: {value: 'Arun'}});
  fireEvent.change(screen.getByLabelText('Agent Prompt'), {target: {value: 'Speech practice'}});
};

const pickFace = (container) => {
  fireEvent.click(screen.getByLabelText(/Give the agent a face/));
  const picker = container.querySelector('input[type="file"][accept="image/*"]');
  fireEvent.change(picker, {target: {files: [new File(['x'], 'face.png', {type: 'image/png'})]}});
};

describe('CreateAgentForm (Nunba)', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(url === UPLOAD_IMAGE_URL
        ? {teacher_avatar_id: 1000000017, voice_id: null} : {}),
    }));
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
    expect(global.fetch).not.toHaveBeenCalled(); // nothing to central, nothing uploaded
    const seed = onSubmit.mock.calls[0][0];
    expect(seed).toMatchObject(
      {fromCreateForm: true, name: 'Arun', prompt: 'Speech practice', media: 'voice', voice_clone: false,
       is_public: false});
    expect(seed).not.toHaveProperty('teacher_avatar_id');
  });

  it('"Make this agent public" goes with the agent (owner 2026-11-28: "Bring it back now")', async () => {
    const onSubmit = jest.fn();
    render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    fill();
    fireEvent.click(screen.getByLabelText('Make this agent public'));
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({fromCreateForm: true, is_public: true});
  });

  it('a chosen face uploads on Create, with the final name, and the agent is made with it', async () => {
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    pickFace(container);
    expect(global.fetch).not.toHaveBeenCalled(); // picking only keeps the file
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([UPLOAD_IMAGE_URL]);
    expect(global.fetch.mock.calls[0][1].body.get('name')).toBe('Arun');
    expect(onSubmit.mock.calls[0][0]).toMatchObject(
      {fromCreateForm: true, name: 'Arun', media: 'video', teacher_avatar_id: 1000000017});
  });

  it('a failed face upload still makes the agent, voice only', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ok: false}));
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    pickFace(container);
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const seed = onSubmit.mock.calls[0][0];
    expect(seed).toMatchObject({fromCreateForm: true, media: 'voice'});
    expect(seed).not.toHaveProperty('teacher_avatar_id');
  });

  it('an upload reply with no avatar id makes a voice-only agent', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ok: true, json: () => Promise.resolve({})}));
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    pickFace(container);
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({media: 'voice'});
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('teacher_avatar_id');
  });

  it('a recorded voice uploads with the same request id as the face', async () => {
    const onSubmit = jest.fn();
    const {container} = render(<CreateAgentForm onClose={() => {}} onSubmit={onSubmit} userId="u1" />);
    pickFace(container);
    fireEvent.click(screen.getByLabelText(/Speak in a recorded voice/));
    const audio = container.querySelector('input[type="file"][accept="audio/*"]');
    fireEvent.change(audio, {target: {files: [new File(['x'], 'voice.wav', {type: 'audio/wav'})]}});
    fill();
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([UPLOAD_IMAGE_URL, UPLOAD_AUDIO_URL]);
    expect(global.fetch.mock.calls.map(([, init]) => init.body.get('request_id'))).toEqual(['req-1', 'req-1']);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({voice_clone: true, teacher_avatar_id: 1000000017});
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
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({voice_clone: false});
  });
});
