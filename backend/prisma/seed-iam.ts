import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const CANONICAL_IAM_PERMISSIONS = [
  { code: 'iam:role:view', module: 'iam', description: 'View role definitions', isCritical: false },
  { code: 'iam:role:manage', module: 'iam', description: 'Create, update, and manage roles', isCritical: false },
  { code: 'iam:assignment:view', module: 'iam', description: 'View user role assignments', isCritical: false },
  { code: 'iam:assignment:manage', module: 'iam', description: 'Assign or revoke roles to users', isCritical: false },
  { code: 'scope:view', module: 'scope', description: 'View scope tree hierarchy', isCritical: false },
  { code: 'scope:manage', module: 'scope', description: 'Add, update, move, or deactivate scope nodes', isCritical: false },
  { code: 'audit:view', module: 'audit', description: 'View system and security audit logs', isCritical: false },
  { code: 'workorder:view', module: 'production', description: 'View work orders and dispatching', isCritical: false },
  { code: 'workorder:start', module: 'production', description: 'Start production run on equipment', isCritical: false },
  { code: 'workorder:stop', module: 'production', description: 'Stop or pause active production run', isCritical: false },
  { code: 'workorder:release', module: 'production', description: 'Release scheduled orders to shopfloor', isCritical: false },
  { code: 'production:report', module: 'production', description: 'Log cycle production and piece counts', isCritical: false },
  { code: 'quality:inspect', module: 'quality', description: 'Record quality sample measurements', isCritical: false },
  { code: 'quality:disposition', module: 'quality', description: 'Release or quarantine product lots (Lockout)', isCritical: true },
  { code: 'recipe:view', module: 'engineering', description: 'View molding parameter recipes', isCritical: false },
  { code: 'recipe:edit', module: 'engineering', description: 'Modify injection pressure/speed/temp recipes', isCritical: true },
  { code: 'equipment:override', module: 'engineering', description: 'Override safety/maintenance interlock gate', isCritical: true },
];

