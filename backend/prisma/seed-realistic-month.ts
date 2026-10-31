import { PrismaClient } from '@prisma/client';

export interface SeedMonthContext {
  plantId: string;
  createdMachines: Map<string, string>; // code -> id
  createdProducts: Map<string, string>; // partNumber -> id
  createdMolds: Map<string, string>; // code -> id
  downtimeReasonIds: Map<string, string>; // code -> id
  adminUserId: string;
  supervisorUserId: string;
  operatorUserId: string;
}

export async function seedRealisticMonth(prisma: PrismaClient, ctx: SeedMonthContext) {
  console.log('📅 Seeding 30-day realistic automotive operational history (October 1 to 31, 2026)...');

  // 1. Seed Plant 01 Shift Definitions
  const shiftConfigs = [
    {
      shiftNumber: 1,
      code: 'SHIFT_1',
      name: 'Shift 1 (Pagi)',
      startTime: '07:00:00',
      endTime: '15:00:00',
      durationMinutes: 480,
      plannedBreakMinutes: 60,
      crossesMidnight: false,
    },
    {
      shiftNumber: 2,
      code: 'SHIFT_2',
      name: 'Shift 2 (Siang/Sore)',
      startTime: '15:00:00',
      endTime: '23:00:00',
      durationMinutes: 480,
      plannedBreakMinutes: 60,
      crossesMidnight: false,
    },
    {
      shiftNumber: 3,
      code: 'SHIFT_3',
      name: 'Shift 3 (Malam)',
      startTime: '23:00:00',
      endTime: '07:00:00',
      durationMinutes: 480,
      plannedBreakMinutes: 60,
      crossesMidnight: true,
    },
  ];

  const shiftMap = new Map<number, string>();
  for (const s of shiftConfigs) {
    const shift = await prisma.shiftDefinition.upsert({
      where: {
        uq_shift_plant_number: {
          plantId: ctx.plantId,
          shiftNumber: s.shiftNumber,
        },
      },
      update: {
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.durationMinutes,
        plannedBreakMinutes: s.plannedBreakMinutes,
        crossesMidnight: s.crossesMidnight,
      },
      create: {
        plantId: ctx.plantId,
        shiftNumber: s.shiftNumber,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.durationMinutes,
        plannedBreakMinutes: s.plannedBreakMinutes,
        crossesMidnight: s.crossesMidnight,
      },
    });
    shiftMap.set(shift.shiftNumber, shift.id);
  }
  console.log(`✓ Seeded ${shiftConfigs.length} standard shifts for Plant 01.`);

  // 2. Seed Factory Calendar for October 2026 (31 Days)
  const calendarDays = [];
  for (let d = 1; d <= 31; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const dateStr = `2026-10-${dayStr}`;
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 6 = Sat

    let dayType = 'WORKDAY';
    let isOperating = true;
    let description = 'Regular Production Workday';

    if (dayOfWeek === 0) {
      dayType = 'WEEKEND';
      isOperating = false;
      description = 'Sunday Plant Shutdown & Off-Shift';
    } else if (dayOfWeek === 6) {
      dayType = 'WEEKEND';
      isOperating = true;
      description = 'Saturday Partial Operations (Shift 1 Only)';
    }

    const cal = await prisma.factoryCalendarDay.upsert({
      where: {
        uq_factory_calendar_day: {
          plantId: ctx.plantId,
          calendarDate: dateObj,
        },
      },
      update: { dayType, description, isOperating },
      create: {
        plantId: ctx.plantId,
        calendarDate: dateObj,
        dayType,
        description,
        isOperating,
      },
    });
    calendarDays.push(cal);
  }
  console.log(`✓ Seeded ${calendarDays.length} factory calendar days for October 2026.`);

  // 3. Seed Machine Operating Schedules for 10 Machines
  const machineCodes = [
    'IMM-01', 'IMM-02', 'IMM-03', 'IMM-04', 'IMM-05',
    'IMM-06', 'IMM-07', 'IMM-08', 'IMM-09', 'IMM-10',
  ];

  const operatingSchedules = [];
  for (let d = 1; d <= 31; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const nextDayStr = (d + 1 <= 31 ? d + 1 : 31).toString().padStart(2, '0');
    const dateStr = `2026-10-${dayStr}`;
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 6 = Sat

    // Shift 1: 07:00 to 15:00 UTC
    const s1Start = new Date(`${dateStr}T07:00:00.000Z`);
    const s1End = new Date(`${dateStr}T15:00:00.000Z`);

    // Shift 2: 15:00 to 23:00 UTC
    const s2Start = new Date(`${dateStr}T15:00:00.000Z`);
    const s2End = new Date(`${dateStr}T23:00:00.000Z`);

    // Shift 3: 23:00 to 07:00 UTC next day
    const s3Start = new Date(`${dateStr}T23:00:00.000Z`);
    const s3End = new Date(d < 31 ? `2026-10-${nextDayStr}T07:00:00.000Z` : `2026-11-01T07:00:00.000Z`);

    for (const code of machineCodes) {
      const machineId = ctx.createdMachines.get(code)!;

      let s1Mode = 'PRODUCTION';
      let s2Mode = 'PRODUCTION';
      let s3Mode = 'PRODUCTION';

      if (dayOfWeek === 0) {
        // Sunday: plant shutdown
        s1Mode = 'SHUTDOWN';
        s2Mode = 'SHUTDOWN';
        s3Mode = 'SHUTDOWN';
      } else if (dayOfWeek === 6) {
        // Saturday: partial shift 1 for IMM-01 to IMM-04, others standby
        if (['IMM-01', 'IMM-02', 'IMM-03', 'IMM-04'].includes(code)) {
          s1Mode = 'PRODUCTION';
          s2Mode = 'STANDBY';
          s3Mode = 'STANDBY';
        } else {
          s1Mode = 'STANDBY';
          s2Mode = 'STANDBY';
          s3Mode = 'STANDBY';
        }
      } else {
        // Weekdays: IMM-09 (Fanuc slow cycle) and IMM-10 (Demag) run Shifts 1 & 2 only; Shift 3 standby
        if (['IMM-09', 'IMM-10'].includes(code)) {
          s1Mode = 'PRODUCTION';
          s2Mode = 'PRODUCTION';
          s3Mode = 'STANDBY';
        }
      }

      // Shift 1 schedule
      operatingSchedules.push({
        machineId,
        shiftId: shiftMap.get(1)!,
        scheduleDate: dateObj,
        operatingMode: s1Mode,
        plannedDurationMinutes: s1Mode === 'PRODUCTION' ? 420 : 0,
        plannedStartTime: s1Start,
        plannedEndTime: s1End,
      });

      // Shift 2 schedule
      operatingSchedules.push({
        machineId,
        shiftId: shiftMap.get(2)!,
        scheduleDate: dateObj,
        operatingMode: s2Mode,
        plannedDurationMinutes: s2Mode === 'PRODUCTION' ? 420 : 0,
        plannedStartTime: s2Start,
        plannedEndTime: s2End,
      });

      // Shift 3 schedule
      operatingSchedules.push({
        machineId,
        shiftId: shiftMap.get(3)!,
        scheduleDate: dateObj,
        operatingMode: s3Mode,
        plannedDurationMinutes: s3Mode === 'PRODUCTION' ? 420 : 0,
        plannedStartTime: s3Start,
        plannedEndTime: s3End,
      });
    }
  }

  // Batch insert machine operating schedules in chunks
  const chunkSize = 100;
  for (let i = 0; i < operatingSchedules.length; i += chunkSize) {
    const chunk = operatingSchedules.slice(i, i + chunkSize);
    await prisma.machineOperatingSchedule.createMany({
      data: chunk,
    });
  }
  console.log(`✓ Seeded ${operatingSchedules.length} machine operating schedules across 10 machines.`);

  // 4. Setup Products and Molds Mapping
  // Machine -> { productCode, moldCode, idealCycleTime, cavityCount, targetRate }
  const machineProfiles: Record<string, { prod: string; mold: string; cycle: number; cavities: number }> = {
    'IMM-01': { prod: 'PRD-DOOR-TRIM', mold: 'MOLD-TRIM-4C', cycle: 20.0, cavities: 4 },
    'IMM-02': { prod: 'PRD-DOOR-TRIM', mold: 'MOLD-TRIM-4C', cycle: 20.0, cavities: 4 },
    'IMM-03': { prod: 'PRD-HVAC-DUCT', mold: 'MOLD-DUCT-2C', cycle: 15.0, cavities: 2 },
    'IMM-04': { prod: 'PRD-HVAC-DUCT', mold: 'MOLD-DUCT-2C', cycle: 15.0, cavities: 2 },
    'IMM-05': { prod: 'PRD-DOOR-TRIM', mold: 'MOLD-TRIM-4C', cycle: 20.0, cavities: 4 },
    'IMM-06': { prod: 'PRD-DOOR-TRIM', mold: 'MOLD-TRIM-4C', cycle: 20.0, cavities: 4 },
    'IMM-07': { prod: 'PRD-AUTO-BUMPER', mold: 'MOLD-BUMP-2C', cycle: 28.5, cavities: 2 },
    'IMM-08': { prod: 'PRD-AUTO-BUMPER', mold: 'MOLD-BUMP-2C', cycle: 28.5, cavities: 2 },
    'IMM-09': { prod: 'PRD-DOOR-TRIM', mold: 'MOLD-TRIM-4C', cycle: 22.5, cavities: 4 },
    'IMM-10': { prod: 'PRD-AUTO-BUMPER', mold: 'MOLD-BUMP-2C', cycle: 29.5, cavities: 2 },
  };

  // 5. Seed Production Orders across October 2026
  // Generate 4 weekly orders per machine (40 orders total)
  const orderRecords: any[] = [];
  const runRecords: any[] = [];
  const timeSegments: any[] = [];
  const andonTickets: any[] = [];
  const qualityChecks: any[] = [];
  const eventLogs: any[] = [];
  const oeeResults: any[] = [];

  let ticketCounter = 100;
  let eventCounter = 1;
  const activeRunMap = new Map<string, string>(); // code -> runId

  for (const code of machineCodes) {
    const machineId = ctx.createdMachines.get(code)!;
    const profile = machineProfiles[code];
    const productId = ctx.createdProducts.get(profile.prod)!;
    const moldId = ctx.createdMolds.get(profile.mold)!;

    // 4 weeks of production orders in October
    const weeks = [
      { startDay: 1, endDay: 8, orderNo: `WO-OCT-W1-${code}` },
      { startDay: 9, endDay: 16, orderNo: `WO-OCT-W2-${code}` },
      { startDay: 17, endDay: 24, orderNo: `WO-OCT-W3-${code}` },
      { startDay: 25, endDay: 31, orderNo: `WO-OCT-W4-${code}` },
    ];

    for (const w of weeks) {
      const orderStart = new Date(`2026-10-${w.startDay.toString().padStart(2, '0')}T07:00:00.000Z`);
      const orderEnd = new Date(`2026-10-${w.endDay.toString().padStart(2, '0')}T15:00:00.000Z`);

      // Target quantity per week (~28,000 to ~65,000 units depending on cavities)
      const weeklyTarget = profile.cavities === 4 ? 65000 : 28000;
      const isWeek4 = w.endDay === 31;
      const isOrderActive = isWeek4 && code !== 'IMM-10';

      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: w.orderNo,
          productId,
          assignedMachineId: machineId,
          assignedMoldId: moldId,
          targetQuantity: weeklyTarget,
          status: isOrderActive ? 'IN_PROGRESS' : 'COMPLETED',
          plannedStartTime: orderStart,
          plannedEndTime: orderEnd,
          actualStartTime: orderStart,
          actualEndTime: isOrderActive ? null : orderEnd,
          priority: 2,
        },
      });

      // Split week into 2-3 day runs
      const runDays = [
        { dStart: w.startDay, dEnd: Math.min(w.startDay + 2, w.endDay) },
        { dStart: Math.min(w.startDay + 3, w.endDay), dEnd: w.endDay },
      ];

      for (let rIdx = 0; rIdx < runDays.length; rIdx++) {
        const rd = runDays[rIdx];
        if (rd.dStart > rd.dEnd) continue;

        const runStart = new Date(`2026-10-${rd.dStart.toString().padStart(2, '0')}T07:00:00.000Z`);
        const runEnd = new Date(`2026-10-${rd.dEnd.toString().padStart(2, '0')}T23:00:00.000Z`);

        // Compute days active in run
        let operatingDays = 0;
        for (let d = rd.dStart; d <= rd.dEnd; d++) {
          const dateObj = new Date(`2026-10-${d.toString().padStart(2, '0')}T00:00:00.000Z`);
          const dow = dateObj.getUTCDay();
          if (dow !== 0) operatingDays++; // exclude Sundays
        }

        const runHours = operatingDays * (['IMM-09', 'IMM-10'].includes(code) ? 14 : 21);
        const plannedSec = runHours * 3600;
        // Target: Availability 86.7%, Performance 89.7%, Quality 96.4%
        const activeSec = Math.round(plannedSec * 0.867);
        const downtimeSec = Math.round(plannedSec * 0.083);
        const setupSec = Math.round(plannedSec * 0.050);

        // Theoretical shots based on active operating time and ideal cycle
        const theoreticalShots = Math.round(activeSec / profile.cycle);
        const totalShots = Math.round(theoreticalShots * 0.897); // 89.7% performance
        const totalParts = totalShots * profile.cavities;
        const goodQuantity = Math.round(totalParts * 0.964); // 96.4% quality
        const rejectQuantity = totalParts - goodQuantity;

        const isCurrentActiveRun = isOrderActive && rIdx === 1;
        const runStatus = !isCurrentActiveRun
          ? 'COMPLETED'
          : code === 'IMM-08'
          ? 'SETUP'
          : 'ACTIVE';
        const runEndVal = isCurrentActiveRun ? null : runEnd;

        const run = await prisma.productionRun.create({
          data: {
            productionOrderId: order.id,
            machineId,
            moldId,
            status: runStatus,
            totalShots,
            goodQuantity,
            rejectQuantity,
            startTime: runStart,
            endTime: runEndVal,
          },
        });

        if (isCurrentActiveRun) {
          activeRunMap.set(code, run.id);
        }

        // Seed time segments for this run
        // 1. Setup Segment (1h after run start)
        const setupEnd = new Date(runStart.getTime() + setupSec * 1000);
        timeSegments.push({
          machineId,
          category: 'CHANGEOVER',
          startTime: runStart,
          endTime: setupEnd,
          durationSeconds: setupSec,
          downtimeReasonId: ctx.downtimeReasonIds.get('PLN-MOLD-CHANGE'),
        });

        // 2. Active Operating Segment
        const activeEnd = new Date(setupEnd.getTime() + activeSec * 1000);
        timeSegments.push({
          machineId,
          category: 'OPERATING',
          startTime: setupEnd,
          endTime: activeEnd,
          durationSeconds: activeSec,
        });

        // 3. Unplanned Downtime Segment
        const downEnd = new Date(activeEnd.getTime() + downtimeSec * 1000);
        const dtReasonCode = ['UNP-HYD-JAM', 'UNP-HEAT-FAULT', 'UNP-RESIN-STARVE'][rIdx % 3];
        const dtReasonId = ctx.downtimeReasonIds.get(dtReasonCode);
        timeSegments.push({
          machineId,
          category: 'UNPLANNED_DOWNTIME',
          startTime: activeEnd,
          endTime: downEnd,
          durationSeconds: downtimeSec,
          downtimeReasonId: dtReasonId,
        });

        // Correlated Andon Ticket
        ticketCounter++;
        const ticketNum = `ANDON-202610-${ticketCounter}`;
        const ticket = await prisma.andonTicket.create({
          data: {
            ticketNumber: ticketNum,
            machineId,
            category: dtReasonCode === 'UNP-RESIN-STARVE' ? 'MATERIAL' : 'MAINTENANCE',
            status: 'RESOLVED',
            reportedById: ctx.operatorUserId,
            assignedToId: ctx.supervisorUserId,
            reportTime: activeEnd,
            responseTime: new Date(activeEnd.getTime() + 5 * 60 * 1000), // 5m response
            resolutionTime: downEnd,
            confirmedRootCause: `Sensor detected condition for ${dtReasonCode}.`,
            correctiveAction: 'Cleared obstruction, reset alarm interlock, and verified cycle stability.',
          },
        });

        // Quality Check for run
        await prisma.qualityCheck.create({
          data: {
            runId: run.id,
            inspectorId: ctx.supervisorUserId,
            checkType: 'FIRST_PIECE',
            disposition: 'RELEASED',
            notes: 'First-piece dimensions within CPK > 1.33 tolerance band.',
            checkedAt: new Date(setupEnd.getTime() + 15 * 60 * 1000),
          },
        });

        // Telemetry Event Logs (Representative events)
        eventCounter++;
        eventLogs.push({
          eventId: `EVT-OCT-${eventCounter}-START`,
          machineId,
          eventType: 'RUN_STARTED',
          normalizedStatus: 'RUNNING',
          sourceTimestamp: setupEnd,
          cycleCounter: BigInt(totalShots),
          isSimulated: false,
        });

        eventCounter++;
        eventLogs.push({
          eventId: `EVT-OCT-${eventCounter}-CYCLE`,
          machineId,
          eventType: 'CYCLE_COMPLETED',
          normalizedStatus: 'RUNNING',
          sourceTimestamp: new Date(setupEnd.getTime() + Math.round(activeSec / 2) * 1000),
          cycleCounter: BigInt(totalShots),
          isSimulated: false,
        });

        eventCounter++;
        eventLogs.push({
          eventId: `EVT-OCT-${eventCounter}-FAULT`,
          machineId,
          eventType: 'FAULT_STARTED',
          normalizedStatus: 'FAULT',
          sourceTimestamp: activeEnd,
          faultCode: dtReasonCode,
          isSimulated: false,
        });

        eventCounter++;
        eventLogs.push({
          eventId: `EVT-OCT-${eventCounter}-CLEAR`,
          machineId,
          eventType: 'FAULT_CLEARED',
          normalizedStatus: 'IDLE',
          sourceTimestamp: downEnd,
          isSimulated: false,
        });
      }
    }
  }

  // Insert time segments
  for (let i = 0; i < timeSegments.length; i += chunkSize) {
    const chunk = timeSegments.slice(i, i + chunkSize);
    await prisma.machineTimeSegment.createMany({ data: chunk });
  }
  console.log(`✓ Seeded ${timeSegments.length} machine time segments.`);

  // Insert event logs
  for (let i = 0; i < eventLogs.length; i += chunkSize) {
    const chunk = eventLogs.slice(i, i + chunkSize);
    await prisma.machineEventLog.createMany({ data: chunk });
  }
  console.log(`✓ Seeded ${eventLogs.length} machine telemetry event logs.`);

  // 6. Pre-compute and Seed Daily OeeResult Records (Oct 1 to 31, 2026)
  // Benchmarks: Availability ~86.7%, Performance ~89.7%, Quality ~96.4%, OEE ~75.0%
  for (let d = 1; d <= 31; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const dateStr = `2026-10-${dayStr}`;
    const timestamp = new Date(`${dateStr}T23:59:00.000Z`);
    const dayOfWeek = timestamp.getUTCDay();

    for (const code of machineCodes) {
      const machineId = ctx.createdMachines.get(code)!;

      // Realistically vary each machine day
      let a = 0.867;
      let p = 0.897;
      let q = 0.964;

      if (dayOfWeek === 0) {
        // Sunday: No production
        continue;
      }

      // Small deterministic pseudo-random variance based on machine index and day
      const seedVal = ((code.charCodeAt(5) * 17) + d * 31) % 100;
      const varianceA = (seedVal - 50) / 2500; // ± 0.02
      const varianceP = ((100 - seedVal) - 50) / 2500; // ± 0.02
      const varianceQ = (seedVal % 20 - 10) / 1000; // ± 0.01

      a = Math.min(0.92, Math.max(0.82, a + varianceA));
      p = Math.min(0.93, Math.max(0.86, p + varianceP));
      q = Math.min(0.99, Math.max(0.95, q + varianceQ));
      const oee = a * p * q;

      oeeResults.push({
        machineId,
        calculationWindow: 'DAY',
        availability: a,
        performance: p,
        quality: q,
        oee,
        timestamp,
      });
    }
  }

  for (let i = 0; i < oeeResults.length; i += chunkSize) {
    const chunk = oeeResults.slice(i, i + chunkSize);
    await prisma.oeeResult.createMany({ data: chunk });
  }
  console.log(`✓ Seeded ${oeeResults.length} daily OEE benchmark results across 31 days.`);

  // 7. Update Live MachineCurrentState to active realistic status
  for (let i = 0; i < machineCodes.length; i++) {
    const code = machineCodes[i];
    const machineId = ctx.createdMachines.get(code)!;
    const isRunning = i < 7; // IMM-01 to IMM-07 RUNNING
    const isSetup = i === 7; // IMM-08 SETUP
    const isFault = i === 8; // IMM-09 FAULT
    const isIdle = i === 9; // IMM-10 IDLE

    const status = isRunning ? 'RUNNING' : isSetup ? 'SETUP' : isFault ? 'FAULT' : 'IDLE';
    const activeRunId = activeRunMap.get(code) ?? null;

    await prisma.machineCurrentState.upsert({
      where: { machineId },
      update: {
        normalizedStatus: status,
        rawStatus: status,
        lastEventTimestamp: new Date(),
        currentCycleTime: isRunning ? machineProfiles[code].cycle : null,
        activeRunId,
      },
      create: {
        machineId,
        normalizedStatus: status,
        rawStatus: status,
        lastEventTimestamp: new Date(),
        currentCycleTime: isRunning ? machineProfiles[code].cycle : null,
        activeRunId,
      },
    });
  }
  console.log(`✓ Synchronized 10 machine live states (7 RUNNING with active runs, 1 SETUP, 1 FAULT, 1 IDLE).`);

  // 8. Open active Andon ticket for IMM-09 (Heater fault ALM-TEMP-04)
  const imm09MachineId = ctx.createdMachines.get('IMM-09')!;
  ticketCounter++;
  await prisma.andonTicket.create({
    data: {
      ticketNumber: `ANDON-202610-${ticketCounter}`,
      machineId: imm09MachineId,
      category: 'MAINTENANCE',
      status: 'OPEN',
      reportedById: ctx.operatorUserId,
      reportTime: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
      confirmedRootCause: 'Zone 4 Thermocouple Open Circuit / Heater Band Trip (ALM-TEMP-04)',
    },
  });
  console.log(`✓ Seeded open active Andon ticket for IMM-09.`);
}
