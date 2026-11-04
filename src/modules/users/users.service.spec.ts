import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { AssetsService } from '#src/modules/assets/assets.service';
import type { AuditService } from '#src/modules/audit/audit.service';
import type { CryptoService } from '#src/modules/crypto/crypto.service';
import type { UserRecord } from '#src/modules/drizzle/drizzle.types';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    selectById: ReturnType<typeof vi.fn>;
    selectByEmail: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    insertWithPassword: ReturnType<typeof vi.fn>;
    selectAll: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateLastLoginAt: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
    hasPassword: ReturnType<typeof vi.fn>;
  };
  let assetsService: {
    toAssetMetadata: ReturnType<typeof vi.fn>;
  };
  let auditService: {
    log: ReturnType<typeof vi.fn>;
  };
  let cryptoService: {
    hashPassword: ReturnType<typeof vi.fn>;
  };

  const sampleUser: UserRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Admin Baru',
    email: 'adminbaru@cryptosharia.id',
    avatarId: null,
    role: 'admin',
    status: 'active',
    passwordHash: 'hashed-pwd',
    passwordSetAt: new Date(),
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
  };

  beforeEach(() => {
    usersRepository = {
      selectById: vi.fn(),
      selectByEmail: vi.fn(),
      insert: vi.fn(),
      insertWithPassword: vi.fn(),
      selectAll: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateLastLoginAt: vi.fn(),
      updatePassword: vi.fn(),
      hasPassword: vi.fn(),
    };
    assetsService = {
      toAssetMetadata: vi.fn().mockReturnValue(null),
    };
    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    cryptoService = {
      hashPassword: vi.fn().mockResolvedValue('hashed-argon2-pwd'),
    };

    service = new UsersService(
      usersRepository as unknown as UsersRepository,
      assetsService as unknown as AssetsService,
      auditService as unknown as AuditService,
      cryptoService as unknown as CryptoService,
    );
  });

  describe('create', () => {
    it('hashes password and creates user with audit log', async () => {
      usersRepository.insertWithPassword.mockResolvedValue(sampleUser);

      const result = await service.create(
        {
          name: 'Admin Baru',
          email: 'adminbaru@cryptosharia.id',
          password: 'SecretPassword123!',
          role: 'admin',
          status: 'active',
        },
        {
          id: '00000000-0000-4000-8000-000000000000',
          ipAddress: '127.0.0.1',
        },
      );

      expect(cryptoService.hashPassword).toHaveBeenCalledWith('SecretPassword123!');
      expect(usersRepository.insertWithPassword).toHaveBeenCalledWith(
        {
          name: 'Admin Baru',
          email: 'adminbaru@cryptosharia.id',
          passwordHash: 'hashed-argon2-pwd',
          role: 'admin',
          status: 'active',
        },
        undefined,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '00000000-0000-4000-8000-000000000000',
          action: 'user.create',
          subjectType: 'user',
          subjectId: sampleUser.id,
        }),
      );
      expect(result.id).toBe(sampleUser.id);
      expect(result.email).toBe(sampleUser.email);
      expect(result.role).toBe(sampleUser.role);
    });
  });
});
