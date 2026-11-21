/**
 * constants/consentAsks — the words on a consent card, pinned.
 *
 * A device ask (#111) is a phone on the network asking to use this
 * computer's agents.  The name it carries is self-asserted, so the card
 * never states it as fact: the title quotes it as a claim, the fingerprint
 * of the phone's key is what the owner matches against the phone, and the
 * buttons name "this phone", never the person (hartos-63: "that wording IS
 * the security control").
 */
import {
  CONSENT_ASKS, FINGERPRINT_CAPTION, PRIVACY_CARD_TYPES, askTitle, askerName, askerOf, canDecline,
  declineLabel, declineNote, deviceFingerprint, grantLabel, isPerRequester,
} from '../constants/consentAsks';

const KEY = '3f9a1c0277deb4e1' + 'c'.repeat(48);

describe('deviceFingerprint — the same rule as HARTOS device_fingerprint', () => {
  test('first 16 hex of the key in four groups, from a device scope or a bare key', () => {
    expect(deviceFingerprint(`device:${KEY}`)).toBe('3f9a 1c02 77de b4e1');
    expect(deviceFingerprint(KEY)).toBe('3f9a 1c02 77de b4e1');
  });

  test('lowercase, whatever the phone sent', () => {
    expect(deviceFingerprint(`device:${KEY.toUpperCase()}`)).toBe('3f9a 1c02 77de b4e1');
  });

  test('null for anything that is not a 64-hex key', () => {
    expect(deviceFingerprint('device:*')).toBeNull();
    expect(deviceFingerprint('*')).toBeNull();
    expect(deviceFingerprint(`device:${'a'.repeat(63)}`)).toBeNull();
    expect(deviceFingerprint(`device:${'g'.repeat(64)}`)).toBeNull();
    expect(deviceFingerprint(null)).toBeNull();
    expect(deviceFingerprint(42)).toBeNull();
  });
});

describe('a device ask on the card', () => {
  test('is per requester and has its way back on the privacy page', () => {
    expect(isPerRequester('device_access')).toBe(true);
    expect(CONSENT_ASKS.device_access.privacyCard).toBe(true);
    expect(PRIVACY_CARD_TYPES).toContain('device_access');
    expect(canDecline('device_access')).toBe(true);
  });

  test('the title quotes the name as a claim, or says the phone is unnamed', () => {
    expect(askTitle('device_access', 'Giri')).toBe('A phone calling itself "Giri"');
    expect(askTitle('device_access', '  Giri  ')).toBe('A phone calling itself "Giri"');
    expect(askTitle('device_access', '')).toBe('An unnamed phone');
    expect(askTitle('device_access', undefined)).toBe('An unnamed phone');
  });

  test('an agent ask keeps its title', () => {
    expect(askTitle('computer_control', 'Disk Watch Dan')).toBe('Permission needed');
    expect(isPerRequester('computer_control')).toBe(false);
  });

  test('the buttons name this phone, never the self-asserted name', () => {
    expect(grantLabel('device_access', 'Giri')).toBe('Always allow this phone');
    expect(declineLabel('device_access', null, 'Giri')).toBe("Don't allow");
    expect(grantLabel('device_access', 'Giri')).not.toMatch(/Giri/);
    expect(grantLabel('device_access', 'Giri')).not.toMatch(/ALL/);
  });

  test('the caption tells the owner what to do with the code', () => {
    expect(FINGERPRINT_CAPTION).toBe('Check the code matches on the phone');
  });
});

describe('an agent ask grants every agent and declines this one by name', () => {
  test('grants every agent and declines the one agent by name', () => {
    expect(grantLabel('computer_control')).toBe('Allow ALL agents to control this computer');
    expect(declineLabel('computer_control', '88659566083', 'Disk Watch Dan'))
      .toBe("Don't allow Agent Disk Watch Dan");
    expect(declineLabel('computer_control', '88659566083', '')).toBe("Don't allow this agent");
    expect(declineLabel('computer_control', null, '')).toBe("Don't allow");
  });
});

