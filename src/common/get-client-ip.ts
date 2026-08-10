import type { FastifyRequest } from 'fastify';

function parseForwardedIp(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const match = value.match(/(?:^|,)\s*for=(?:"?)(\[[^\]]+\]|[^;,\s"]+)/i);
  if (!match) return undefined;

  return match[1].replace(/^\[|\]$/g, '');
}

export function getClientIp(request: FastifyRequest): string {
  return (
    parseForwardedIp(request.headers.forwarded) ??
    request.ip ??
    request.socket.remoteAddress ??
    'unknown'
  );
}
