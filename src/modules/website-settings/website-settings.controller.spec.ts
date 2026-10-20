import { Reflector } from '@nestjs/core';
import {
  ForbiddenException,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY } from '#src/common/public.decorator';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { REQUIRED_PERMISSIONS } from '#src/modules/security/require-permissions.decorator';
import { WebsiteSettingsController } from './website-settings.controller';

describe('WebsiteSettingsController access contract', () => {
  const reflector = new Reflector();
  const prototype = WebsiteSettingsController.prototype;

  it('keeps the public endpoint read-only and explicitly public', () => {
    expect(
      reflector.get(IS_PUBLIC_KEY, prototype.getPublicAcademyVisibility),
    ).toBe(true);
    expect(
      Reflect.getMetadata('method', prototype.getPublicAcademyVisibility),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata('path', prototype.getPublicAcademyVisibility),
    ).toBe('public/site-settings/academy');
  });

  it('requires the dedicated website settings permission for both admin operations', () => {
    for (const operation of [
      prototype.getAdminAcademyVisibility,
      prototype.updateAcademyVisibility,
    ]) {
      expect(reflector.get(REQUIRED_PERMISSIONS, operation)).toEqual({
        permissions: ['website.settings.manage'],
      });
    }
    expect(
      Reflect.getMetadata('method', prototype.updateAcademyVisibility),
    ).toBe(RequestMethod.PUT);
  });

  it('allows only authenticated requests carrying the settings permission', () => {
    const guard = new PermissionGuard(reflector);
    const handler = prototype.updateAcademyVisibility;
    const makeContext = (permissions?: string[]) =>
      ({
        getHandler: () => handler,
        getClass: () => WebsiteSettingsController,
        switchToHttp: () => ({
          getRequest: () => ({
            raw: permissions
              ? { user: { id: 'synthetic-admin', permissions } }
              : { user: undefined },
          }),
        }),
      }) as unknown as ExecutionContext;

    expect(() => guard.canActivate(makeContext())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(makeContext([]))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(makeContext(['website.settings.manage']))).toBe(
      true,
    );
  });
});
