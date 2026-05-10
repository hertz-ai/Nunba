import {formatTier} from '../tier';

describe('formatTier', () => {
  test('local + flat → On-device green (privacy happy path)', () => {
    const t = formatTier('local', 'flat');
    expect(t.label).toBe('On-device');
    expect(t.emoji).toBe('🔒');
    expect(t.color).toBe('#2ECC71');
    expect(t.sublabel).toBe('flat node');
  });

  test('local + regional → LAN darker green', () => {
    const t = formatTier('local', 'regional');
    expect(t.label).toBe('LAN');
    expect(t.emoji).toBe('🏠');
    expect(t.color).toBe('#27AE60');
  });

  test('local + central → On-host (central serves itself)', () => {
    const t = formatTier('local', 'central');
    expect(t.label).toBe('On-host');
    expect(t.sublabel).toBe('central node');
  });

  test('cloud overrides tier — bytes left the box, that is what user sees', () => {
    // Privacy invariant: cloud egress is shown amber regardless
    // of which node tier originated the request.
    expect(formatTier('cloud', 'flat').label).toBe('Cloud');
    expect(formatTier('cloud', 'flat').color).toBe('#F39C12');
    expect(formatTier('cloud', 'regional').label).toBe('Cloud');
    expect(formatTier('langchain_cloud', 'flat').label).toBe('Cloud');
  });

  test('hive → federated peers blue', () => {
    const t = formatTier('hive', 'flat');
    expect(t.label).toBe('Hive');
    expect(t.emoji).toBe('🐝');
    expect(t.sublabel).toBe('federated peers');
  });

  test('undefined inputs → safe On-device default', () => {
    const t = formatTier();
    expect(t.label).toBe('On-device');
    expect(t.color).toBe('#2ECC71');
  });

  test('case-insensitive tier matching', () => {
    expect(formatTier('LOCAL', 'REGIONAL').label).toBe('LAN');
    expect(formatTier('Cloud', 'Flat').label).toBe('Cloud');
  });

  test('empty strings treated as defaults', () => {
    const t = formatTier('', '');
    expect(t.label).toBe('On-device');
  });

  test('cloud sublabel includes originating tier', () => {
    expect(formatTier('cloud', 'flat').sublabel).toBe('flat → cloud');
    expect(formatTier('cloud', 'regional').sublabel).toBe('regional → cloud');
    expect(formatTier('cloud', 'central').sublabel).toBe('central');
  });
});
