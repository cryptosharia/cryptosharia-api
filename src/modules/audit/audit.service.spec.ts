import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let repository: { insert: ReturnType<typeof vi.fn> };
  let service: AuditService;

  beforeEach(() => {
    repository = { insert: vi.fn() };
    service = new AuditService(repository as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delegates an activity log to the repository', async () => {
    repository.insert.mockResolvedValue(undefined);
    const input = {
      userId: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
      action: 'user.update',
      subjectType: 'user',
      subjectId: '33918257-c532-4e5c-a0a8-b1173883cb80',
      description: 'Updated user profile',
      ipAddress: '127.0.0.1',
    } satisfies Parameters<AuditService['log']>[0];

    await expect(service.log(input)).resolves.toBeUndefined();
    expect(repository.insert).toHaveBeenCalledWith(input);
  });

  it('swallows repository failures', async () => {
    repository.insert.mockRejectedValue(new Error('Database unavailable'));
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.log({ action: 'user.update', subjectType: 'user' }),
    ).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(
      'Gagal mencatat aktivitas: user.update',
    );
    loggerError.mockRestore();
  });
});
