/**
 * "<agent name> · <persona>": the persona an agent's replies name, said
 * beside the agent's name.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  HARTOS now
 * names the persona of the person a reply is for, in that agent (design_1125
 * B): `persona` on the /chat reply and on every agent message it pushes.  The
 * page keeps it on the reply's message with the agent the reply came from
 * (`promptId`).  Only the open agent's own replies count, and its newest
 * reply decides: review of d899016f (M1) found the header naming the
 * previous agent's persona after an @mention switch, and keeping a persona
 * the server no longer named.
 */
import {newestPersona, withPersona} from '../../utils/agentPersona';

const SPEECH = '95568353503';
const COACH = '70000000001';
const REPLY = (persona, extra = {}) => ({type: 'assistant', content: 'Well done!', persona, ...extra});

describe('withPersona', () => {
  test('names the agent and the persona', () => {
    expect(withPersona('Speech Buddy', 'Child')).toBe('Speech Buddy · Child');
    expect(withPersona(' Speech Buddy ', ' Parent ')).toBe('Speech Buddy · Parent');
  });

  test('with no persona it is the name alone, as before', () => {
    for (const none of [undefined, null, '', '   ']) {
      expect(withPersona('Speech Buddy', none)).toBe('Speech Buddy');
    }
  });

  test('with no name it is the persona alone', () => {
    expect(withPersona(undefined, 'Child')).toBe('Child');
  });
});

describe('newestPersona', () => {
  test("the open agent's newest reply names it", () => {
    expect(newestPersona([
      REPLY('Parent', {promptId: SPEECH}),
      {type: 'user', content: 'ball'},
      REPLY('Child', {promptId: SPEECH}),
    ], SPEECH)).toBe('Child');
  });

  test('the open agent is the same whether its id is a number or text', () => {
    expect(newestPersona([REPLY('Child', {promptId: Number(SPEECH)})], SPEECH)).toBe('Child');
  });

  test("another agent's replies never name this chat's persona", () => {
    // A message another agent pushed into the open chat, and the previous
    // agent's replies an @mention switch keeps on screen.
    expect(newestPersona([
      REPLY('Child', {promptId: SPEECH}),
      REPLY('Assistant', {promptId: '70264903070'}),
    ], SPEECH)).toBe('Child');
    expect(newestPersona([REPLY('Parent', {promptId: COACH})], SPEECH)).toBe('');
  });

  test('a reply that names no agent never names one: an agent switch shows none until its reply', () => {
    // How d899016f kept a /chat reply: no promptId.  Review of d899016f (M1):
    // the header named the previous agent's 'Parent' under the new agent.
    expect(newestPersona([REPLY('Parent')], SPEECH)).toBe('');
    expect(newestPersona([REPLY('Parent'), {type: 'user', content: '@Speech hi'}], SPEECH)).toBe('');
  });

  test("a newer reply of the open agent that names none clears it", () => {
    // The server stops naming one (the pick is no longer one of the agent's).
    expect(newestPersona([
      REPLY('Child', {promptId: SPEECH}),
      REPLY(undefined, {promptId: SPEECH}),
    ], SPEECH)).toBe('');
    expect(newestPersona([
      REPLY('Child', {promptId: SPEECH}),
      REPLY('  ', {promptId: SPEECH}),
    ], SPEECH)).toBe('');
  });

  test('messages that are not replies are passed over', () => {
    expect(newestPersona([
      REPLY('Child', {promptId: SPEECH}),
      {type: 'user', content: 'ball', persona: 'Therapist', promptId: SPEECH},
      {type: 'thinking_container', promptId: SPEECH},
    ], SPEECH)).toBe('Child');
  });

  test('no open agent, or no reply yet: none, never a guess', () => {
    expect(newestPersona([REPLY('Child', {promptId: SPEECH})], undefined)).toBe('');
    expect(newestPersona([], SPEECH)).toBe('');
    expect(newestPersona(undefined, SPEECH)).toBe('');
  });
});
