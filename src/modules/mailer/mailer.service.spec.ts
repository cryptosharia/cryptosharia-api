import { describe, expect, it, vi } from 'vitest';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  it('adds configured sender and reply-to values before delegating', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const service = new MailerService(
      { send } as never,
      {
        getOrThrow: vi.fn((key: string) =>
          key === 'RESEND_FROM'
            ? 'CryptoSharia <system@example.com>'
            : 'support@example.com',
        ),
        get: vi.fn(),
      } as never,
    );

    await service.send({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: '<p>Verify</p>',
    });

    expect(send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: '<p>Verify</p>',
      from: 'CryptoSharia <system@example.com>',
      replyTo: 'support@example.com',
    });
  });

  it('prefers a per-message reply-to value', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const service = new MailerService(
      { send } as never,
      {
        getOrThrow: vi.fn((key: string) =>
          key === 'RESEND_FROM' ? 'system@example.com' : 'support@example.com',
        ),
        get: vi.fn(),
      } as never,
    );

    await service.send({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
      replyTo: 'custom@example.com',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'custom@example.com' }),
    );
  });
});
