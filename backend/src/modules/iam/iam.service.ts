import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateScopeNodeDto, ScopeNodeType } from './dto/create-scope-node.dto.js';
import { UpdateScopeNodeDto } from './dto/update-scope-node.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto.js';
import { RoleAssignmentQueryDto } from './dto/iam-query.dto.js';

export interface CanResult {
  allowed: boolean;
  reason: string;
  matchedAssignments: Array<{
    assignmentId: string;
    roleName: string;
    scopeNodePath: string;
    permissionCode: string;
  }>;
}

export interface EffectiveAccessResult {
  userId: string;
  targetNodeId: string;
  targetNodePath: string;
  permissions: Array<{
    code: string;
    module: string;
    description: string | null;
    isCritical: boolean;
    grantedByRoles: string[];
  }>;
  matchingAssignments: Array<{
    id: string;
    roleName: string;
    scopeNodePath: string;
    validFrom: Date;
    validTo: Date | null;
  }>;
}

@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);

  // In-memory cache for high-throughput can() evaluations
  // Key: `${userId}:${permissionCode}:${targetNodeId}`, Value: { result: CanResult, expiresAt: number }
  private readonly cache = new Map<string, { result: CanResult; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  public clearCache(): void {
    this.cache.clear();
  }

  // ===========================================================================
  // 1. CORE EVALUATION ENGINE: can(), listAccessibleNodes(), getEffectiveAccess()
  // ===========================================================================

  public async can(
    userId: string,
    permissionCode: string,
    targetNodeId: string,
  ): Promise<CanResult> {
    const cacheKey = `${userId}:${permissionCode}:${targetNodeId}`;
    const cached = this.cache.get(cacheKey);
    const nowMs = Date.now();
    if (cached && cached.expiresAt > nowMs) {
      return cached.result;
    }

    const now = new Date();

    // 1. Target scope node validation
    const targetNode = await this.prisma.scopeNode.findUnique({
      where: { id: targetNodeId },
    });

    if (!targetNode || !targetNode.isActive) {
      const result: CanResult = {
        allowed: false,
        reason: 'Target scope node not found or inactive',
        matchedAssignments: [],
      };
      this.cache.set(cacheKey, { result, expiresAt: nowMs + this.CACHE_TTL_MS });
      return result;
    }

    // 2. Fetch all active assignments for the user with active user & scope node
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        user: { isActive: true },
        scopeNode: { isActive: true },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        scopeNode: true,
      },
    });

    if (!assignments || assignments.length === 0) {
      const result: CanResult = {
        allowed: false,
        reason: 'User is inactive or has no active role assignments covering this scope',
        matchedAssignments: [],
      };
      this.cache.set(cacheKey, { result, expiresAt: nowMs + this.CACHE_TTL_MS });
      return result;
    }

    // 3. Segment-Boundary Safe Prefix Matching
    // Both targetNode.path and assignment.scopeNode.path always enforce trailing slashes (e.g. /global/plant-01/)
    // This strictly prevents /global/plant-01/ from matching /global/plant-010/
    const matchedAssignments: CanResult['matchedAssignments'] = [];

    for (const asgn of assignments) {
      const scopePath = asgn.scopeNode.path;
      if (targetNode.path.startsWith(scopePath)) {
        const matchingPermission = asgn.role.rolePermissions.find(
          (rp) => rp.permission.code === permissionCode || rp.permission.key === permissionCode,
        );
        if (matchingPermission) {
          matchedAssignments.push({
            assignmentId: asgn.id,
            roleName: asgn.role.name,
            scopeNodePath: asgn.scopeNode.path,
            permissionCode: matchingPermission.permission.code,
          });
        }
      }
    }

    let finalResult: CanResult;
    if (matchedAssignments.length > 0) {
      finalResult = {
        allowed: true,
        reason: `Access granted via ${matchedAssignments.length} matching assignment(s)`,
        matchedAssignments,
      };
    } else {
      finalResult = {
        allowed: false,
        reason: `Principal does not hold permission "${permissionCode}" at scope "${targetNode.path}"`,
        matchedAssignments: [],
      };
    }

    this.cache.set(cacheKey, { result: finalResult, expiresAt: nowMs + this.CACHE_TTL_MS });
    return finalResult;
  }

  public async listAccessibleNodes(
    userId: string,
    permissionCode: string,
  ): Promise<any[]> {
    const now = new Date();

    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        user: { isActive: true },
        scopeNode: { isActive: true },
        role: {
          rolePermissions: {
            some: {
              permission: {
                OR: [{ code: permissionCode }, { key: permissionCode }],
              },
            },
          },
        },
      },
      include: {
        scopeNode: true,
      },
    });

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Collect all covered paths
    const coveredPaths = assignments.map((a) => a.scopeNode.path);

    // Fetch all active scope nodes whose path starts with any of the covered paths
    const allActiveNodes = await this.prisma.scopeNode.findMany({
      where: { isActive: true },
      orderBy: { path: 'asc' },
    });

    const accessible = allActiveNodes.filter((node) =>
      coveredPaths.some((cp) => node.path.startsWith(cp)),
    );

    return accessible;
  }

  public async getEffectiveAccess(
    userId: string,
    nodeId: string,
  ): Promise<EffectiveAccessResult> {
    const targetNode = await this.prisma.scopeNode.findUnique({
      where: { id: nodeId },
    });

    if (!targetNode) {
      throw new NotFoundException(`Scope node with ID "${nodeId}" not found`);
    }

    const now = new Date();
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        user: { isActive: true },
        scopeNode: { isActive: true },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        scopeNode: true,
      },
    });

    const matchingAssignments: EffectiveAccessResult['matchingAssignments'] = [];
    const permissionMap = new Map<
      string,
      { code: string; module: string; description: string | null; isCritical: boolean; grantedByRoles: Set<string> }
    >();

    for (const asgn of assignments) {
      if (targetNode.path.startsWith(asgn.scopeNode.path)) {
        matchingAssignments.push({
          id: asgn.id,
          roleName: asgn.role.name,
          scopeNodePath: asgn.scopeNode.path,
          validFrom: asgn.validFrom,
          validTo: asgn.validTo,
        });

        for (const rp of asgn.role.rolePermissions) {
          const perm = rp.permission;
          const code = perm.code || perm.key;
          if (!permissionMap.has(code)) {
            permissionMap.set(code, {
              code,
              module: perm.module,
              description: perm.description,
              isCritical: perm.isCritical,
              grantedByRoles: new Set<string>([asgn.role.name]),
            });
          } else {
            permissionMap.get(code)!.grantedByRoles.add(asgn.role.name);
          }
        }
      }
    }

    const permissions = Array.from(permissionMap.values()).map((p) => ({
      code: p.code,
      module: p.module,
      description: p.description,
      isCritical: p.isCritical,
      grantedByRoles: Array.from(p.grantedByRoles),
    }));

    return {
      userId,
      targetNodeId: targetNode.id,
      targetNodePath: targetNode.path,
      permissions,
      matchingAssignments,
    };
  }

  // ===========================================================================
  // 2. SCOPE TREE MANAGEMENT
  // ===========================================================================

  public async getScopeTree(includeInactive = false) {
    const nodes = await this.prisma.scopeNode.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { path: 'asc' },
      include: {
        _count: {
          select: { roleAssignments: true, children: true },
        },
      },
    });

    // Build hierarchical tree
    const nodeMap = new Map<string, any>();
    const roots: any[] = [];

    nodes.forEach((n) => {
      nodeMap.set(n.id, { ...n, children: [] });
    });

    nodes.forEach((n) => {
      const current = nodeMap.get(n.id);
      if (n.parentId && nodeMap.has(n.parentId)) {
        nodeMap.get(n.parentId).children.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  public async getScopeNode(id: string) {
    const node = await this.prisma.scopeNode.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { roleAssignments: true },
        },
      },
    });
    if (!node) {
      throw new NotFoundException(`Scope node with ID "${id}" not found`);
    }
    return node;
  }

  public async createScopeNode(dto: CreateScopeNodeDto, actorId: string) {
    const cleanCode = dto.code.trim().toLowerCase();
    let parentPath = '/';

    if (dto.parentId) {
      const parent = await this.prisma.scopeNode.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || !parent.isActive) {
        throw new BadRequestException('Parent node not found or is inactive');
      }
      parentPath = parent.path;
    }

    const calculatedPath = `${parentPath}${cleanCode}/`;

    const existing = await this.prisma.scopeNode.findUnique({
      where: { path: calculatedPath },
    });
    if (existing) {
      throw new BadRequestException(`A scope node with path "${calculatedPath}" already exists`);
    }

    const created = await this.prisma.scopeNode.create({
      data: {
        parentId: dto.parentId || null,
        type: dto.type,
        code: cleanCode,
        name: dto.name,
        path: calculatedPath,
        isActive: true,
        plantId: dto.plantId || null,
        areaId: dto.areaId || null,
        machineId: dto.machineId || null,
      },
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'scope_node:create',
      entityType: 'ScopeNode',
      entityId: created.id,
      scope: created.path,
      newValues: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  public async updateScopeNode(
    id: string,
    dto: UpdateScopeNodeDto,
    actorId: string,
  ) {
    const node = await this.prisma.scopeNode.findUnique({ where: { id } });
    if (!node) {
      throw new NotFoundException(`Scope node with ID "${id}" not found`);
    }

    const oldPath = node.path;
    const cleanCode = dto.code ? dto.code.trim().toLowerCase() : node.code;
    let newParentId = dto.parentId !== undefined ? dto.parentId : node.parentId;
    let newBasePath = '/';

    if (newParentId) {
      const parent = await this.prisma.scopeNode.findUnique({
        where: { id: newParentId },
      });
      if (!parent) {
        throw new BadRequestException('Target parent node does not exist');
      }
      // Prevent cyclical hierarchy (parent cannot be descendant of current node)
      if (parent.path.startsWith(oldPath)) {
        throw new BadRequestException('Cannot move a scope node into its own descendant');
      }
      newBasePath = parent.path;
    }

    const newPath = `${newBasePath}${cleanCode}/`;
    const pathChanged = newPath !== oldPath;

    // Transactionally update current node and all descendants
    const updatedNode = await this.prisma.$transaction(async (tx) => {
      if (pathChanged) {
        const conflict = await tx.scopeNode.findFirst({
          where: { path: newPath, id: { not: id } },
        });
        if (conflict) {
          throw new BadRequestException(`Scope node with path "${newPath}" already exists`);
        }
      }

      const updated = await tx.scopeNode.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name : node.name,
          code: cleanCode,
          parentId: newParentId,
          path: newPath,
          isActive: dto.isActive !== undefined ? dto.isActive : node.isActive,
        },
      });

      if (pathChanged) {
        // Find and update all descendant nodes
        const descendants = await tx.scopeNode.findMany({
          where: {
            path: { startsWith: oldPath },
            id: { not: id },
          },
        });

        for (const desc of descendants) {
          const updatedChildPath = newPath + desc.path.substring(oldPath.length);
          await tx.scopeNode.update({
            where: { id: desc.id },
            data: { path: updatedChildPath },
          });
        }
      }

      return updated;
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'scope_node:update',
      entityType: 'ScopeNode',
      entityId: id,
      scope: updatedNode.path,
      oldValues: node as unknown as Record<string, unknown>,
      newValues: updatedNode as unknown as Record<string, unknown>,
    });

    return updatedNode;
  }

  public async deactivateScopeNode(id: string, actorId: string) {
    const node = await this.prisma.scopeNode.findUnique({
      where: { id },
      include: {
        children: { where: { isActive: true } },
        roleAssignments: {
          where: {
            validFrom: { lte: new Date() },
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(`Scope node with ID "${id}" not found`);
    }

    if (node.children.length > 0) {
      throw new BadRequestException(
        `Cannot deactivate node "${node.name}" because it still has ${node.children.length} active child node(s)`,
      );
    }

    if (node.roleAssignments.length > 0) {
      throw new BadRequestException(
        `Cannot deactivate node "${node.name}" because it still has ${node.roleAssignments.length} active role assignment(s)`,
      );
    }

    const deactivated = await this.prisma.scopeNode.update({
      where: { id },
      data: { isActive: false },
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'scope_node:deactivate',
      entityType: 'ScopeNode',
      entityId: id,
      scope: node.path,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return deactivated;
  }

  // ===========================================================================
  // 3. ROLE MANAGEMENT
  // ===========================================================================

  public async getRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: { roleAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  public async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: { roleAssignments: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return role;
  }

  public async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  public async createRole(dto: CreateRoleDto, actorId: string) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Role with name "${dto.name}" already exists`);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description || null,
          isBuiltin: false,
          applicableNodeTypes: JSON.stringify(dto.applicableNodeTypes || ['GLOBAL', 'PLANT', 'AREA', 'MACHINE']),
        },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((pId) => ({
            roleId: created.id,
            permissionId: pId,
          })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'iam:role:create',
      entityType: 'Role',
      entityId: role.id,
      newValues: {
        name: role.name,
        applicableNodeTypes: role.applicableNodeTypes,
        permissionsCount: role.rolePermissions.length,
      },
    });

    return role;
  }

  public async previewRoleUpdateImpact(roleId: string, _permissionIds?: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        roleAssignments: {
          where: {
            user: { isActive: true },
            validFrom: { lte: new Date() },
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
          },
          include: {
            user: {
              select: { id: true, username: true, name: true, email: true },
            },
            scopeNode: {
              select: { id: true, name: true, path: true },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    // Extract unique affected active users
    const userMap = new Map<string, { id: string; username: string; name: string | null; email: string }>();
    role.roleAssignments.forEach((ra) => {
      if (!userMap.has(ra.user.id)) {
        userMap.set(ra.user.id, ra.user);
      }
    });

    return {
      roleId: role.id,
      roleName: role.name,
      affectedUserCount: userMap.size,
      affectedAssignmentsCount: role.roleAssignments.length,
      affectedUsers: Array.from(userMap.values()),
    };
  }

  public async updateRole(id: string, dto: UpdateRoleDto, actorId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isBuiltin && dto.name && dto.name !== role.name) {
      throw new BadRequestException('Built-in role name is locked and cannot be changed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: dto.name || role.name,
          description: dto.description !== undefined ? dto.description : role.description,
          applicableNodeTypes: dto.applicableNodeTypes
            ? JSON.stringify(dto.applicableNodeTypes)
            : role.applicableNodeTypes,
        },
      });

      if (dto.permissionIds !== undefined) {
        // Replace role permissions
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((pId) => ({
              roleId: id,
              permissionId: pId,
            })),
          });
        }
      }

      return tx.role.findUniqueOrThrow({
        where: { id },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'iam:role:update',
      entityType: 'Role',
      entityId: id,
      oldValues: {
        name: role.name,
        applicableNodeTypes: role.applicableNodeTypes,
        permissionsCount: role.rolePermissions.length,
      },
      newValues: {
        name: updated.name,
        applicableNodeTypes: updated.applicableNodeTypes,
        permissionsCount: updated.rolePermissions.length,
      },
    });

    return updated;
  }

  public async deleteRole(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { roleAssignments: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isBuiltin) {
      throw new BadRequestException('Built-in roles are permanent and cannot be deleted');
    }

    if (role._count.roleAssignments > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role._count.roleAssignments} user(s)`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'iam:role:delete',
      entityType: 'Role',
      entityId: id,
      oldValues: { name: role.name },
    });

    return { success: true, message: `Role "${role.name}" deleted successfully` };
  }

  // ===========================================================================
  // 4. ROLE ASSIGNMENT MANAGEMENT
  // ===========================================================================

  public async getAssignments(query: RoleAssignmentQueryDto) {
    const now = new Date();
    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.roleId) {
      where.roleId = query.roleId;
    }
    if (query.scopeNodeId) {
      where.scopeNodeId = query.scopeNodeId;
    }
    if (query.activeOnly) {
      where.validFrom = { lte: now };
      where.OR = [{ validTo: null }, { validTo: { gte: now } }];
      where.user = { isActive: true };
      where.scopeNode = { isActive: true };
    }

    return this.prisma.roleAssignment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true, email: true, isActive: true } },
        role: { select: { id: true, name: true, isBuiltin: true, applicableNodeTypes: true } },
        scopeNode: { select: { id: true, name: true, code: true, type: true, path: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createAssignment(dto: CreateRoleAssignmentDto, actorId: string) {
    const [user, role, scopeNode] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      this.prisma.scopeNode.findUnique({ where: { id: dto.scopeNodeId } }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }
    if (!role) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }
    if (!scopeNode) {
      throw new NotFoundException(`Scope node with ID "${dto.scopeNodeId}" not found`);
    }

    // Validate applicableNodeTypes
    let allowedTypes: string[] = ['GLOBAL', 'PLANT', 'AREA', 'MACHINE'];
    try {
      if (role.applicableNodeTypes) {
        allowedTypes = JSON.parse(role.applicableNodeTypes);
      }
    } catch {
      allowedTypes = ['GLOBAL', 'PLANT', 'AREA', 'MACHINE'];
    }

    if (!allowedTypes.includes(scopeNode.type)) {
      throw new BadRequestException(
        `Role "${role.name}" cannot be assigned to node type "${scopeNode.type}". Allowed node types: [${allowedTypes.join(', ')}]`,
      );
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : null;

    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be strictly after validFrom');
    }

    const assignment = await this.prisma.roleAssignment.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeNodeId: dto.scopeNodeId,
        validFrom,
        validTo,
        grantedBy: actorId,
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
        role: { select: { id: true, name: true } },
        scopeNode: { select: { id: true, name: true, path: true } },
      },
    });

    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'iam:assignment:create',
      entityType: 'RoleAssignment',
      entityId: assignment.id,
      scope: scopeNode.path,
      newValues: {
        userId: user.id,
        username: user.username,
        roleId: role.id,
        roleName: role.name,
        scopeNodeId: scopeNode.id,
        scopePath: scopeNode.path,
        validFrom,
        validTo,
      },
    });

    return assignment;
  }

  public async revokeAssignment(id: string, actorId: string) {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id },
      include: {
        role: true,
        user: true,
        scopeNode: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Role assignment with ID "${id}" not found`);
    }

    // Protection rule: System must always have at least 1 active System Administrator
    if (assignment.role.name === 'System Administrator') {
      const remainingActiveSysAdmins = await this.countOtherActiveSysAdmins(assignment.id);
      if (remainingActiveSysAdmins <= 0) {
        throw new BadRequestException(
          'Operation rejected: Cannot revoke the last active System Administrator assignment. The system must always maintain at least one active System Administrator.',
        );
      }
    }

    await this.prisma.roleAssignment.delete({ where: { id } });
    this.clearCache();

    await this.auditService.record({
      userId: actorId,
      action: 'iam:assignment:revoke',
      entityType: 'RoleAssignment',
      entityId: id,
      scope: assignment.scopeNode.path,
      oldValues: {
        userId: assignment.userId,
        username: assignment.user.username,
        roleName: assignment.role.name,
        scopePath: assignment.scopeNode.path,
      },
    });

    return { success: true, message: 'Role assignment revoked successfully' };
  }

  public async preventLastSysAdminLockout(userIdToDeactivate: string): Promise<void> {
    const now = new Date();
    // Check if this user holds an active System Administrator role
    const userSysAdminAssignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId: userIdToDeactivate,
        role: { name: 'System Administrator' },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
    });

    if (userSysAdminAssignments.length > 0) {
      // Count other active sysadmin users
      const otherActiveSysAdmins = await this.prisma.roleAssignment.count({
        where: {
          userId: { not: userIdToDeactivate },
          role: { name: 'System Administrator' },
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
          user: { isActive: true },
        },
      });

      if (otherActiveSysAdmins <= 0) {
        throw new BadRequestException(
          'Operation rejected: Cannot deactivate the last active System Administrator user.',
        );
      }
    }
  }

  private async countOtherActiveSysAdmins(excludeAssignmentId: string): Promise<number> {
    const now = new Date();
    const otherAssignments = await this.prisma.roleAssignment.findMany({
      where: {
        id: { not: excludeAssignmentId },
        role: { name: 'System Administrator' },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        user: { isActive: true },
        scopeNode: { isActive: true },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return otherAssignments.length;
  }
}
