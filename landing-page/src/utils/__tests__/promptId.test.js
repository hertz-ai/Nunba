import {adoptMintedPromptId} from '../promptId';

// Owner design 2026-08-24: "once an agent creation or reuse flow starts
// the chatbot route shd start seeing that prompt id".  The backend
// returns the minted prompt_id on every /chat response; surfaces adopt
// it with this one rule so follow-up turns stop arriving prompt_id-less
// (which the route reads as a casual companion turn).
describe('adoptMintedPromptId', () => {
  it('adopts a minted id when the session had none', () => {
    expect(adoptMintedPromptId(null, 'iq_ab12_cd34')).toBe('iq_ab12_cd34');
    expect(adoptMintedPromptId(0, '20260824301')).toBe('20260824301');
    expect(adoptMintedPromptId('0', 'iq_x')).toBe('iq_x');
  });

  it('ignores empty / zero / stringified-null response ids', () => {
    expect(adoptMintedPromptId(null, null)).toBeNull();
    expect(adoptMintedPromptId(null, undefined)).toBeNull();
    expect(adoptMintedPromptId(null, 0)).toBeNull();
    expect(adoptMintedPromptId(null, '0')).toBeNull();
    expect(adoptMintedPromptId(null, '')).toBeNull();
    expect(adoptMintedPromptId(null, 'null')).toBeNull();
    expect(adoptMintedPromptId(null, 'undefined')).toBeNull();
  });

  it('never hijacks an explicit agent context', () => {
    expect(adoptMintedPromptId('iq_current', 'iq_other')).toBeNull();
    expect(adoptMintedPromptId('iq_current', 'iq_current')).toBeNull();
    expect(adoptMintedPromptId(42, 'iq_other')).toBeNull();
  });
});
