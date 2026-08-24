import {rememberServerPromptId} from '../promptId';

// Owner design 2026-08-24: "once an agent creation or reuse flow starts
// the chatbot route shd start seeing that prompt id".  The backend
// returns the minted prompt_id on every /chat response; surfaces adopt
// it with this one rule so follow-up turns stop arriving prompt_id-less
// (which the route reads as a casual companion turn).
describe('rememberServerPromptId', () => {
  it('adopts a minted id when the session had none', () => {
    expect(rememberServerPromptId(null, 'iq_ab12_cd34')).toBe('iq_ab12_cd34');
    expect(rememberServerPromptId(0, '20260824301')).toBe('20260824301');
    expect(rememberServerPromptId('0', 'iq_x')).toBe('iq_x');
  });

  it('ignores empty / zero / stringified-null response ids', () => {
    expect(rememberServerPromptId(null, null)).toBeNull();
    expect(rememberServerPromptId(null, undefined)).toBeNull();
    expect(rememberServerPromptId(null, 0)).toBeNull();
    expect(rememberServerPromptId(null, '0')).toBeNull();
    expect(rememberServerPromptId(null, '')).toBeNull();
    expect(rememberServerPromptId(null, 'null')).toBeNull();
    expect(rememberServerPromptId(null, 'undefined')).toBeNull();
  });

  it('never hijacks an explicit agent context', () => {
    expect(rememberServerPromptId('iq_current', 'iq_other')).toBeNull();
    expect(rememberServerPromptId('iq_current', 'iq_current')).toBeNull();
    expect(rememberServerPromptId(42, 'iq_other')).toBeNull();
  });
});