export async function seedIam() {
  console.log('🌱 Starting IAM Catalog & Scope Tree Seeding...');

  // 1. Seed Permissions Catalog
  const permissionMap = new Map<string, string>();
  for (const perm of CANONICAL_IAM_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { key: perm.code },
      update: {
        code: perm.code,
        module: perm.module,
        description: perm.description,
        isCritical: perm.isCritical,
        action: perm.description,
        resource: perm.module,
        validScope: 'GLOBAL / PLANT / AREA / MACHINE',
      },
      create: {
        key: perm.code,
        code: perm.code,
        module: perm.module,
        description: perm.description,
        isCritical: perm.isCritical,
        action: perm.description,
        resource: perm.module,
        validScope: 'GLOBAL / PLANT / AREA / MACHINE',
      },
    });
    permissionMap.set(perm.code, p.id);
  }
  console.log(`✓ Seeded ${CANONICAL_IAM_PERMISSIONS.length} canonical IAM permissions.`);

  // 2. Canonical Built-in Roles
  const builtinRoles = [
    {
      name: 'System Administrator',
      description: 'Global enterprise administrator with full super-user privileges across administrative and operational modules',
      isBuiltin: true,
      applicableNodeTypes: JSON.stringify(['GLOBAL']),
      permissions: CANONICAL_IAM_PERMISSIONS.map((p) => p.code),
    },
    {
      name: 'Plant Manager',
      description: 'Plant operations manager with full authority over production, quality, scheduling, and audit in assigned plant',
      isBuiltin: true,
      applicableNodeTypes: JSON.stringify(['PLANT']),
      permissions: [
        'workorder:view',
        'workorder:start',
        'workorder:stop',
        'workorder:release',
        'production:report',
        'quality:inspect',
        'quality:disposition',
        'recipe:view',
        'audit:view',
        'scope:view',
      ],
    },
    {
      name: 'Supervisor',
      description: 'Area supervisor with operational control, recipe adjustments, and safety overrides in assigned area',
      isBuiltin: true,
      applicableNodeTypes: JSON.stringify(['AREA']),
      permissions: [
        'workorder:view',
        'workorder:start',
        'workorder:stop',
        'production:report',
        'quality:inspect',
        'recipe:view',
        'recipe:edit',
        'equipment:override',
        'scope:view',
      ],
    },
    {
      name: 'Operator',
      description: 'Machine operator authorized to view orders, run cycles, report production, and inspect parts on assigned nodes',
      isBuiltin: true,
      applicableNodeTypes: JSON.stringify(['AREA', 'MACHINE']),
      permissions: [
        'workorder:view',
        'workorder:start',
        'workorder:stop',
        'production:report',
        'quality:inspect',
        'recipe:view',
      ],
    },
  ];

  const roleMap = new Map<string, string>();
  for (const r of builtinRoles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        description: r.description,
        isBuiltin: r.isBuiltin,
        applicableNodeTypes: r.applicableNodeTypes,
      },
      create: {
        name: r.name,
        description: r.description,
        isBuiltin: r.isBuiltin,
        applicableNodeTypes: r.applicableNodeTypes,
      },
    });
    roleMap.set(role.name, role.id);

    // Sync role permissions
    for (const permCode of r.permissions) {
      const permId = permissionMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            uq_role_permission: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }
  console.log(`✓ Seeded ${builtinRoles.length} built-in roles with permission mappings.`);

  // 3. Hierarchical Scope Tree (PT Xyz Multi-Plant Enterprise)
  // Root: /global/
  const rootNode = await prisma.scopeNode.upsert({
    where: { path: '/global/' },
    update: { name: 'PT Xyz Enterprise', type: 'GLOBAL', isActive: true },
    create: {
      code: 'global',
      name: 'PT Xyz Enterprise',
      type: 'GLOBAL',
      path: '/global/',
      isActive: true,
    },
  });

  // Plants
  const plant1Node = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/' },
    update: { name: 'Plant 01 (Cikarang)', type: 'PLANT', parentId: rootNode.id, isActive: true },
    create: {
      parentId: rootNode.id,
      code: 'plant-01',
      name: 'Plant 01 (Cikarang)',
      type: 'PLANT',
      path: '/global/plant-01/',
      isActive: true,
    },
  });

  const plant2Node = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/' },
    update: { name: 'Plant 02 (Karawang)', type: 'PLANT', parentId: rootNode.id, isActive: true },
    create: {
      parentId: rootNode.id,
      code: 'plant-02',
      name: 'Plant 02 (Karawang)',
      type: 'PLANT',
      path: '/global/plant-02/',
      isActive: true,
    },
  });

  // Areas for Plant 01
  const p1FinInsp = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/fin-insp/' },
    update: { name: 'Final Inspection Area P1', type: 'AREA', parentId: plant1Node.id, isActive: true },
    create: {
      parentId: plant1Node.id,
      code: 'fin-insp',
      name: 'Final Inspection Area P1',
      type: 'AREA',
      path: '/global/plant-01/fin-insp/',
      isActive: true,
    },
  });

  const p1InjMold = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/inj-mold/' },
    update: { name: 'Injection Molding Hall P1', type: 'AREA', parentId: plant1Node.id, isActive: true },
    create: {
      parentId: plant1Node.id,
      code: 'inj-mold',
      name: 'Injection Molding Hall P1',
      type: 'AREA',
      path: '/global/plant-01/inj-mold/',
      isActive: true,
    },
  });

  // Machines for Plant 01
  const p1Atm01 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/fin-insp/atm-01/' },
    update: { name: 'ATM-01 Auto Testing Machine', type: 'MACHINE', parentId: p1FinInsp.id, isActive: true },
    create: {
      parentId: p1FinInsp.id,
      code: 'atm-01',
      name: 'ATM-01 Auto Testing Machine',
      type: 'MACHINE',
      path: '/global/plant-01/fin-insp/atm-01/',
      isActive: true,
    },
  });

  const p1Dbr01 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/fin-insp/dbr-01/' },
    update: { name: 'DBR-01 Deburring Unit', type: 'MACHINE', parentId: p1FinInsp.id, isActive: true },
    create: {
      parentId: p1FinInsp.id,
      code: 'dbr-01',
      name: 'DBR-01 Deburring Unit',
      type: 'MACHINE',
      path: '/global/plant-01/fin-insp/dbr-01/',
      isActive: true,
    },
  });

  const p1Imm01 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/inj-mold/imm-01/' },
    update: { name: 'IMM-01 Hydraulic 150T', type: 'MACHINE', parentId: p1InjMold.id, isActive: true },
    create: {
      parentId: p1InjMold.id,
      code: 'imm-01',
      name: 'IMM-01 Hydraulic 150T',
      type: 'MACHINE',
      path: '/global/plant-01/inj-mold/imm-01/',
      isActive: true,
    },
  });

  const p1Imm02 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-01/inj-mold/imm-02/' },
    update: { name: 'IMM-02 All-Electric 200T (Plant 01)', type: 'MACHINE', parentId: p1InjMold.id, isActive: true },
    create: {
      parentId: p1InjMold.id,
      code: 'imm-02',
      name: 'IMM-02 All-Electric 200T (Plant 01)',
      type: 'MACHINE',
      path: '/global/plant-01/inj-mold/imm-02/',
      isActive: true,
    },
  });

  // Areas for Plant 02
  const p2FinInsp = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/fin-insp/' },
    update: { name: 'Final Inspection Area P2', type: 'AREA', parentId: plant2Node.id, isActive: true },
    create: {
      parentId: plant2Node.id,
      code: 'fin-insp',
      name: 'Final Inspection Area P2',
      type: 'AREA',
      path: '/global/plant-02/fin-insp/',
      isActive: true,
    },
  });

  const p2InjMold = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/inj-mold/' },
    update: { name: 'Injection Molding Hall P2', type: 'AREA', parentId: plant2Node.id, isActive: true },
    create: {
      parentId: plant2Node.id,
      code: 'inj-mold',
      name: 'Injection Molding Hall P2',
      type: 'AREA',
      path: '/global/plant-02/inj-mold/',
      isActive: true,
    },
  });

  // Machines for Plant 02
  const p2Atm02 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/fin-insp/atm-02/' },
    update: { name: 'ATM-02 Auto Testing Machine', type: 'MACHINE', parentId: p2FinInsp.id, isActive: true },
    create: {
      parentId: p2FinInsp.id,
      code: 'atm-02',
      name: 'ATM-02 Auto Testing Machine',
      type: 'MACHINE',
      path: '/global/plant-02/fin-insp/atm-02/',
      isActive: true,
    },
  });

  const p2Dbr02 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/fin-insp/dbr-02/' },
    update: { name: 'DBR-02 Deburring Unit', type: 'MACHINE', parentId: p2FinInsp.id, isActive: true },
    create: {
      parentId: p2FinInsp.id,
      code: 'dbr-02',
      name: 'DBR-02 Deburring Unit',
      type: 'MACHINE',
      path: '/global/plant-02/fin-insp/dbr-02/',
      isActive: true,
    },
  });

  const p2Imm02 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/inj-mold/imm-02/' },
    update: { name: 'IMM-02 Heavy-Duty 350T (Plant 02)', type: 'MACHINE', parentId: p2InjMold.id, isActive: true },
    create: {
      parentId: p2InjMold.id,
      code: 'imm-02',
      name: 'IMM-02 Heavy-Duty 350T (Plant 02)',
      type: 'MACHINE',
      path: '/global/plant-02/inj-mold/imm-02/',
      isActive: true,
    },
  });

  const p2Imm03 = await prisma.scopeNode.upsert({
    where: { path: '/global/plant-02/inj-mold/imm-03/' },
    update: { name: 'IMM-03 High-Speed 180T', type: 'MACHINE', parentId: p2InjMold.id, isActive: true },
    create: {
      parentId: p2InjMold.id,
      code: 'imm-03',
      name: 'IMM-03 High-Speed 180T',
      type: 'MACHINE',
      path: '/global/plant-02/inj-mold/imm-03/',
      isActive: true,
    },
  });

  console.log('✓ Seeded multi-plant Scope Tree hierarchy with trailing slash materialized paths.');

  // 4. Default Seed Users with Scoped Assignments
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const sysAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'System Administrator' } });
  const plantMgrRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Plant Manager' } });
  const supervisorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Supervisor' } });
  const operatorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Operator' } });

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { isActive: true },
    create: {
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@mes.local',
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
  });

  await prisma.roleAssignment.upsert({
    where: { id: `asgn-admin-${adminUser.id}` },
    update: { validTo: null },
    create: {
      id: `asgn-admin-${adminUser.id}`,
      userId: adminUser.id,
      roleId: sysAdminRole.id,
      scopeNodeId: rootNode.id,
      validFrom: new Date('2020-01-01'),
      validTo: null,
      grantedBy: 'system-seed',
    },
  });

  console.log('✓ Seeded admin user with global Super-User assignment.');

  return {
    rootNode,
    plant1Node,
    plant2Node,
    p1FinInsp,
    p1InjMold,
    p1Atm01,
    p1Dbr01,
    p1Imm01,
    p1Imm02,
    p2FinInsp,
    p2InjMold,
    p2Atm02,
    p2Dbr02,
    p2Imm02,
    p2Imm03,
    roles: { sysAdminRole, plantMgrRole, supervisorRole, operatorRole },
  };
}

if (process.argv[1]?.endsWith('seed-iam.ts') || process.argv[1]?.endsWith('seed-iam.js')) {
  seedIam()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
