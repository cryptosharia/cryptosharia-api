import { getClientIp } from './get-client-ip';

describe('getClientIp', () => {
  it('uses the first client address from Forwarded', () => {
    const request = {
      headers: { forwarded: 'for=203.0.113.10, for=198.51.100.4' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    expect(getClientIp(request as never)).toBe('203.0.113.10');
  });

  it('removes brackets from an IPv6 Forwarded address', () => {
    const request = {
      headers: { forwarded: 'for="[2001:db8::1]"' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    expect(getClientIp(request as never)).toBe('2001:db8::1');
  });

  it('falls back to the runtime IP for malformed Forwarded data', () => {
    const request = {
      headers: { forwarded: 'invalid' },
      ip: '192.0.2.5',
      socket: { remoteAddress: '127.0.0.1' },
    };

    expect(getClientIp(request as never)).toBe('192.0.2.5');
  });
});
