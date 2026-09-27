/**
 * The interview panel says why a question was refused, as the outcome.
 *
 * HARTOS dc32b1146 put /tracker/experiments/<post_id>/interview behind
 * may_steer: a non-owner gets 403 {success:false, data:{error, forbidden}}.
 * The panel read err.response.data.error, a key that is not there on either
 * shape socialApi can reject with (the server's JSON, or an axios error), so
 * a non-owner saw "Request failed with status code 403".  It now words the
 * refusal with constants/steerOutcome.steerError like every steering surface.
 */
import {act, fireEvent, render, screen} from '@testing-library/react';
import React from 'react';

jest.mock('@mui/material/useMediaQuery', () => ({__esModule: true, default: () => false}));

const mockInterview = jest.fn();
jest.mock('../../../../services/socialApi', () => ({
  trackerApi: {interview: (...a) => mockInterview(...a)},
}));

// eslint-disable-next-line import/first
import AgentInterviewPanel from '../../../../components/Social/Tracker/AgentInterviewPanel';

const refusal = {success: false, data: {error: 'agent not found, or not yours to steer', forbidden: true}};

async function ask() {
  render(<AgentInterviewPanel postId="p1" agentTitle="Agent" onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText('Ask the agent...'), {target: {value: 'why?'}});
  await act(async () => {
    fireEvent.keyDown(screen.getByPlaceholderText('Ask the agent...'), {key: 'Enter'});
  });
}

beforeEach(() => mockInterview.mockReset());

test.each([
  ['the server JSON socialApi rejects with', () => Promise.reject(refusal)],
  ['an axios error carrying it', () => {
    const e = new Error('Request failed with status code 403');
    e.response = {status: 403, data: refusal};
    return Promise.reject(e);
  }],
])('a refusal as %s reads as its outcome', async (_label, reply) => {
  mockInterview.mockImplementation(reply);
  await ask();
  expect(await screen.findByText(/You can only steer your own runs\./)).toBeInTheDocument();
  expect(screen.queryByText(/status code 403/)).toBeNull();
});

test('an answer is shown as before', async () => {
  mockInterview.mockResolvedValue({success: true, data: {answer: 'Because of X.'}});
  await ask();
  expect(await screen.findByText('Because of X.')).toBeInTheDocument();
});
