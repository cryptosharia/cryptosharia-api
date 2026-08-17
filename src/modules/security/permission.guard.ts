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

    // BearerAuthMiddleware (run by @fastify/middie) resolves the user on
    // req.raw, the raw IncomingMessage, not on the FastifyRequest wrapper.
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.raw.user) throw new UnauthorizedException();
    const hasPermission = required.permissions.some((permission) =>
      request.raw.user?.permissions.includes(permission),
    );
    const resourceId = (request.params as Record<string, string> | undefined)?.[
      required.ownerParam ?? 'id'
    ];
    // Ownership is an alternative grant only for routes that opt in via allowOwner.
    const isOwner = required.allowOwner && resourceId === request.raw.user.id;
    if (!hasPermission && !isOwner) {
      throw new ForbiddenException();
    }
    return true;
  }
}
