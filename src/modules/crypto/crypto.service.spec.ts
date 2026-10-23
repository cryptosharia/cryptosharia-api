import { describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const service = new CryptoService(
    new JwtService({ secret: 'test-secret', signOptions: { issuer: 'test' } }),
  );

  it('signs and verifies a JWT with caller options', async () => {
    const token = await service.signJwt(
      { userId: 'user-id', role: 'member' },
      { issuer: 'test', expiresIn: '15m' },
    );

    await expect(
      service.verifyJwt<{ userId: string; role: string }>(token, {
        issuer: 'test',
      }),
    ).resolves.toMatchObject({ userId: 'user-id', role: 'member' });
  });

  it('generates the expected opaque token format and hashes it deterministically', () => {
    const token = service.generateToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashToken(token)).toBe(service.hashToken(token));
    expect(service.hashToken(token)).not.toBe(service.hashToken('other'));
  });

  it('hashes and verifies passwords with Argon2id', async () => {
    const password = 'correct horse battery staple';
    const hash = await service.hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,/);
    expect(hash).toContain('t=3');
    expect(hash).toContain('p=1');
    expect(hash).not.toContain(password);
    await expect(service.verifyPassword(password, hash)).resolves.toBe(true);
    await expect(service.verifyPassword('wrong password', hash)).resolves.toBe(
      false,
    );
  });

  it('treats malformed stored hashes as a failed credential', async () => {
    await expect(
      service.verifyPassword('any password', 'not-a-phc-hash'),
    ).resolves.toBe(false);
  });
});
