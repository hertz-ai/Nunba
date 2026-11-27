/**
 * Face agents open in video, every other agent in voice, and a person's own choice stays theirs
 * (owner 27 Nov).
 */
import {agentKey, openingMode, rememberChoice, rememberedChoice} from '../../utils/agentMediaMode';

describe('agentMediaMode', () => {
  beforeEach(() => localStorage.clear());

  it('an agent with a face opens in video, one without in voice', () => {
    expect(openingMode({prompt_id: 1, teacher_avatar_id: 1000000003})).toBe('video');
    expect(openingMode({prompt_id: 2})).toBe('audio');
    expect(openingMode({prompt_id: 3, teacher_avatar_id: null})).toBe('audio');
  });

  it("the person's own choice for an agent wins, and only for that agent", () => {
    rememberChoice({prompt_id: 1}, 'audio');
    expect(openingMode({prompt_id: 1, teacher_avatar_id: 7})).toBe('audio');
    expect(openingMode({prompt_id: 4, teacher_avatar_id: 7})).toBe('video');
    rememberChoice({prompt_id: 2}, 'text');
    expect(openingMode({prompt_id: 2})).toBe('text');
  });

  it('an unknown agent decides nothing, and a bad stored value is ignored', () => {
    expect(openingMode(null)).toBeNull();
    expect(openingMode({})).toBeNull();
    localStorage.setItem('nunba_media_mode_choice:5', 'hologram');
    expect(rememberedChoice({prompt_id: 5})).toBeNull();
    expect(openingMode({prompt_id: 5, teacher_avatar_id: 9})).toBe('video');
  });

  it('keys an agent by prompt_id, else id, else name', () => {
    expect(agentKey({prompt_id: 0})).toBe('0');
    expect(agentKey({id: 'a'})).toBe('a');
    expect(agentKey({name: 'Zoey'})).toBe('Zoey');
  });
});
