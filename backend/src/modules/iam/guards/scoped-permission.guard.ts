import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAM_REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import {
  IAM_RESOLVE_SCOPE_NODE_KEY,
  ResolveScopeNodeOptions,
} from '../decorators/resolve-scope-node.decorator.js';
import { IamService } from '../iam.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ScopedPermissionGuard implements CanActivate {
  private readonly logger = new Logger(ScopedPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly iamService: IamService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      IAM_REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Access denied: Unauthenticated principal');
    }

    const scopeOptions = this.reflector.getAllAndOverride<ResolveScopeNodeOptions>(
      IAM_RESOLVE_SCOPE_NODE_KEY,
      [context.getHandler(), context.getClass()],
    ) || { source: 'params', field: 'nodeId' };

    // Resolve target scope node ID
    let targetNodeId: string | undefined;

    if (scopeOptions.source === 'params') {
      targetNodeId = request.params?.[scopeOptions.field || 'nodeId'];
    } else if (scopeOptions.source === 'query') {
      targetNodeId = request.query?.[scopeOptions.field || 'nodeId'];
    } else if (scopeOptions.source === 'body') {
      targetNodeId = request.body?.[scopeOptions.field || 'nodeId'];
    }

    // Common fallbacks if not matched
    if (!targetNodeId) {
      targetNodeId =
        request.params?.nodeId ||
        request.params?.scopeNodeId ||
        request.query?.nodeId ||
        request.query?.scopeNodeId ||
        request.body?.scopeNodeId ||
        request.body?.nodeId;
    }

    // If still not found, check if machineId or plantId was provided and map to ScopeNode
    if (!targetNodeId && (request.params?.machineId || request.body?.machineId || request.query?.machineId)) {
      const machineId = request.params?.machineId || request.body?.machineId || request.query?.machineId;
      const matchedNode = await this.prisma.scopeNode.findFirst({
        where: { OR: [{ machineId }, { code: machineId.toLowerCase() }] },
      });
      if (matchedNode) {
        targetNodeId = matchedNode.id;
      }
    }

    if (!targetNodeId && (request.params?.plantId || request.body?.plantId || request.query?.plantId)) {
      const plantId = request.params?.plantId || request.body?.plantId || request.query?.plantId;
      const matchedNode = await this.prisma.scopeNode.findFirst({
        where: { OR: [{ plantId }, { code: plantId.toLowerCase() }] },
      });
      if (matchedNode) {
        targetNodeId = matchedNode.id;
      }
    }

    // If still not found, fallback to root GLOBAL node if allowed
    if (!targetNodeId) {
      const globalNode = await this.prisma.scopeNode.findFirst({
        where: { type: 'GLOBAL', isActive: true },
      });
      if (globalNode) {
        targetNodeId = globalNode.id;
      } else {
        throw new ForbiddenException(
          `Access denied: Target scope node could not be resolved for required permission "${requiredPermission}"`,
        );
      }
    }

    const evaluation = await this.iamService.can(user.id, requiredPermission, targetNodeId);

    if (!evaluation.allowed) {
      throw new ForbiddenException(
        `Access denied: ${evaluation.reason} (Required permission: "${requiredPermission}")`,
      );
    }

    // Attach evaluation context to request for downstream handlers or audit
    request.iamContext = {
      permission: requiredPermission,
      targetNodeId,
      matchedAssignments: evaluation.matchedAssignments,
    };

    return true;
  }
}
