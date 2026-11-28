/**
 * The chat header names the agent and the persona its replies are for.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  Tomorrow's
 * demo runs one speech agent on three screens, the child's, the parent's
 * and the therapist's; each says "<agent name> · <persona>" once a reply of
 * that agent names the persona (HARTOS design_1125 B).  Only the open
 * agent's own replies count, and its newest reply decides (review of
 * d899016f, M1).
 */
import AgentPersonaLabel from '../../../components/chat/AgentPersonaLabel';

import {render, screen} from '@testing-library/react';
import React from 'react';


const SPEECH = '95568353503';
const COACH = '70000000001';
const reply = (persona, promptId = SPEECH) => ({type: 'assistant', content: 'Well done!', persona, promptId});

function label(messages, {name = 'Speech Buddy', promptId = SPEECH} = {}) {
  return render(<AgentPersonaLabel name={name} promptId={promptId} messages={messages} />);
}

test("the header says the agent and the persona its newest reply named", () => {
  label([{type: 'user', content: 'ball'}, reply('Child')]);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Child');
});

test('a newer reply for another persona changes it', () => {
  const {rerender} = label([reply('Child')]);
  rerender(<AgentPersonaLabel name="Speech Buddy" promptId={SPEECH}
    messages={[reply('Child'), reply('Parent')]} />);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Parent');
});

test("another agent's message pushed into this chat does not change it", () => {
  label([reply('Child'), reply('Assistant', '70264903070')]);
  expect(screen.getByTestId('agent-persona-label').textContent).toBe('Speech Buddy · Child');
});

test("after a switch, the previous agent's persona is never shown under the new agent's name", () => {
  // Review of d899016f (M1): an @mention switch keeps the previous agent's
  // messages; its reply named 'Parent', and the header read "Word Coach · Parent".
  // The reply as d899016f kept a /chat reply (no promptId), and as kept now.
  const asKeptBefore = {type: 'assistant', content: 'Hello Meena!', persona: 'Parent'};
  for (const previous of [asKeptBefore, reply('Parent', SPEECH)]) {
    const {container, unmount} = label([previous, {type: 'user', content: '@Coach hi'}],
      {name: 'Word Coach', promptId: COACH});
    expect(container).toBeEmptyDOMElement();
    unmount();
  }
});

test('a newer reply that names none clears it', () => {
  const {container} = label([reply('Child'), reply(undefined)]);
  expect(container).toBeEmptyDOMElement();
});

test('until a reply names a persona the header shows nothing new', () => {
  const {container} = label([{type: 'user', content: 'hi'}, {type: 'assistant', content: 'Hello!'}]);
  expect(container).toBeEmptyDOMElement();
});
