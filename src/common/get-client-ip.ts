import type { FastifyRequest } from 'fastify';

function parseForwardedIp(value: string | undefined): string | undefined {
  if (!value) return undefined;

  // The first element represents the client at the trusted proxy boundary; later elements are hops.
  const match = value.match(/(?:^|,)\s*for=(?:"?)(\[[^\]]+\]|[^;,\s"]+)/i);
  if (!match) return undefined;

  return match[1].replace(/^\[|\]$/g, '');
}

export function getClientIp(request: FastifyRequest): string {
  // Forwarded must be stripped or set only by the trusted edge proxy before requests reach this app.
  return (
    parseForwardedIp(request.headers.forwarded) ??
    request.ip ??
    request.socket.remoteAddress ??
    'unknown'
  );
}
