/**
 * How the agent audit page words a line of the HARTOS audit trail.
 *
 * Review of 33d0e576 (2026-11-20): a refusal read "Nothing recorded", text cut
 * at 20,000 characters showed no note, the person's role read as the agent's
 * ("agent · human admin flat"), and Video had no filter.
 */
import {TRAIL_KINDS, trailBody, trailError, trailWho} from '../../utils/auditTrail';

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

it('has a filter for every media kind the trail records', () => {
  const kinds = TRAIL_KINDS.map(([k]) => k);
  ['message', 'transcript', 'audio', 'video', 'file', 'image_caption',
    'screen_caption', 'video_caption', 'llm_call', 'speech_out', 'action']
    .forEach((k) => expect(kinds).toContain(k));
});
