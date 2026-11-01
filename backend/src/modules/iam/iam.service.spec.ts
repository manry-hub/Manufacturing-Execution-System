import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { IamService } from './iam.service.js';
import { AuditService } from '../audit/audit.service.js';
import { seedIam } from '../../../prisma/seed-iam.js';
import bcrypt from 'bcrypt';

describe('Workflow 015: Hierarchical IAM & Scoped RBAC Engine (10 Scenarios)', () => {
  let prisma: PrismaClient;
  let auditService: AuditService;
  let iamService: IamService;

  // Cached node and role references
  let seedData: Awaited<ReturnType<typeof seedIam>>;
  let testUsers: Record<string, any> = {};

  beforeAll(async () => {
    prisma = new PrismaClient();
    auditService = new AuditService(prisma as any);
    iamService = new IamService(prisma as any, auditService);

    // Initialize clean seed
    seedData = await seedIam();

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create test users for isolated scenario runs
    const usersToCreate = [
      { username: 'test_spv_p1_fin', name: 'P1 Fin Supervisor' },
      { username: 'test_op_p1_imm1', name: 'P1 IMM01 Operator' },
      { username: 'test_mgr_p1', name: 'Plant 01 Manager' },
      { username: 'test_multi_role', name: 'Multi Role User' },
      { username: 'test_expired_user', name: 'Expired Assignment User' },
      { username: 'test_deactivated_user', name: 'Deactivated User', isActive: false },
      { username: 'test_sysadmin_user', name: 'SysAdmin Test User' },
    ];

    for (const u of usersToCreate) {
      testUsers[u.username] = await prisma.user.upsert({
        where: { username: u.username },
        update: { isActive: u.isActive !== undefined ? u.isActive : true },
        create: {
          username: u.username,
          name: u.name,
          email: `${u.username}@mes.local`,
          passwordHash,
          isActive: u.isActive !== undefined ? u.isActive : true,
        },
      });
    }

    // Clean up any test assignments, test roles, or test scope nodes from prior runs
    await prisma.roleAssignment.deleteMany({
      where: {
        OR: [
          { role: { name: { in: ['Quality Inspector Test Role', 'Audit Trail Test Role'] } } },
          { scopeNode: { code: 'plant-010' } },
        ],
      },
    });
    await prisma.scopeNode.deleteMany({ where: { code: 'plant-010' } });
    await prisma.rolePermission.deleteMany({
      where: { role: { name: { in: ['Quality Inspector Test Role', 'Audit Trail Test Role'] } } },
    });
    await prisma.role.deleteMany({
      where: { name: { in: ['Quality Inspector Test Role', 'Audit Trail Test Role'] } },
    });

    // Clean up any test assignments for these users
    await prisma.roleAssignment.deleteMany({
      where: {
        userId: { in: Object.values(testUsers).map((u) => u.id) },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // Skenario 1: Cross-Area Isolation
  // Supervisor di /global/plant-01/fin-insp/ boleh pada ATM-01, ditolak pada IMM-01
  // ---------------------------------------------------------------------------
  it('Scenario 1: Cross-Area Isolation — Supervisor on Fin-Insp allowed on ATM-01, denied on IMM-01', async () => {
    const user = testUsers['test_spv_p1_fin'];
    const supervisorRole = seedData.roles.supervisorRole;
    const finInspNode = seedData.p1FinInsp;

    // Assign supervisor to Plant 01 Fin-Insp area
    await iamService.createAssignment(
      {
        userId: user.id,
        roleId: supervisorRole.id,
        scopeNodeId: finInspNode.id,
      },
      'test-actor',
    );

    // Check ATM-01 (child of Fin-Insp) -> MUST BE ALLOWED
    const atmResult = await iamService.can(user.id, 'workorder:start', seedData.p1Atm01.id);
    expect(atmResult.allowed).toBe(true);
    expect(atmResult.matchedAssignments.length).toBeGreaterThan(0);
    expect(atmResult.matchedAssignments[0].roleName).toBe('Supervisor');

    // Check IMM-01 (child of Inj-Mold in same plant) -> MUST BE DENIED
    const immResult = await iamService.can(user.id, 'workorder:start', seedData.p1Imm01.id);
    expect(immResult.allowed).toBe(false);
    expect(immResult.matchedAssignments.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Skenario 2: Multi-Plant Node Disambiguation
  // Operator dengan assignment di IMM-01 saja ditolak pada IMM-02 Plant 01 dan IMM-02 Plant 02
  // ---------------------------------------------------------------------------
  it('Scenario 2: Multi-Plant Node Disambiguation — Operator at P1 IMM-01 denied at P1 IMM-02 and P2 IMM-02', async () => {
    const user = testUsers['test_op_p1_imm1'];
    const operatorRole = seedData.roles.operatorRole;
    const p1Imm01 = seedData.p1Imm01;

    // Assign operator strictly to P1 IMM-01
    await iamService.createAssignment(
      {
        userId: user.id,
        roleId: operatorRole.id,
        scopeNodeId: p1Imm01.id,
      },
      'test-actor',
    );

    // Check P1 IMM-01 -> MUST BE ALLOWED
    const p1Imm01Result = await iamService.can(user.id, 'workorder:start', seedData.p1Imm01.id);
    expect(p1Imm01Result.allowed).toBe(true);

    // Check P1 IMM-02 (same plant, different machine) -> MUST BE DENIED
    const p1Imm02Result = await iamService.can(user.id, 'workorder:start', seedData.p1Imm02.id);
    expect(p1Imm02Result.allowed).toBe(false);

    // Check P2 IMM-02 (different plant, collision machine code) -> MUST BE DENIED
    const p2Imm02Result = await iamService.can(user.id, 'workorder:start', seedData.p2Imm02.id);
    expect(p2Imm02Result.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Skenario 3: Cross-Plant Manager Isolation
  // Manager di Plant 01 ditolak di seluruh Plant 02
  // ---------------------------------------------------------------------------
  it('Scenario 3: Cross-Plant Manager Isolation — Plant 01 Manager denied on all Plant 02 nodes', async () => {
    const user = testUsers['test_mgr_p1'];
    const plantMgrRole = seedData.roles.plantMgrRole;
    const p1Node = seedData.plant1Node;

    // Assign Plant Manager to Plant 01
    await iamService.createAssignment(
      {
        userId: user.id,
        roleId: plantMgrRole.id,
        scopeNodeId: p1Node.id,
      },
      'test-actor',
    );

    // Should be allowed anywhere inside Plant 01 (downward inheritance)
    const p1Imm01 = await iamService.can(user.id, 'workorder:release', seedData.p1Imm01.id);
    expect(p1Imm01.allowed).toBe(true);

    const p1Atm01 = await iamService.can(user.id, 'workorder:release', seedData.p1Atm01.id);
    expect(p1Atm01.allowed).toBe(true);

    // Should be denied in Plant 02 root, areas, and machines
    const p2Root = await iamService.can(user.id, 'workorder:release', seedData.plant2Node.id);
    expect(p2Root.allowed).toBe(false);

    const p2Imm02 = await iamService.can(user.id, 'workorder:release', seedData.p2Imm02.id);
    expect(p2Imm02.allowed).toBe(false);

    const p2Atm02 = await iamService.can(user.id, 'workorder:release', seedData.p2Atm02.id);
    expect(p2Atm02.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Skenario 4: Union of Multiple Roles
  // User dengan dua role di node yang sama mendapat gabungan permission keduanya
  // ---------------------------------------------------------------------------
  it('Scenario 4: Union of Multiple Roles — User receives union of permissions from both roles on node', async () => {
    const user = testUsers['test_multi_role'];
    const p1Imm01 = seedData.p1Imm01;

    // Create a special Quality Inspector role
    const qualityInspectorRole = await iamService.createRole(
      {
        name: 'Quality Inspector Test Role',
        description: 'Quality inspector role with disposition privilege',
        applicableNodeTypes: ['GLOBAL', 'PLANT', 'AREA', 'MACHINE'],
        permissionIds: (
          await prisma.permission.findMany({
            where: { code: { in: ['quality:inspect', 'quality:disposition'] } },
          })
        ).map((p) => p.id),
      },
      'test-actor',
    );

    // Assign Operator role on P1 IMM-01 (grants workorder:start, production:report, etc.)
    await iamService.createAssignment(
      {
        userId: user.id,
        roleId: seedData.roles.operatorRole.id,
        scopeNodeId: p1Imm01.id,
      },
      'test-actor',
    );

    // Assign Quality Inspector role on P1 IMM-01 (grants quality:disposition)
    await iamService.createAssignment(
      {
        userId: user.id,
        roleId: qualityInspectorRole.id,
        scopeNodeId: p1Imm01.id,
      },
      'test-actor',
    );

    // Verify union of permissions
    const opCheck = await iamService.can(user.id, 'workorder:start', p1Imm01.id);
    expect(opCheck.allowed).toBe(true);

    const qaCheck = await iamService.can(user.id, 'quality:disposition', p1Imm01.id);
    expect(qaCheck.allowed).toBe(true);

    // Verify effective access includes both
    const effective = await iamService.getEffectiveAccess(user.id, p1Imm01.id);
    const codes = effective.permissions.map((p) => p.code);
    expect(codes).toContain('workorder:start');
    expect(codes).toContain('quality:disposition');
    expect(effective.matchingAssignments.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Skenario 5: Temporal & Status Invalidation
  // Assignment kedaluwarsa atau user nonaktif ditolak
  // ---------------------------------------------------------------------------
  it('Scenario 5: Temporal & Status Invalidation — Expired assignment or deactivated user is strictly denied', async () => {
    const expiredUser = testUsers['test_expired_user'];
    const deactivatedUser = testUsers['test_deactivated_user'];
    const operatorRole = seedData.roles.operatorRole;
    const p1Imm01 = seedData.p1Imm01;

    // 1. Assign with expired validTo (e.g. yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await iamService.createAssignment(
      {
        userId: expiredUser.id,
        roleId: operatorRole.id,
        scopeNodeId: p1Imm01.id,
        validFrom: twoDaysAgo.toISOString(),
        validTo: yesterday.toISOString(),
      },
      'test-actor',
    );

    const expiredResult = await iamService.can(expiredUser.id, 'workorder:start', p1Imm01.id);
    expect(expiredResult.allowed).toBe(false);

    // 2. Assign active role to a deactivated user
    await iamService.createAssignment(
      {
        userId: deactivatedUser.id,
        roleId: operatorRole.id,
        scopeNodeId: p1Imm01.id,
      },
      'test-actor',
    );

    const deactResult = await iamService.can(deactivatedUser.id, 'workorder:start', p1Imm01.id);
    expect(deactResult.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Skenario 6: Segment Boundary Safety
  // Path /plant-01/ tidak boleh cocok dengan /plant-010/
  // ---------------------------------------------------------------------------
  it('Scenario 6: Segment Boundary Safety — Path /global/plant-01/ does NOT match /global/plant-010/', async () => {
    const user = testUsers['test_mgr_p1'];

    // Create a sibling plant node with code 'plant-010'
    const plant10 = await iamService.createScopeNode(
      {
        parentId: seedData.rootNode.id,
        type: 'PLANT' as any,
        code: 'plant-010',
        name: 'Plant 010 (Similar Prefix Testing)',
      },
      'test-actor',
    );

    expect(plant10.path).toBe('/global/plant-010/');

    // Manager assigned to /global/plant-01/ MUST BE DENIED on /global/plant-010/
    const checkPlant10 = await iamService.can(user.id, 'workorder:release', plant10.id);
    expect(checkPlant10.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Skenario 7: Applicable Node Types Enforcement
  // Role tidak bisa di-assign ke node bertipe yang tidak diizinkan
  // ---------------------------------------------------------------------------
  it('Scenario 7: Applicable Node Types Enforcement — Plant Manager role cannot be assigned to MACHINE node', async () => {
    const user = testUsers['test_mgr_p1'];
    const plantMgrRole = seedData.roles.plantMgrRole; // only allows ['PLANT']
    const p1Imm01 = seedData.p1Imm01; // type is MACHINE

    await expect(
      iamService.createAssignment(
        {
          userId: user.id,
          roleId: plantMgrRole.id,
          scopeNodeId: p1Imm01.id,
        },
        'test-actor',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // Skenario 8: Last Admin Lockout Protection
  // Tidak bisa menghapus atau mencabut System Administrator terakhir
  // ---------------------------------------------------------------------------
  it('Scenario 8: Last Admin Lockout Protection — Cannot delete or revoke the final active System Administrator', async () => {
    // Find active System Administrator assignment
    const adminAssignments = await prisma.roleAssignment.findMany({
      where: {
        role: { name: 'System Administrator' },
        user: { isActive: true },
      },
    });

    expect(adminAssignments.length).toBeGreaterThan(0);

    // If there is only 1 admin assignment, trying to revoke it must fail
    if (adminAssignments.length === 1) {
      await expect(
        iamService.revokeAssignment(adminAssignments[0].id, 'test-actor'),
      ).rejects.toThrow(BadRequestException);
    } else {
      // If multiple exist, revoking down to 1 is allowed, but the very last one is rejected
      for (let i = 0; i < adminAssignments.length - 1; i++) {
        await iamService.revokeAssignment(adminAssignments[i].id, 'test-actor');
      }
      const lastAsgn = adminAssignments[adminAssignments.length - 1];
      await expect(
        iamService.revokeAssignment(lastAsgn.id, 'test-actor'),
      ).rejects.toThrow(BadRequestException);
    }
  });

  // ---------------------------------------------------------------------------
  // Skenario 9: SysAdmin Global Super-User Full Access
  // System Administrator memiliki hak akses penuh secara global (operasional & administratif)
  // ---------------------------------------------------------------------------
  it('Scenario 9: SysAdmin Global Super-User — Full access on all operational and administrative actions across plants', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

    // Administrative action on root
    const adminScopeManage = await iamService.can(admin.id, 'scope:manage', seedData.rootNode.id);
    expect(adminScopeManage.allowed).toBe(true);

    const adminRoleManage = await iamService.can(admin.id, 'iam:role:manage', seedData.rootNode.id);
    expect(adminRoleManage.allowed).toBe(true);

    // Operational actions on Plant 01 machines
    const p1Run = await iamService.can(admin.id, 'workorder:start', seedData.p1Imm01.id);
    expect(p1Run.allowed).toBe(true);

    const p1Recipe = await iamService.can(admin.id, 'recipe:edit', seedData.p1Imm01.id);
    expect(p1Recipe.allowed).toBe(true);

    // Operational actions on Plant 02 machines
    const p2Run = await iamService.can(admin.id, 'workorder:start', seedData.p2Imm03.id);
    expect(p2Run.allowed).toBe(true);

    const p2Override = await iamService.can(admin.id, 'equipment:override', seedData.p2Imm03.id);
    expect(p2Override.allowed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Skenario 10: Audit Log Integrity
  // Setiap perubahan IAM menghasilkan baris audit_log terstruktur
  // ---------------------------------------------------------------------------
  it('Scenario 10: Audit Log Integrity — IAM mutations generate structured audit log records', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

    // Perform an IAM mutation: Create a test role
    const createdRole = await iamService.createRole(
      {
        name: 'Audit Trail Test Role',
        description: 'Role for verifying audit log capture',
        applicableNodeTypes: ['GLOBAL', 'PLANT'],
        permissionIds: [],
      },
      admin.id,
    );

    // Query audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Role',
        entityId: createdRole.id,
        action: 'iam:role:create',
      },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    const log = auditLogs[0];
    expect(log.userId).toBe(admin.id);
    expect(log.action).toBe('iam:role:create');
    expect(log.newValues).toContain('Audit Trail Test Role');
  });
});
