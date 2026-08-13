import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import {
  REQUIRED_PERMISSIONS,
  type PermissionRequirement,
} from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.permissions.length) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.user) throw new UnauthorizedException();
    const hasPermission = required.permissions.some((permission) =>
      request.user?.permissions.includes(permission),
    );
    const resourceId = (request.params as Record<string, string> | undefined)?.[
      required.ownerParam ?? 'id'
    ];
    const isOwner = required.allowOwner && resourceId === request.user.id;
    if (!hasPermission && !isOwner) {
      throw new ForbiddenException();
    }
    return true;
  }
}
