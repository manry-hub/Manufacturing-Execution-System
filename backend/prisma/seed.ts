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

  // 2. Default Users & Role Assignments
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { username: 'admin', email: 'admin@mes.local', role: 'System Administrator' },
    { username: 'supervisor', email: 'supervisor@mes.local', role: 'Production Supervisor' },
    { username: 'operator', email: 'operator@mes.local', role: 'Machine Operator' },
    { username: 'technician', email: 'technician@mes.local', role: 'Maintenance Technician' },
    { username: 'planner', email: 'planner@mes.local', role: 'Production Planner' },
    { username: 'quality_inspector', email: 'quality@mes.local', role: 'Quality Inspector' },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: defaultPasswordHash, isActive: true },
      create: {
        username: u.username,
        email: u.email,
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
    });

    const roleId = createdRoles.get(u.role);
    if (roleId) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId,
        },
      });
    }
  }
  console.log(`✓ Seeded ${demoUsers.length} standard demo users with password "password123".`);

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

  const createdMachines = new Map<string, string>();
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
    createdMachines.set(machine.code, machine.id);

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

  // 6. Materials & Raw Material Lots (Genealogy)
  const materials = [
    { code: 'RES-PP-HOMO', name: 'Polypropylene Homopolymer (MFI 12)', category: 'BASE_RESIN', densityGcm3: 0.905 },
    { code: 'RES-ABS-HI', name: 'High-Impact Acrylonitrile Butadiene Styrene', category: 'BASE_RESIN', densityGcm3: 1.050 },
    { code: 'MB-BLK-01', name: 'Black Masterbatch (40% Carbon Black)', category: 'MASTERBATCH', densityGcm3: 1.120 },
    { code: 'RES-PP-REGRIND', name: 'In-House Reground Clean PP Flake', category: 'REGRIND', densityGcm3: 0.900 },
  ];

  const createdMaterials = new Map<string, string>();
  for (const mat of materials) {
    const record = await prisma.material.upsert({
      where: { code: mat.code },
      update: { name: mat.name, category: mat.category, densityGcm3: mat.densityGcm3 },
      create: mat,
    });
    createdMaterials.set(record.code, record.id);
  }

  const materialLots = [
    {
      materialCode: 'RES-PP-HOMO',
      lotNumber: 'LOT-PP-202610-01',
      supplierLot: 'LB-2026-X89',
      initialQtyKg: 5000.0,
      remainingQtyKg: 4850.0,
      status: 'AVAILABLE',
      expirationDate: new Date('2027-10-31'),
    },
    {
      materialCode: 'RES-ABS-HI',
      lotNumber: 'LOT-ABS-202610-02',
      supplierLot: 'INEOS-5541A',
      initialQtyKg: 3000.0,
      remainingQtyKg: 2900.0,
      status: 'AVAILABLE',
      expirationDate: new Date('2027-12-31'),
    },
    {
      materialCode: 'MB-BLK-01',
      lotNumber: 'LOT-MB-202610-03',
      supplierLot: 'CAB-9921',
      initialQtyKg: 500.0,
      remainingQtyKg: 475.0,
      status: 'AVAILABLE',
      expirationDate: new Date('2028-06-30'),
    },
    {
      materialCode: 'RES-PP-REGRIND',
      lotNumber: 'LOT-REG-202610-04',
      supplierLot: 'INTERNAL-GRIND-1',
      initialQtyKg: 800.0,
      remainingQtyKg: 750.0,
      status: 'AVAILABLE',
      expirationDate: null,
    },
  ];

  for (const lot of materialLots) {
    const materialId = createdMaterials.get(lot.materialCode)!;
    await prisma.materialLot.upsert({
      where: { lotNumber: lot.lotNumber },
      update: {
        supplierLot: lot.supplierLot,
        initialQtyKg: lot.initialQtyKg,
        remainingQtyKg: lot.remainingQtyKg,
        status: lot.status,
        expirationDate: lot.expirationDate,
      },
      create: {
        materialId,
        lotNumber: lot.lotNumber,
        supplierLot: lot.supplierLot,
        initialQtyKg: lot.initialQtyKg,
        remainingQtyKg: lot.remainingQtyKg,
        status: lot.status,
        expirationDate: lot.expirationDate,
      },
    });
  }
  console.log(`✓ Seeded ${materials.length} raw materials and ${materialLots.length} material lots.`);

  // 7. Quality Inspection Plans & Items
  const bumperProductId = createdProducts.get('PRD-AUTO-BUMPER')!;
  let bumperPlan = await prisma.inspectionPlan.findFirst({
    where: { productId: bumperProductId, name: 'Automotive Bumper First-Piece & Patrol Plan' },
  });
  if (!bumperPlan) {
    bumperPlan = await prisma.inspectionPlan.create({
      data: {
        productId: bumperProductId,
        name: 'Automotive Bumper First-Piece & Patrol Plan',
        version: 1,
        isActive: true,
      },
    });
  }

  const bumperPlanItems = [
    { sequence: 1, parameterName: 'Critical Width Dimension (mm)', measurementType: 'VARIABLE', targetValue: 1450.0, upperTolerance: 1452.0, lowerTolerance: 1448.0, inspectionStage: 'FIRST_PIECE' },
    { sequence: 2, parameterName: 'Wall Thickness Section A (mm)', measurementType: 'VARIABLE', targetValue: 3.2, upperTolerance: 3.4, lowerTolerance: 3.0, inspectionStage: 'FIRST_PIECE' },
    { sequence: 3, parameterName: 'Surface Sink Marks / Flash Presence', measurementType: 'ATTRIBUTE', targetValue: null, upperTolerance: null, lowerTolerance: null, inspectionStage: 'FIRST_PIECE' },
    { sequence: 4, parameterName: 'Gate Vestige Height (mm)', measurementType: 'VARIABLE', targetValue: 0.5, upperTolerance: 0.8, lowerTolerance: 0.0, inspectionStage: 'PATROL' },
  ];

  for (const item of bumperPlanItems) {
    const existing = await prisma.inspectionPlanItem.findFirst({
      where: { planId: bumperPlan.id, sequence: item.sequence },
    });
    if (!existing) {
      await prisma.inspectionPlanItem.create({
        data: {
          planId: bumperPlan.id,
          sequence: item.sequence,
          parameterName: item.parameterName,
          measurementType: item.measurementType,
          targetValue: item.targetValue,
          upperTolerance: item.upperTolerance,
          lowerTolerance: item.lowerTolerance,
          inspectionStage: item.inspectionStage,
        },
      });
    }
  }

  const trimProductId = createdProducts.get('PRD-DOOR-TRIM')!;
  let trimPlan = await prisma.inspectionPlan.findFirst({
    where: { productId: trimProductId, name: 'Door Trim Panel Quality Plan' },
  });
  if (!trimPlan) {
    trimPlan = await prisma.inspectionPlan.create({
      data: {
        productId: trimProductId,
        name: 'Door Trim Panel Quality Plan',
        version: 1,
        isActive: true,
      },
    });
  }

  const trimPlanItems = [
    { sequence: 1, parameterName: 'Mounting Clip Hole Diameter (mm)', measurementType: 'VARIABLE', targetValue: 8.5, upperTolerance: 8.65, lowerTolerance: 8.35, inspectionStage: 'FIRST_PIECE' },
    { sequence: 2, parameterName: 'Surface Texture Uniformity & Gloss', measurementType: 'ATTRIBUTE', targetValue: null, upperTolerance: null, lowerTolerance: null, inspectionStage: 'PATROL' },
  ];

  for (const item of trimPlanItems) {
    const existing = await prisma.inspectionPlanItem.findFirst({
      where: { planId: trimPlan.id, sequence: item.sequence },
    });
    if (!existing) {
      await prisma.inspectionPlanItem.create({
        data: {
          planId: trimPlan.id,
          sequence: item.sequence,
          parameterName: item.parameterName,
          measurementType: item.measurementType,
          targetValue: item.targetValue,
          upperTolerance: item.upperTolerance,
          lowerTolerance: item.lowerTolerance,
          inspectionStage: item.inspectionStage,
        },
      });
    }
  }
  console.log('✓ Seeded inspection plans and tolerance items for bumper and door trim.');

  // 8. Mold Preventive Maintenance Schedules
  const pmSchedules = [
    { moldCode: 'MOLD-BUMP-2C', pmLevel: 'LEVEL_1_CLEAN', intervalShots: BigInt(25000), lastServicedShot: BigInt(10000) },
    { moldCode: 'MOLD-BUMP-2C', pmLevel: 'LEVEL_2_INSPECT', intervalShots: BigInt(50000), lastServicedShot: BigInt(0) },
    { moldCode: 'MOLD-BUMP-2C', pmLevel: 'LEVEL_3_OVERHAUL', intervalShots: BigInt(100000), lastServicedShot: BigInt(0) },
    { moldCode: 'MOLD-TRIM-4C', pmLevel: 'LEVEL_1_CLEAN', intervalShots: BigInt(20000), lastServicedShot: BigInt(20000) },
    { moldCode: 'MOLD-TRIM-4C', pmLevel: 'LEVEL_2_INSPECT', intervalShots: BigInt(40000), lastServicedShot: BigInt(0) },
    { moldCode: 'MOLD-TRIM-4C', pmLevel: 'LEVEL_3_OVERHAUL', intervalShots: BigInt(80000), lastServicedShot: BigInt(0) },
    { moldCode: 'MOLD-DUCT-2C', pmLevel: 'LEVEL_1_CLEAN', intervalShots: BigInt(30000), lastServicedShot: BigInt(0) },
  ];

  for (const pm of pmSchedules) {
    const moldId = createdMolds.get(pm.moldCode)!;
    const existing = await prisma.moldPmSchedule.findFirst({
      where: { moldId, pmLevel: pm.pmLevel },
    });
    if (!existing) {
      await prisma.moldPmSchedule.create({
        data: {
          moldId,
          pmLevel: pm.pmLevel,
          intervalShots: pm.intervalShots,
          lastServicedShot: pm.lastServicedShot,
          isActive: true,
        },
      });
    }
  }
  console.log(`✓ Seeded ${pmSchedules.length} mold PM schedules.`);

  // 9. Mold Changeovers Matrix
  const changeovers = [
    { fromMold: 'MOLD-BUMP-2C', toMold: 'MOLD-TRIM-4C', setupMinutes: 45, purgeMinutes: 15 },
    { fromMold: 'MOLD-TRIM-4C', toMold: 'MOLD-BUMP-2C', setupMinutes: 45, purgeMinutes: 15 },
    { fromMold: 'MOLD-BUMP-2C', toMold: 'MOLD-DUCT-2C', setupMinutes: 30, purgeMinutes: 10 },
    { fromMold: 'MOLD-DUCT-2C', toMold: 'MOLD-BUMP-2C', setupMinutes: 30, purgeMinutes: 10 },
  ];

  for (const co of changeovers) {
    const fromMoldId = createdMolds.get(co.fromMold)!;
    const toMoldId = createdMolds.get(co.toMold)!;
    await prisma.moldChangeover.upsert({
      where: {
        uq_mold_changeover: {
          fromMoldId,
          toMoldId,
        },
      },
      update: { setupMinutes: co.setupMinutes, purgeMinutes: co.purgeMinutes },
      create: {
        fromMoldId,
        toMoldId,
        setupMinutes: co.setupMinutes,
        purgeMinutes: co.purgeMinutes,
      },
    });
  }
  console.log(`✓ Seeded ${changeovers.length} mold changeover standard transition rules.`);

  // 10. Demo Hybrid Production Order & Routing Steps (ISA-95 Hybrid Demonstration)
  const now = new Date();
  const demoOrder = await prisma.productionOrder.upsert({
    where: { orderNumber: 'WO-DEMO-2026-001' },
    update: {
      targetQuantity: 2000,
      packedQuantity: 400,
      status: 'IN_PROGRESS',
    },
    create: {
      orderNumber: 'WO-DEMO-2026-001',
      productId: bumperProductId,
      targetQuantity: 2000,
      packedQuantity: 400,
      status: 'IN_PROGRESS',
      plannedStartTime: now,
      actualStartTime: now,
    },
  });

  const routingSteps = [
    { sequence: 1, operationName: 'MOLDING', stationType: 'INJECTION_MACHINE', status: 'IN_PROGRESS', quantityIn: 2000, quantityPassed: 450, quantityScrapped: 12 },
    { sequence: 2, operationName: 'SECONDARY_FINISHING', stationType: 'MANUAL_WORKBENCH', status: 'IN_PROGRESS', quantityIn: 450, quantityPassed: 430, quantityScrapped: 5 },
    { sequence: 3, operationName: 'PACKAGING', stationType: 'PACKAGING_STATION', status: 'PENDING', quantityIn: 430, quantityPassed: 400, quantityScrapped: 0 },
  ];

  for (const step of routingSteps) {
    const existing = await prisma.orderOperationStep.findFirst({
      where: { productionOrderId: demoOrder.id, sequence: step.sequence },
    });
    if (!existing) {
      await prisma.orderOperationStep.create({
        data: {
          productionOrderId: demoOrder.id,
          sequence: step.sequence,
          operationName: step.operationName,
          stationType: step.stationType,
          status: step.status,
          quantityIn: step.quantityIn,
          quantityPassed: step.quantityPassed,
          quantityScrapped: step.quantityScrapped,
          startedAt: now,
        },
      });
    }
  }
  console.log('✓ Seeded demo hybrid production order with multi-stage routing steps.');

  // 11. Demo Scheduled Orders & Unscheduled Backlog for Visual Gantt Scheduling
  const todayMorning = new Date();
  todayMorning.setHours(7, 0, 0, 0);

  const schedOrders = [
    {
      orderNumber: 'WO-SCHED-IMM01-1',
      productId: createdProducts.get('PRD-DOOR-TRIM')!,
      targetQuantity: 1600,
      assignedMachineId: createdMachines.get('IMM-01')!,
      assignedMoldId: createdMolds.get('MOLD-TRIM-4C')!,
      plannedStartTime: new Date(todayMorning.getTime()),
      plannedEndTime: new Date(todayMorning.getTime() + 4 * 3600 * 1000), // 4 hours
      priority: 2,
      status: 'SCHEDULED',
      schedulingNotes: 'High priority customer batch for automotive door panels',
    },
    {
      orderNumber: 'WO-SCHED-IMM01-2',
      productId: createdProducts.get('PRD-HVAC-DUCT')!,
      targetQuantity: 2000,
      assignedMachineId: createdMachines.get('IMM-01')!,
      assignedMoldId: createdMolds.get('MOLD-DUCT-2C')!,
      plannedStartTime: new Date(todayMorning.getTime() + 5 * 3600 * 1000), // 5th hour (1h changeover after order 1)
      plannedEndTime: new Date(todayMorning.getTime() + 9.5 * 3600 * 1000),
      priority: 3,
      status: 'SCHEDULED',
      schedulingNotes: 'Standard HVAC air duct lot',
    },
    {
      orderNumber: 'WO-SCHED-IMM03-1',
      productId: createdProducts.get('PRD-HVAC-DUCT')!,
      targetQuantity: 3200,
      assignedMachineId: createdMachines.get('IMM-03')!,
      assignedMoldId: createdMolds.get('MOLD-DUCT-2C')!,
      plannedStartTime: new Date(todayMorning.getTime() + 1 * 3600 * 1000),
      plannedEndTime: new Date(todayMorning.getTime() + 8 * 3600 * 1000),
      priority: 1, // Urgent
      status: 'IN_PROGRESS',
      schedulingNotes: 'Expedited rush order for cooling system components',
    },
    {
      orderNumber: 'WO-SCHED-IMM07-1',
      productId: createdProducts.get('PRD-AUTO-BUMPER')!,
      targetQuantity: 800,
      assignedMachineId: createdMachines.get('IMM-07')!,
      assignedMoldId: createdMolds.get('MOLD-BUMP-2C')!,
      plannedStartTime: new Date(todayMorning.getTime() + 2 * 3600 * 1000),
      plannedEndTime: new Date(todayMorning.getTime() + 9 * 3600 * 1000),
      priority: 2,
      status: 'SCHEDULED',
      schedulingNotes: '500T bumper run with dual cavity tool',
    },
  ];

  for (const so of schedOrders) {
    await prisma.productionOrder.upsert({
      where: { orderNumber: so.orderNumber },
      update: {
        productId: so.productId,
        targetQuantity: so.targetQuantity,
        assignedMachineId: so.assignedMachineId,
        assignedMoldId: so.assignedMoldId,
        plannedStartTime: so.plannedStartTime,
        plannedEndTime: so.plannedEndTime,
        priority: so.priority,
        status: so.status,
        schedulingNotes: so.schedulingNotes,
      },
      create: so,
    });
  }

  // Unscheduled backlog orders (DRAFT)
  const backlogOrders = [
    {
      orderNumber: 'WO-BACKLOG-001',
      productId: createdProducts.get('PRD-DOOR-TRIM')!,
      targetQuantity: 4000,
      plannedStartTime: new Date(todayMorning.getTime() + 24 * 3600 * 1000),
      priority: 3,
      status: 'DRAFT',
      schedulingNotes: 'Pending machine slot assignment',
    },
    {
      orderNumber: 'WO-BACKLOG-002',
      productId: createdProducts.get('PRD-HVAC-DUCT')!,
      targetQuantity: 2500,
      plannedStartTime: new Date(todayMorning.getTime() + 24 * 3600 * 1000),
      priority: 1, // Rush
      status: 'DRAFT',
      schedulingNotes: 'Customer requested delivery within 48 hours',
    },
    {
      orderNumber: 'WO-BACKLOG-003',
      productId: createdProducts.get('PRD-AUTO-BUMPER')!,
      targetQuantity: 600,
      plannedStartTime: new Date(todayMorning.getTime() + 30 * 3600 * 1000),
      priority: 2,
      status: 'DRAFT',
      schedulingNotes: 'Requires 500T machine (IMM-07 or IMM-08)',
    },
  ];

  for (const bo of backlogOrders) {
    await prisma.productionOrder.upsert({
      where: { orderNumber: bo.orderNumber },
      update: {
        productId: bo.productId,
        targetQuantity: bo.targetQuantity,
        plannedStartTime: bo.plannedStartTime,
        priority: bo.priority,
        status: bo.status,
        schedulingNotes: bo.schedulingNotes,
      },
      create: bo,
    });
  }
  console.log('✓ Seeded scheduled timeline orders and unscheduled backlog orders for Gantt board.');

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
