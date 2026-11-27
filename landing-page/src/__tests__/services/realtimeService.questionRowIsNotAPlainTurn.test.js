/**
 * A question saved in the agent's chat is never drawn as a second, plain
 * bubble.
 *
 * HARTOS now saves every agent question as the asking agent's chat message
 * (design_1125 A): a ConversationEntry row, role assistant, msg_id = the ask
 * id, with an attachment {kind: 'agent_ask', ask_id, card}, delivered to the
 * person's devices by chat.new.  The page draws a question from its card
 * (AgentOverlay, in the chat when the agent's chat is open), so the chat.new
 * row of the same question must not also become a plain message reading
 * "Agent Speech Buddy asks you".  isRemoteChatTurn is the one rule the
 * page's chat.new handler reads.
 */
import {isRemoteChatTurn} from '../../services/realtimeService';

const ASK = 'c0ffee00c0ffee00c0ffee00c0ffee00';
const QUESTION_ROW = {
  msg_id: ASK,
  role: 'assistant',
  content: 'Agent Speech Buddy asks you',
  prompt_id: '95568353503',
  agent_id: '95568353503',
  device_id: null,
  channel_type: 'chat',
  attachments: [{kind: 'agent_ask', ask_id: ASK, card: {type: 'form', ask_id: ASK}}],
};

test("a saved question's chat row is not a plain turn", () => {
  expect(isRemoteChatTurn(QUESTION_ROW, 'desktop-1')).toBe(false);
});

test("another device's turns are still drawn, as before", () => {
  const reply = {msg_id: 'm-1', role: 'assistant', content: 'Well done!',
    prompt_id: '95568353503', device_id: 'tablet-1', channel_type: 'chat', attachments: null};
  expect(isRemoteChatTurn(reply, 'desktop-1')).toBe(true);
  const withAMedia = {...reply, msg_id: 'm-2',
    attachments: [{file_id: 'f', sha256: 'f', name: 'reel.mp4', mime: 'video/mp4', size: 1}]};
  expect(isRemoteChatTurn(withAMedia, 'desktop-1')).toBe(true);
});
