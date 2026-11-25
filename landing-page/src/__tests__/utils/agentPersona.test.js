/**
 * "<agent name> · <persona>": the persona an agent's replies name, said
 * beside the agent's name.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  HARTOS now
 * names the persona of the person a reply is for, in that agent (design_1125
 * B): `persona` on the /chat reply and on every agent message it pushes.  An
 * agent message is pushed to the person's chat whichever chat is open, so a
 * persona counts for the open chat only when it is that agent's.
 */
import {newestPersona, withPersona} from '../../utils/agentPersona';

const SPEECH = '95568353503';
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
  test("the newest reply's persona", () => {
    expect(newestPersona([
      REPLY('Parent'),
      {type: 'user', content: 'ball'},
      REPLY('Child'),
    ], SPEECH)).toBe('Child');
  });

  test('messages that name no persona are passed over', () => {
    expect(newestPersona([
      REPLY('Child'),
      {type: 'assistant', content: 'An older reply'},
      REPLY('  '),
      {type: 'user', content: 'ball', persona: 'Therapist'},
      {type: 'thinking_container'},
    ], SPEECH)).toBe('Child');
  });

  test("a message another agent pushed while this chat is open names no persona here", () => {
    expect(newestPersona([
      REPLY('Child', {promptId: SPEECH}),
      REPLY('Assistant', {promptId: '70264903070'}),
    ], SPEECH)).toBe('Child');
  });

  test('the open agent is the same whether its id is a number or text', () => {
    expect(newestPersona([REPLY('Child', {promptId: Number(SPEECH)})], SPEECH)).toBe('Child');
  });

  test("a /chat reply names no agent: it is the turn's own", () => {
    expect(newestPersona([REPLY('Child')], SPEECH)).toBe('Child');
    expect(newestPersona([REPLY('Child')])).toBe('Child');
  });

  test('no reply named one yet: none, never a guess', () => {
    expect(newestPersona([], SPEECH)).toBe('');
    expect(newestPersona(undefined, SPEECH)).toBe('');
    expect(newestPersona([{type: 'assistant', content: 'Hi'}], SPEECH)).toBe('');
    expect(newestPersona([REPLY('Assistant', {promptId: '70264903070'})], SPEECH)).toBe('');
  });
});
