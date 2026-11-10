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

  // The server copy's history sits in front of the stored chat on screen; the
  // stored list itself does not hold it until the next save.  An agent-list
  // reload in between used to append it after today's chat (review of
  // fc660500, 2026-11-04).
  const today = [
    {type: 'user', content: 'today q', timestamp: '2026-11-04T04:30:00.000Z'},
    {type: 'assistant', content: 'today a', timestamp: '2026-11-04T04:30:05.000Z'},
  ];
  const history = [
    {type: 'user', content: 'next', timestamp: '2026-08-03T10:00:00+00:00'},
    {type: 'assistant', content: 'Page 2.', timestamp: '2026-08-03T10:00:00+00:00'},
  ];
  const card = {type: 'setup_progress', jobType: 'tts_setup', steps: []};

  test("history on screen stays in front of the stored chat when that chat is restored again", () => {
    const out = mergeRestoredMessages(today, [...history, ...today]);
    expect(out.map((m) => m.content)).toEqual(['next', 'Page 2.', 'today q', 'today a']);
  });

  test('a stored list of setup cards keeps the history in front of the cards', () => {
    const out = mergeRestoredMessages([card], [...history, card]);
    expect(out.map((m) => m.content || m.type)).toEqual(['next', 'Page 2.', 'setup_progress']);
  });

  test('a setup card older than the stored chat stays after it (cards are timed when shown)', () => {
    const olderCard = {...card, timestamp: '2026-11-04T04:00:00.000Z'};
    const out = mergeRestoredMessages(today, [olderCard]);
    expect(out.map((m) => m.content || m.type)).toEqual(['today q', 'today a', 'setup_progress']);
  });

  test('with nothing stored, the messages on screen keep their order', () => {
    const live = [card, ...history];
    expect(mergeRestoredMessages([], live)).toEqual(live);
  });
});
