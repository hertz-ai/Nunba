/**
 * How the agent audit page words a line of the HARTOS audit trail.
 *
 * Review of 33d0e576 (2026-11-20): a refusal read "Nothing recorded", text cut
 * at 20,000 characters showed no note, the person's role read as the agent's
 * ("agent · human admin flat"), and Video had no filter.
 */
import {
  trailBody, trailCheckChip, trailError, trailKindFilters, trailWho,
} from '../../utils/auditTrail';

describe('trailWho', () => {
  it('labels the agent role and the person role apart', () => {
    const who = trailWho({actor: 'agent', agent_role: 'Teller',
      person_role: {kind: 'human', tier: 'flat', admin: true}});
    expect(who).toBe('agent · agent role: Teller · person: human, admin, tier flat');
  });

  it('names only who acted when no roles are on the line', () => {
    expect(trailWho({actor: 'person'})).toBe('person');
    expect(trailWho({dir: 'sys'})).toBe('sys');
  });
});

describe('trailBody', () => {
  it('says when text was cut and that the checksum covers all of it', () => {
    const body = trailBody({text: 'a'.repeat(5), text_len: 25000});
    expect(body.startsWith('aaaaa\n')).toBe(true);
    expect(body).toContain('first 5 of 25000 characters kept');
  });

  it('counts characters the way HARTOS does, so cut emoji text is still marked', () => {
    // 3 emoji = 3 code points (HARTOS len) but 6 UTF-16 units (JS length).
    const body = trailBody({text: '😀😀😀', text_len: 5});
    expect(body).toContain('first 3 of 5 characters kept');
    expect(trailBody({text: '😀😀😀', text_len: 3})).toBe('😀😀😀');
  });

  it('shows whole text as it is', () => {
    expect(trailBody({text: 'hello', text_len: undefined})).toBe('hello');
  });

  it('says text was withheld when only its length and checksum are kept', () => {
    expect(trailBody({kind: 'message', text_len: 12})).toBe(
      'text withheld (12 characters; checksum kept)');
  });

  it('describes a media line by what it points at', () => {
    expect(trailBody({kind: 'file', extra: {event: 'received', name: 'statement.pdf'}}))
      .toBe('received · statement.pdf');
  });
});

describe('trailError', () => {
  it('tells a refusal apart from an empty trail', () => {
    expect(trailError({status: 403})).toMatch(/owner or an admin/);
    expect(trailError({status: 404})).toMatch(/does not serve the audit trail/);
  });

  it('passes the server reason on otherwise', () => {
    expect(trailError({status: 500, error: 'disk is full'})).toBe(
      'The trail could not be read: disk is full.');
    expect(trailError(undefined)).toBe('The trail could not be read.');
  });
});

/* Owner 2026-11-21, "One view, two stores": the page shows the trail and
 * HARTOS's security event log as one trail, and HARTOS sends the kinds it can
 * filter by (meta.kinds), so the page keeps no copy of the trail's kinds
 * (parallel-path audit row N12). */
describe('trailKindFilters', () => {
  it('offers All and exactly the kinds the server sent, in its order', () => {
    expect(trailKindFilters(['message', 'security_event', 'action'])).toEqual([
      ['', 'All'], ['message', 'Messages'], ['security_event', 'Security events'],
      ['action', 'Actions']]);
  });

  it('names a kind it has no label for by the kind itself', () => {
    expect(trailKindFilters(['tool_receipt'])).toEqual([['', 'All'],
      ['tool_receipt', 'tool_receipt']]);
  });

  it('offers only All when the server sent no kinds', () => {
    expect(trailKindFilters(undefined)).toEqual([['', 'All']]);
    expect(trailKindFilters(['', null, 7])).toEqual([['', 'All']]);
  });
});

/* Review of 11c79a22: a broken event-log chain showed only
 * {"missing":[],"segments":[]} and "intact" never named the event log. */
describe('trailCheckChip', () => {
  const day = {segment: '2026-11-21_1-000.jsonl', lines: 4, ok: true, reason: ''};

  it('says intact only with both stores whole, and names each', () => {
    const chip = trailCheckChip({state: 'done', ok: true, segments: [day], missing: [],
      event_log: {ok: true, reason: 'Chain valid (1005 entries)', checked: 1005, total: 1005}});
    expect(chip.label).toBe('Whole trail on this node: intact');
    expect(chip.title).toBe("Trail: 1 day file(s) checked, every agent's lines, intact. "
      + 'Security event log: Chain valid (1005 entries).');
  });

  it('calls a broken event log broken and says where', () => {
    const chip = trailCheckChip({state: 'done', ok: false, segments: [day], missing: [],
      event_log: {ok: false, reason: 'Chain broken at entry 3: expected ab..., got cd...',
        checked: 2, total: 9}});
    expect(chip.label).toBe('Whole trail on this node: broken');
    expect(chip.title).toContain('Security event log: Chain broken at entry 3');
  });

  it('calls a walk the node cut short partly checked, never intact', () => {
    const chip = trailCheckChip({state: 'done', ok: false, segments: [day], missing: [],
      event_log: {ok: true, checked: 175000, total: 311396,
        reason: '175000 of 311396 entries checked, all valid; the newer 136396 were '
          + 'not read in the time allowed'}});
    expect(chip.label).toBe('Whole trail on this node: partly checked');
    expect(chip.title).toContain('175000 of 311396 entries checked');
  });

  it('names a missing day file and a broken one in plain words', () => {
    const chip = trailCheckChip({state: 'done', ok: false, missing: ['2026-11-20_1-000.jsonl'],
      segments: [{...day, ok: false, reason: 'line 2 does not match the line before it'}],
      event_log: {ok: true, reason: 'Chain valid (2 entries)', checked: 2, total: 2}});
    expect(chip.label).toBe('Whole trail on this node: broken');
    expect(chip.title).toContain('day file missing: 2026-11-20_1-000.jsonl');
    expect(chip.title).toContain('line 2 does not match the line before it');
  });

  it('says when a node did not check the event log at all', () => {
    const chip = trailCheckChip({state: 'done', ok: true, segments: [day], missing: []});
    expect(chip.title).toContain('Security event log: not checked by this node');
  });
});

describe('a security event line', () => {
  const row = {kind: 'security_event', ts: '2026-11-21T08:00:01.000+00:00',
    text: 'a2ui_push: push card component', actor: 'owner', agent_id: '54',
    hash: 'h1', prev: 'h0', detail: {type: 'card'}, source: 'event_log'};

  it('reads as its event and action, and names who acted', () => {
    expect(trailBody(row)).toBe('a2ui_push: push card component');
    expect(trailWho(row)).toBe('owner');
  });
});
