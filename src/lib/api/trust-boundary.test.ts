import { describe, expect, it } from 'vitest';

import { parseForwardedIp } from './trust-boundary';

describe('parseForwardedIp', () => {
	it('returns null for empty header', () => {
		expect(parseForwardedIp(null)).toBeNull();
		expect(parseForwardedIp('')).toBeNull();
	});

	it('extracts ipv4 from simple forwarded header', () => {
		expect(parseForwardedIp('for=1.2.3.4')).toBe('1.2.3.4');
	});

	it('extracts first entry when multiple proxies are present', () => {
		expect(parseForwardedIp('for=1.2.3.4, for=5.6.7.8')).toBe('1.2.3.4');
	});

	it('supports quoted and bracketed ipv6', () => {
		expect(parseForwardedIp('for="[2001:db8:cafe::17]"')).toBe('2001:db8:cafe::17');
	});

	it('returns null for unknown or obfuscated values', () => {
		expect(parseForwardedIp('for=unknown')).toBeNull();
		expect(parseForwardedIp('for=_hidden')).toBeNull();
	});

	it('returns null for invalid ip values', () => {
		expect(parseForwardedIp('for=not-an-ip')).toBeNull();
		expect(parseForwardedIp('for=1.2.3.4:abc')).toBeNull();
	});
});
