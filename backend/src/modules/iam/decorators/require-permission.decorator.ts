import { SetMetadata } from '@nestjs/common';

export const IAM_REQUIRE_PERMISSION_KEY = 'iam_require_permission';
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(IAM_REQUIRE_PERMISSION_KEY, permissionCode);
