/**
 * Every agent reply the chat page shows keeps the persona it named.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  HARTOS names
 * the persona of the person a reply is for, in that agent (design_1125 B):
 * `persona` on the /chat reply and on every agent message it pushes.  The
 * page built each reply's message from a fixed set of fields, so the persona
 * never reached the chat header (components/chat/AgentPersonaLabel, which
 * reads the newest one).  Every reply also keeps the agent it came from
 * (`promptId`): a pushed message its own prompt_id, a /chat reply the agent
 * its turn was sent to.  Only the open agent's replies name the header's
 * persona (utils/agentPersona.newestPersona; review of d899016f, M1).
 *
 * Demopage is too large to render in a unit test, so each place that turns
 * a reply into a message is cut out of Demopage.js and run as written (the
 * pattern of demopageTextOnlyVoiceOnTheDeviceUsed.test.js); what is checked
 * is the message it builds.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const SPEECH = '95568353503';

// The object literal of the first assistant message built after `marker`:
// from the `{` that opens it (its first field is type 'assistant') to the
// `}` that closes it, skipping strings and line comments.
function assistantMessageAfter(marker) {
  const at = SRC.indexOf(marker);
  if (at < 0) throw new Error(`Demopage marker not found: ${marker}`);
  const typeAt = SRC.indexOf("type: 'assistant'", at);
  if (typeAt < 0) throw new Error(`no assistant message after: ${marker}`);
  const open = SRC.lastIndexOf('{', typeAt);
  let depth = 0;
  for (let i = open; i < SRC.length; i += 1) {
    const c = SRC[i];
    if (c === '/' && SRC[i + 1] === '/') { i = SRC.indexOf('\n', i); continue; }
    if (c === "'" || c === '"' || c === '`') { i = SRC.indexOf(c, i + 1); continue; }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return SRC.slice(open, i + 1);
    }
  }
  throw new Error(`the assistant message after ${marker} never closes`);
}

// Build the message the page builds at `marker`, from `scope`.
function built(marker, scope) {
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  const make = new Function(...names, `return (${assistantMessageAfter(marker)});`);
  return make(...names.map((n) => scope[n]));
}

// Pushed agent messages (handleDataReceived): the text-mode, text-only and
// spoken branches, and the text variable each one shows.
const PUSHED = [
  ['text mode', '      if (isTextMode) {', 'extractedText'],
  ['text only', '      if (hasText && !hasAudio) {', 'extractedText'],
  ['spoken', '        if (textToShow) {', 'textToShow'],
];

// /chat replies (handleSend and the agent-creation turns): the reply object
// each one reads, the text it shows, and the page state that names the
// agent the turn was sent to (review of d899016f, M1: a /chat reply kept no
// agent, so after an @mention switch the previous agent's persona counted).
const REPLIES = [
  ['a turn', 'if (!cardConsumedText && !replyPushed && responseText) {', 'resultData', 'responseText',
    {turnAgent: {prompt_id: SPEECH}}],
  ['a plan run', 'text: plan.task_description,', 'resultData', 'responseText',
    {promptId: SPEECH}],
  ['creation, next step', 'const contText = contData.text || contData.response;', 'contData', 'contText',
    {currentAgent: {prompt_id: SPEECH}}],
  ['creation, the task', 'const execText = execData.text || execData.response;', 'execData', 'execText',
    {currentAgentRef: {current: {prompt_id: SPEECH}}, contData: {}}],
];

describe('a pushed agent message keeps the persona it named and the agent that pushed it', () => {
  test.each(PUSHED)('%s', (_name, marker, textVar) => {
    const parsed = {text: ['Say "ball" with me.'], prompt_id: SPEECH, persona: 'Child'};
    const message = built(marker, {parsed, [textVar]: 'Say "ball" with me.'});
    expect(message.type).toBe('assistant');
    expect(message.persona).toBe('Child');
    expect(message.promptId).toBe(SPEECH);
  });

  test.each(PUSHED)('%s: a message that names none keeps none', (_name, marker, textVar) => {
    const parsed = {text: ['Hello!'], prompt_id: SPEECH};
    expect(built(marker, {parsed, [textVar]: 'Hello!'}).persona).toBeUndefined();
  });
});

describe('a /chat reply keeps the persona it named and the agent the turn was sent to', () => {
  test.each(REPLIES)('%s', (_name, marker, replyVar, textVar, turn) => {
    const reply = {text: 'Well done!', persona: 'Child', served_by: 'local'};
    const message = built(marker, {...turn, [replyVar]: reply, [textVar]: 'Well done!'});
    expect(message.type).toBe('assistant');
    expect(message.persona).toBe('Child');
    expect(message.promptId).toBe(SPEECH);
  });

  test.each(REPLIES)('%s: a reply that names none keeps none', (_name, marker, replyVar, textVar, turn) => {
    const message = built(marker, {...turn, [replyVar]: {text: 'Hello!'}, [textVar]: 'Hello!'});
    expect(message.persona).toBeUndefined();
    expect(message.promptId).toBe(SPEECH);
  });
});
