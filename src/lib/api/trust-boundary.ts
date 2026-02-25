import { isIP } from 'node:net';

function extractForToken(forwarded: string): string | null {
	const firstEntry = forwarded.split(',')[0]?.trim();
	if (!firstEntry) return null;

	for (const part of firstEntry.split(';')) {
		const segment = part.trim();
		if (!segment.toLowerCase().startsWith('for=')) continue;

		const raw = segment.slice(4).trim();
		if (!raw) return null;

		if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
			return raw.slice(1, -1);
		}

		return raw;
	}

	return null;
}

function normalizeForwardedFor(value: string): string | null {
	if (!value || value.toLowerCase() === 'unknown' || value.startsWith('_')) {
		return null;
	}

	if (value.startsWith('[')) {
		const closingBracket = value.indexOf(']');
		if (closingBracket === -1) return null;
		return value.slice(1, closingBracket);
	}

	if (value.includes(':') && value.includes('.')) {
		const [maybeIpv4, maybePort] = value.split(':');
		if (!maybeIpv4) return null;
		if (!maybePort) return maybeIpv4;
		return /^\d+$/.test(maybePort) ? maybeIpv4 : null;
	}

	return value;
}

export function parseForwardedIp(forwardedHeader: string | null): string | null {
	if (!forwardedHeader) return null;

	const forToken = extractForToken(forwardedHeader);
	if (!forToken) return null;

	const candidateIp = normalizeForwardedFor(forToken);
	if (!candidateIp) return null;

	return isIP(candidateIp) > 0 ? candidateIp : null;
}
