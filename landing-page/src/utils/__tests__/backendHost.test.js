import {isLocalBackendHost, localWampUrl} from '../backendHost';

describe('isLocalBackendHost', () => {
  test('localhost variants → true', () => {
    expect(isLocalBackendHost('localhost')).toBe(true);
    expect(isLocalBackendHost('LOCALHOST')).toBe(true);  // case-insensitive
    expect(isLocalBackendHost('127.0.0.1')).toBe(true);
    expect(isLocalBackendHost('127.42.42.42')).toBe(true); // 127/8 loopback
    expect(isLocalBackendHost('0.0.0.0')).toBe(true);
    expect(isLocalBackendHost('::1')).toBe(true);
    expect(isLocalBackendHost('[::1]')).toBe(true);
  });

  test('RFC1918 private IPv4 → true (LAN privacy invariant)', () => {
    // 10.0.0.0/8
    expect(isLocalBackendHost('10.0.0.1')).toBe(true);
    expect(isLocalBackendHost('10.255.255.255')).toBe(true);
    // 192.168.0.0/16 — typical home WiFi
    expect(isLocalBackendHost('192.168.1.50')).toBe(true);
    expect(isLocalBackendHost('192.168.0.1')).toBe(true);
    // 172.16.0.0/12
    expect(isLocalBackendHost('172.16.0.1')).toBe(true);
    expect(isLocalBackendHost('172.20.10.1')).toBe(true);
    expect(isLocalBackendHost('172.31.255.255')).toBe(true);
  });

  test('addresses just outside RFC1918 → false', () => {
    // 172.15.x.x and 172.32.x.x are public
    expect(isLocalBackendHost('172.15.0.1')).toBe(false);
    expect(isLocalBackendHost('172.32.0.1')).toBe(false);
    // 192.169 is public
    expect(isLocalBackendHost('192.169.1.1')).toBe(false);
    // 11.x.x.x is public
    expect(isLocalBackendHost('11.0.0.1')).toBe(false);
  });

  test('mDNS .local hosts → true', () => {
    expect(isLocalBackendHost('hartos.local')).toBe(true);
    expect(isLocalBackendHost('my-desktop.local')).toBe(true);
  });

  test('link-local → true', () => {
    expect(isLocalBackendHost('169.254.0.1')).toBe(true);
    expect(isLocalBackendHost('169.254.99.99')).toBe(true);
    expect(isLocalBackendHost('fe80::1')).toBe(true);
    expect(isLocalBackendHost('[fe80::1]')).toBe(true);
  });

  test('public hostnames → false (cloud egress)', () => {
    expect(isLocalBackendHost('etime.hertzai.com')).toBe(false);
    expect(isLocalBackendHost('aws_rasa.hertzai.com')).toBe(false);
    expect(isLocalBackendHost('google.com')).toBe(false);
    expect(isLocalBackendHost('8.8.8.8')).toBe(false);
  });

  test('empty / null hostname → false (safe)', () => {
    expect(isLocalBackendHost('')).toBe(false);
    expect(isLocalBackendHost(null)).toBe(false);
    expect(isLocalBackendHost(undefined)).toBe(false);
  });
});

describe('localWampUrl', () => {
  test('localhost → ws://localhost:8088/ws', () => {
    expect(localWampUrl('localhost')).toBe('ws://localhost:8088/ws');
  });

  test('LAN IP → ws://<lan-ip>:8088/ws (privacy: stays on LAN)', () => {
    expect(localWampUrl('192.168.1.50')).toBe('ws://192.168.1.50:8088/ws');
    expect(localWampUrl('10.0.0.1')).toBe('ws://10.0.0.1:8088/ws');
  });

  test('mDNS host → ws://<host>.local:8088/ws', () => {
    expect(localWampUrl('hartos.local')).toBe('ws://hartos.local:8088/ws');
  });

  test('IPv6 literal gets bracketed', () => {
    expect(localWampUrl('fe80::1')).toBe('ws://[fe80::1]:8088/ws');
    expect(localWampUrl('[fe80::1]')).toBe('ws://[fe80::1]:8088/ws');
  });

  test('protocol override (wss for TLS-enabled deployments)', () => {
    expect(localWampUrl('192.168.1.50', 'wss')).toBe('wss://192.168.1.50:8088/ws');
  });

  test('port override', () => {
    expect(localWampUrl('localhost', 'ws', 8089)).toBe('ws://localhost:8089/ws');
  });

  test('null/empty hostname → defaults to localhost', () => {
    expect(localWampUrl()).toBe('ws://localhost:8088/ws');
    expect(localWampUrl('')).toBe('ws://localhost:8088/ws');
  });
});