describe('askerName: an agent is named as an agent', () => {
  // Owner 2026-11-11: an agent named "Vijai" read as another person asking.
  test('says Agent before the name, once', () => {
    expect(askerName('Vijai')).toBe('Agent Vijai');
    expect(askerName('Agent Smith')).toBe('Agent Smith');
    // Case-blind, and only the whole word: review of 71477fa7, m2.
    expect(askerName('agent smith')).toBe('agent smith');
    expect(askerName('Agentic')).toBe('Agent Agentic');
    expect(askerName('  ')).toBe('An agent');
    expect(askerName(undefined)).toBe('An agent');
  });
});

describe('declineNote: only a credential promises "Allow asking again"', () => {
  // Review m5: the fallback promised the privacy page's credential list for
  // every type without a privacy card, and that list shows credentials only.
  test('a credential names the way back', () => {
    expect(declineNote('credential', 'No')).toMatch(/"Allow asking again" in Privacy settings/);
  });

  test('a privacy-card type names its card; any other type promises nothing', () => {
    expect(declineNote('computer_control', 'No')).toMatch(/until you allow it again in Privacy settings/);
    const other = declineNote('data_access', 'No');
    expect(other).not.toMatch(/Allow asking again/);
    expect(other).not.toMatch(/Privacy settings/);
  });
});

describe('askerOf: the page shows who asks as HARTOS said it', () => {
  // HARTOS consent_service._named sends agent_asker beside agent_name: the
  // name as a card says it.  The page shows that text and words nothing
  // itself; a made-up wording here proves it is not re-derived from the name.
  test("the ask's own wording is shown as sent", () => {
    expect(askerOf({agent_name: 'Vijai', agent_asker: 'Agent Vijai'})).toBe('Agent Vijai');
    expect(askerOf({agent_name: 'Vijai', agent_asker: 'The agent Vijai'})).toBe('The agent Vijai');
    expect(askerOf({agent_name: 'Vijai', agent_asker: '  Agent Vijai '})).toBe('Agent Vijai');
  });

  test('a payload with only a name is worded as before', () => {
    expect(askerOf({agent_name: 'Vijai'})).toBe('Agent Vijai');
    expect(askerOf({agent_name: 'Agent Smith'})).toBe('Agent Smith');
    expect(askerOf({agent_name: 'agent smith'})).toBe('agent smith');
    expect(askerOf({agent_name: 'Agentic'})).toBe('Agent Agentic');
    expect(askerOf({agent_name: 'Vijai', agent_asker: '   '})).toBe('Agent Vijai');
    expect(askerOf({agent_name: 'Vijai', agent_asker: null})).toBe('Agent Vijai');
  });

  test('nobody named is "An agent"', () => {
    expect(askerOf({})).toBe('An agent');
    expect(askerOf({agent_name: '  '})).toBe('An agent');
    expect(askerOf(undefined)).toBe('An agent');
  });
});

describe("declineLabel: the button says the ask's own wording", () => {
  test('an ask that says who asks is declined in those words', () => {
    expect(declineLabel('computer_control', '7', 'Vijai', 'The agent Vijai'))
      .toBe("Don't allow The agent Vijai");
    expect(declineLabel('computer_control', '7', 'Vijai', 'Agent Vijai'))
      .toBe("Don't allow Agent Vijai");
  });

  test('without it the name is worded as before, and no name is "this agent"', () => {
    expect(declineLabel('computer_control', '7', 'Vijai')).toBe("Don't allow Agent Vijai");
    expect(declineLabel('computer_control', '7', 'Agent Smith', '')).toBe("Don't allow Agent Smith");
    expect(declineLabel('computer_control', '7', '', '')).toBe("Don't allow this agent");
    expect(declineLabel('computer_control', '7')).toBe("Don't allow this agent");
  });

  test("a phone's button never names anyone, whatever the ask carries", () => {
    expect(declineLabel('device_access', null, 'Giri', 'Agent Giri')).toBe("Don't allow");
    expect(declineLabel('device_access', '7', 'Giri', 'Agent Giri')).toBe("Don't allow");
    expect(declineLabel('computer_control', null, 'Vijai', 'Agent Vijai')).toBe("Don't allow");
  });
});
