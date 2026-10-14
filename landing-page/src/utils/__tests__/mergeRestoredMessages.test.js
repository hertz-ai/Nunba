import { mergeRestoredMessages } from '../mergeRestoredMessages';

const saved = (n) =>
  Array.from({ length: n }, (_, i) => ({
    type: i % 2 ? 'bot' : 'user',
    content: `old ${i}`,
    timestamp: new Date(2026, 8, 1, 10, i).toISOString(),
  }));

describe('mergeRestoredMessages', () => {
  test('keeps a live exchange that arrived before the restore ran', () => {
    const live = [
      { type: 'user', content: 'hey', messageId: 'm-1', timestamp: new Date(2026, 9, 1, 15, 27) },
      { type: 'bot', content: 'Hello!', timestamp: new Date(2026, 9, 1, 15, 27, 4) },
    ];
    const out = mergeRestoredMessages(saved(50), live);
    expect(out).toHaveLength(52);
    expect(out.slice(-2).map((m) => m.content)).toEqual(['hey', 'Hello!']);
  });

  test('longer stored history alone does not replace live messages (old rule dropped them)', () => {
    const live = [{ type: 'bot', content: 'only live', timestamp: new Date() }];
    const out = mergeRestoredMessages(saved(3), live);
    expect(out.map((m) => m.content)).toContain('only live');
  });

  test('does not duplicate a message present in both lists, Date vs ISO timestamp', () => {
    const base = saved(4);
    const live = [{ ...base[3], timestamp: new Date(base[3].timestamp) }];
    expect(mergeRestoredMessages(base, live)).toHaveLength(4);
  });

  test('dedupes by messageId when present', () => {
    const base = [{ type: 'user', content: 'a', messageId: 'x', timestamp: '2026-09-01T10:00:00.000Z' }];
    const live = [{ type: 'user', content: 'a', messageId: 'x', status: 'sent', timestamp: new Date() }];
    expect(mergeRestoredMessages(base, live)).toHaveLength(1);
  });

  test('empty inputs and non-arrays are safe', () => {
    expect(mergeRestoredMessages([], [])).toEqual([]);
    expect(mergeRestoredMessages(undefined, null)).toEqual([]);
    expect(mergeRestoredMessages(saved(2), [])).toHaveLength(2);
  });
});
