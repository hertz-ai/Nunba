import { normalizeRestoredMessage, normalizeRestoredMessages } from '../normalizeRestoredMessages';

describe('normalizeRestoredMessage', () => {
  test('a {role,text} message from the server DB becomes {type,content}', () => {
    const out = normalizeRestoredMessage({ role: 'user', text: 'hi', timestamp: '2026-10-02T07:45:37.719Z' });
    expect(out).toMatchObject({ type: 'user', content: 'hi', timestamp: '2026-10-02T07:45:37.719Z' });
  });

  test('role assistant (and any non-user role) renders as an assistant bubble', () => {
    expect(normalizeRestoredMessage({ role: 'assistant', text: 'yo' }).type).toBe('assistant');
    expect(normalizeRestoredMessage({ role: 'bot', text: 'yo' }).type).toBe('assistant');
  });

  test('a message already in {type,content} shape is returned untouched', () => {
    const m = { type: 'assistant', content: 'hello', timestamp: 't', messageId: 'a' };
    expect(normalizeRestoredMessage(m)).toBe(m);
  });

  test('a card message (type with no content) is returned untouched', () => {
    const m = { type: 'plan_card', plan: { steps: [] } };
    expect(normalizeRestoredMessage(m)).toBe(m);
  });

  test('text-only legacy message keeps its text as content', () => {
    expect(normalizeRestoredMessage({ type: 'assistant', text: 'old' }).content).toBe('old');
  });

  test('null / non-object entries pass through', () => {
    expect(normalizeRestoredMessage(null)).toBeNull();
    expect(normalizeRestoredMessage('x')).toBe('x');
  });
});

describe('normalizeRestoredMessages', () => {
  test('maps a list and tolerates a non-array', () => {
    expect(normalizeRestoredMessages([{ role: 'user', text: 'a' }])).toEqual([
      expect.objectContaining({ type: 'user', content: 'a' }),
    ]);
    expect(normalizeRestoredMessages(undefined)).toEqual([]);
  });
});
