import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { IamService } from './iam.service.js';
import { IamController } from './iam.controller.js';
import { ScopedPermissionGuard } from './guards/scoped-permission.guard.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IamController],
  providers: [IamService, ScopedPermissionGuard],
  exports: [IamService, ScopedPermissionGuard],
})
export class IamModule {}
