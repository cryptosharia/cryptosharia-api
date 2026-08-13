import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';

export type PermissionRequirement = {
  permissions: Permission[];
  allowOwner?: boolean;
  ownerParam?: string;
};

export function RequirePermissions(
  ...permissions: Permission[]
): MethodDecorator;

export function RequirePermissions(
  requirement: PermissionRequirement,
): MethodDecorator;

export function RequirePermissions(
  requirementOrPermission: PermissionRequirement | Permission,
  ...permissions: Permission[]
) {
  const requirement: PermissionRequirement =
    typeof requirementOrPermission === 'string'
      ? { permissions: [requirementOrPermission, ...permissions] }
      : requirementOrPermission;

  return SetMetadata(REQUIRED_PERMISSIONS, requirement);
}
