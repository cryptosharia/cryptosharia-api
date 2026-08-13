import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { REQUIRED_PERMISSIONS } from './require-permissions.decorator';
import type { Permission } from './permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.user) throw new UnauthorizedException();
    if (
      !required.some((permission) =>
        request.user?.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException();
    }
    return true;
  }
}
