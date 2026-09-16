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
  CONSENT_ASKS, FINGERPRINT_CAPTION, PRIVACY_CARD_TYPES, askTitle, canDecline,
  declineLabel, deviceFingerprint, grantLabel, isPerRequester,
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

describe('an agent ask is unchanged', () => {
  test('grants every agent and declines the one agent by name', () => {
    expect(grantLabel('computer_control')).toBe('Allow ALL agents to control this computer');
    expect(declineLabel('computer_control', '88659566083', 'Disk Watch Dan'))
      .toBe("Don't allow Disk Watch Dan");
    expect(declineLabel('computer_control', '88659566083', '')).toBe("Don't allow this agent");
    expect(declineLabel('computer_control', null, '')).toBe("Don't allow");
  });
});
