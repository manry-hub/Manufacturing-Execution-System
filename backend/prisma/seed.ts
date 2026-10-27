import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Roles
  const roles = [
    { name: 'System Administrator', description: 'System governance, security, and full administrative configuration' },
    { name: 'Production Planner', description: 'Production scheduling, work orders, and routing definitions' },
    { name: 'Production Supervisor', description: 'Shop floor monitoring, machine dispatch, and escalation management' },
    { name: 'Machine Operator', description: 'Machine station operation, scrap reporting, and Andon triggers' },
    { name: 'Quality Inspector', description: 'Quality inspection sampling, defect coding, and lot dispositioning' },
    { name: 'Maintenance Technician', description: 'Breakdown response, repair execution, and Andon ticket resolution' },
    { name: 'Maintenance Supervisor', description: 'Equipment reliability management and PM scheduling' },
    { name: 'Material Handler', description: 'Material lot management and WIP movement' },
    { name: 'Management / Read-only Analyst', description: 'Executive OEE reporting and operational analytics' },
  ];

  const createdRoles = new Map<string, string>();
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    createdRoles.set(role.name, role.id);
  }
  console.log(`✓ Seeded ${roles.length} canonical roles.`);

  // 2. Default Administrator User
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      email: 'admin@mes.local',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  const adminRoleId = createdRoles.get('System Administrator');
  if (adminRoleId) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    });
  }
  console.log('✓ Seeded default admin user (admin / AdminPassword123!).');

  // 3. Factory Topology (Plant 01, 4 Areas, 10 Virtual Machines)
  const plant = await prisma.plant.upsert({
    where: { code: 'PLANT-01' },
    update: { name: 'Main Injection Molding Facility', timezone: 'Asia/Jakarta' },
    create: {
      code: 'PLANT-01',
      name: 'Main Injection Molding Facility',
      timezone: 'Asia/Jakarta',
    },
  });

  const areas = [
    { code: 'INJ-PROD', name: 'Injection Production Area' },
    { code: 'FIN-INSP', name: 'Finishing & Inspection Area' },
    { code: 'MAT-PREP', name: 'Material & Mold Preparation Area' },
    { code: 'Q-MAINT', name: 'Quality & Maintenance Area' },
  ];

  const createdAreas = new Map<string, string>();
  for (const areaData of areas) {
    const area = await prisma.productionArea.upsert({
      where: {
        uq_area_plant_code: {
          plantId: plant.id,
          code: areaData.code,
        },
      },
      update: { name: areaData.name },
      create: {
        plantId: plant.id,
        code: areaData.code,
        name: areaData.name,
      },
    });
    createdAreas.set(area.code, area.id);
  }
  console.log(`✓ Seeded Plant 01 and ${areas.length} operational areas.`);

  const injectionAreaId = createdAreas.get('INJ-PROD')!;

  // 10 Virtual Injection Molding Machines (8 normal, 1 slow cycle, 1 fault candidate)
  const machines = [
    { code: 'IMM-01', name: 'Battenfeld 150T', tonnage: 150 },
    { code: 'IMM-02', name: 'Battenfeld 150T', tonnage: 150 },
    { code: 'IMM-03', name: 'Engel Victory 200T', tonnage: 200 },
    { code: 'IMM-04', name: 'Engel Victory 200T', tonnage: 200 },
    { code: 'IMM-05', name: 'KraussMaffei 350T', tonnage: 350 },
    { code: 'IMM-06', name: 'KraussMaffei 350T', tonnage: 350 },
    { code: 'IMM-07', name: 'Haitian Mars 500T', tonnage: 500 },
    { code: 'IMM-08', name: 'Haitian Mars 500T', tonnage: 500 },
    { code: 'IMM-09', name: 'Fanuc Roboshot 150T', tonnage: 150 }, // Slow cycle candidate
    { code: 'IMM-10', name: 'Demag Ergotech 250T', tonnage: 250 }, // Fault & Andon candidate
  ];

  for (const machineData of machines) {
    const machine = await prisma.machine.upsert({
      where: { code: machineData.code },
      update: {
        name: machineData.name,
        clampingTonnage: machineData.tonnage,
        areaId: injectionAreaId,
        isVirtual: true,
      },
      create: {
        code: machineData.code,
        name: machineData.name,
        clampingTonnage: machineData.tonnage,
        areaId: injectionAreaId,
        isVirtual: true,
      },
    });

    // Seed default idle/stopped projection state
    await prisma.machineCurrentState.upsert({
      where: { machineId: machine.id },
      update: {},
      create: {
        machineId: machine.id,
        normalizedStatus: 'IDLE',
        rawStatus: 'STANDBY',
        lastEventTimestamp: new Date(),
        connectionStatus: 'ONLINE',
      },
    });
  }
  console.log(`✓ Seeded 10 virtual injection molding machines (IMM-01 to IMM-10).`);

  // 4. Products & Molds
  const products = [
    { partNumber: 'PRD-AUTO-BUMPER', name: 'Front Bumper Fascia', standardCycleTime: 30.0 },
    { partNumber: 'PRD-DOOR-TRIM', name: 'Interior Door Trim Panel', standardCycleTime: 22.0 },
    { partNumber: 'PRD-HVAC-DUCT', name: 'Air Conditioning Duct', standardCycleTime: 16.0 },
  ];

  const createdProducts = new Map<string, string>();
  for (const prodData of products) {
    const prod = await prisma.product.upsert({
      where: { partNumber: prodData.partNumber },
      update: { name: prodData.name, standardCycleTime: prodData.standardCycleTime },
      create: prodData,
    });
    createdProducts.set(prod.partNumber, prod.id);
  }

  const molds = [
    { code: 'MOLD-BUMP-2C', name: 'Front Bumper Dual Cavity Mold', cavityCount: 2, totalShots: BigInt(12500) },
    { code: 'MOLD-TRIM-4C', name: 'Door Trim Quad Cavity Mold', cavityCount: 4, totalShots: BigInt(34000) },
    { code: 'MOLD-DUCT-2C', name: 'HVAC Duct Dual Cavity Mold', cavityCount: 2, totalShots: BigInt(8000) },
  ];

  const createdMolds = new Map<string, string>();
  for (const moldData of molds) {
    const mold = await prisma.mold.upsert({
      where: { code: moldData.code },
      update: { name: moldData.name, cavityCount: moldData.cavityCount, totalShots: moldData.totalShots },
      create: moldData,
    });
    createdMolds.set(mold.code, mold.id);
  }

  // Compatibilities
  const compatibilities = [
    { moldCode: 'MOLD-BUMP-2C', partNumber: 'PRD-AUTO-BUMPER', idealCycleTime: 28.5 },
    { moldCode: 'MOLD-TRIM-4C', partNumber: 'PRD-DOOR-TRIM', idealCycleTime: 20.0 },
    { moldCode: 'MOLD-DUCT-2C', partNumber: 'PRD-HVAC-DUCT', idealCycleTime: 15.0 },
  ];

  for (const comp of compatibilities) {
    const moldId = createdMolds.get(comp.moldCode)!;
    const productId = createdProducts.get(comp.partNumber)!;
    await prisma.moldProductCompatibility.upsert({
      where: {
        uq_mold_product: {
          moldId,
          productId,
        },
      },
      update: { idealCycleTime: comp.idealCycleTime },
      create: {
        moldId,
        productId,
        idealCycleTime: comp.idealCycleTime,
      },
    });
  }
  console.log(`✓ Seeded ${products.length} products, ${molds.length} molds, and compatibility records.`);

  // 5. Downtime Reasons
  const downtimeReasons = [
    { code: 'PLN-MOLD-CHANGE', category: 'MOLD_CHANGEOVER', description: 'Scheduled mold exchange and setup', isPlanned: true },
    { code: 'PLN-CLEAN', category: 'CLEANING', description: 'Scheduled purge and platen cleaning', isPlanned: true },
    { code: 'PLN-MAINT', category: 'PREVENTIVE_MAINTENANCE', description: 'Scheduled periodic maintenance inspection', isPlanned: true },
    { code: 'UNP-E-STOP', category: 'SAFETY_STOP', description: 'Emergency stop asserted by operator/interlock', isPlanned: false },
    { code: 'UNP-HEAT-FAULT', category: 'HEATER_FAILURE', description: 'Barrel zone thermocouple open or thermal runaway', isPlanned: false },
    { code: 'UNP-HYD-JAM', category: 'HYDRAULIC_FAULT', description: 'Clamping hydraulic pressure drop or mechanical jam', isPlanned: false },
    { code: 'UNP-RESIN-STARVE', category: 'MATERIAL_SHORTAGE', description: 'Hopper resin level below minimum threshold', isPlanned: false },
  ];

  for (const reason of downtimeReasons) {
    await prisma.downtimeReason.upsert({
      where: { code: reason.code },
      update: { category: reason.category, description: reason.description, isPlanned: reason.isPlanned },
      create: reason,
    });
  }
  console.log(`✓ Seeded ${downtimeReasons.length} standard downtime reasons.`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
