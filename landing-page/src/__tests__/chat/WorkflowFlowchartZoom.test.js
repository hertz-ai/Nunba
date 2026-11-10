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
});
