/**
 * The chat header names the agent and the persona its replies are for.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  Tomorrow's
 * demo runs one speech agent on three screens, the child's, the parent's
 * and the therapist's; each says "<agent name> · <persona>" once a reply of
 * that agent names the persona (HARTOS design_1125 B).
 */
import React from 'react';
import {render, screen} from '@testing-library/react';

import AgentPersonaLabel from '../../../components/chat/AgentPersonaLabel';

const SPEECH = '95568353503';
const REPLY = (persona, extra = {}) => ({type: 'assistant', content: 'Well done!', persona, ...extra});

function label(messages) {
  return render(<AgentPersonaLabel name="Speech Buddy" promptId={SPEECH} messages={messages} />);
}

test("the header says the agent and the persona its newest reply named", () => {
  label([{type: 'user', content: 'ball'}, REPLY('Child')]);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Child');
});

test('a newer reply for another persona changes it', () => {
  const {rerender} = label([REPLY('Child')]);
  rerender(<AgentPersonaLabel name="Speech Buddy" promptId={SPEECH}
    messages={[REPLY('Child'), REPLY('Parent', {promptId: SPEECH})]} />);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Parent');
});

test("another agent's message pushed into this chat does not change it", () => {
  label([REPLY('Child'), REPLY('Assistant', {promptId: '70264903070'})]);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Child');
});

test('until a reply names a persona the header shows nothing new', () => {
  const {container} = label([{type: 'user', content: 'hi'}, {type: 'assistant', content: 'Hello!'}]);
  expect(container).toBeEmptyDOMElement();
});
