import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TelemetryIngestionService } from '../src/modules/telemetry/telemetry.service.js';
import {
  EventTypeEnum,
  NormalizedStatusEnum,
  SourceTypeEnum,
} from '../src/modules/telemetry/dto/normalized-machine-event.dto.js';
import { randomUUID } from 'node:crypto';

describe('Production Execution, OEE & Digital Andon (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let telemetryService: TelemetryIngestionService;

  let createdOrderId: string;
  let createdRunId: string;
  let bumperProductId: string;
  let bumperMoldId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    // BigInt JSON serializer
    (BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
      return Number(this);
    };

    telemetryService = moduleFixture.get<TelemetryIngestionService>(TelemetryIngestionService);

    const prisma = moduleFixture.get<PrismaService>(PrismaService);
    await prisma.machineCurrentState.updateMany({
      data: { activeRunId: null },
    });

    await app.init();

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'password123',
      });
    adminToken = loginRes.body.accessToken;

    // Fetch seeded product and mold
    const productsRes = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`);
    const bumper = productsRes.body.find((p: any) => p.partNumber === 'PRD-AUTO-BUMPER');
    bumperProductId = bumper.id;

    const moldsRes = await request(app.getHttpServer())
      .get('/api/v1/molds')
      .set('Authorization', `Bearer ${adminToken}`);
    const mold = moldsRes.body.find((m: any) => m.code === 'MOLD-BUMP-2C');
    bumperMoldId = mold.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Production Orders & Runs Lifecycle', () => {
    it('POST /api/v1/production/orders should create a new production order in DRAFT status', async () => {
      const orderNumber = `PO-${Date.now().toString().slice(-6)}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/production/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderNumber,
          productId: bumperProductId,
          targetQuantity: 200,
          plannedStartTime: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.orderNumber).toBe(orderNumber);
      expect(res.body.status).toBe('DRAFT');
      createdOrderId = res.body.id;
    });

    it('PATCH /api/v1/production/orders/:id/release should release order to shop floor', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/production/orders/${createdOrderId}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('RELEASED');
    });

    it('POST /api/v1/production/runs/start should start run, bind to IMM-01, and advance order to IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/production/runs/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productionOrderId: createdOrderId,
          machineId: 'IMM-01',
          moldId: bumperMoldId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(['ACTIVE', 'SETUP']).toContain(res.body.status);
      expect(res.body.totalShots).toBe(0);
      createdRunId = res.body.id;

      // Verify machine current state reflects activeRunId
      const snapshot = await request(app.getHttpServer())
        .get('/api/v1/telemetry/machines/IMM-01/latest')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(snapshot.body.code).toBe('IMM-01');
    });

    it('Cycle completion should automatically accumulate shots and parts output on the active run', async () => {
      // Simulate 5 completed cycles on IMM-01
      for (let i = 1; i <= 5; i++) {
        await telemetryService.ingestEvent({
          eventId: randomUUID(),
          machineId: 'IMM-01',
          sourceId: 'E2E-TEST',
          sourceType: SourceTypeEnum.SIMULATOR,
          sourceTimestamp: new Date().toISOString(),
          eventType: EventTypeEnum.CYCLE_COMPLETED,
          normalizedStatus: NormalizedStatusEnum.RUNNING,
          metrics: {
            cycleCounter: i,
            cycleTimeSeconds: 20.0,
          },
        });
      }

      // Small pause to allow async background event handlers to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check run accumulated shots: 5 shots * 2 cavities = 10 parts
      const runRes = await request(app.getHttpServer())
        .get(`/api/v1/production/runs/${createdRunId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(runRes.body.totalShots).toBe(5);
      expect(runRes.body.goodQuantity).toBe(10);
    });

    it('POST /api/v1/production/runs/:id/scrap should record defect parts and adjust yield', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/production/runs/${createdRunId}/scrap`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectQuantity: 2,
          defectCode: 'DEF-SHORT-SHOT',
          notes: 'Insufficient cavity fill during initial stabilization',
        })
        .expect(200);

      expect(res.body.rejectQuantity).toBe(2);
      expect(res.body.goodQuantity).toBe(8); // 10 total - 2 rejects = 8 good
    });
  });

  describe('2. ISO 22400-2 OEE Calculations', () => {
    it('GET /api/v1/oee/runs/:runId should compute OEE metrics for the active run', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/oee/runs/${createdRunId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.availability).toBeGreaterThan(0);
      expect(res.body.metrics.performance).toBeGreaterThan(0);
      expect(res.body.metrics.quality).toBe(0.8); // 8 good / 10 total = 0.8
      expect(res.body.metrics.oee).toBeGreaterThan(0);
    });

    it('GET /api/v1/oee/machines/:id should compute rolling shift OEE for IMM-01', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/oee/machines/IMM-01?window=SHIFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.machineCode).toBe('IMM-01');
      expect(res.body.metrics.availability).toBeDefined();
      expect(res.body.metrics.performance).toBeDefined();
      expect(res.body.metrics.quality).toBeDefined();
      expect(res.body.metrics.oee).toBeDefined();
    });

    it('GET /api/v1/oee/plant should calculate weighted plant-wide OEE across all machines', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/oee/plant?window=SHIFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.machineCount).toBe(10);
      expect(res.body.metrics.availability).toBeDefined();
      expect(res.body.metrics.performance).toBeDefined();
      expect(res.body.metrics.quality).toBeDefined();
      expect(res.body.metrics.oee).toBeDefined();
    });
  });

  describe('3. Digital Andon Workflows & Downtime Pareto', () => {
    let triggeredTicketId: string;

    it('Automated fault event on IMM-10 should trigger an open Andon ticket', async () => {
      // Ingest fault alarm on IMM-10
      await telemetryService.ingestEvent({
        eventId: randomUUID(),
        machineId: 'IMM-10',
        sourceId: 'E2E-TEST',
        sourceType: SourceTypeEnum.SIMULATOR,
        sourceTimestamp: new Date().toISOString(),
        eventType: EventTypeEnum.FAULT_STARTED,
        normalizedStatus: NormalizedStatusEnum.FAULT,
        fault: {
          faultCode: 'UNP-HYD-JAM',
          faultSeverity: 'CRITICAL_STOP',
          faultDescription: 'Hydraulic clamping pressure drop',
        },
      });

      // Small async tick for RxJS subscriber to persist ticket
      await new Promise((r) => setTimeout(r, 150));

      // Verify ticket was auto-created
      const ticketsRes = await request(app.getHttpServer())
        .get('/api/v1/andon/tickets?status=OPEN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ticket = ticketsRes.body.find((t: any) => t.machine.code === 'IMM-10');
      expect(ticket).toBeDefined();
      expect(ticket.category).toBe('MAINTENANCE');
      expect(ticket.status).toBe('OPEN');
      triggeredTicketId = ticket.id;
    });

    it('POST /api/v1/andon/tickets/:id/acknowledge should transition ticket to ACKNOWLEDGED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/andon/tickets/${triggeredTicketId}/acknowledge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('ACKNOWLEDGED');
      expect(res.body.responseTime).toBeDefined();
      expect(res.body.assignedTo).toBeDefined();
    });

    it('POST /api/v1/andon/tickets/:id/resolve should resolve ticket with root cause and corrective action', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/andon/tickets/${triggeredTicketId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmedRootCause: 'Hydraulic manifold valve stuck due to particulate contamination',
          correctiveAction: 'Flushed valve assembly, replaced return line filter cartridge',
        })
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolutionTime).toBeDefined();
      expect(res.body.confirmedRootCause).toContain('Hydraulic manifold valve');
      expect(res.body.correctiveAction).toContain('Flushed valve assembly');
    });

    it('GET /api/v1/andon/analytics/mttr should return average response and resolution durations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/andon/analytics/mttr')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalTicketsEvaluated).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.averageResponseTimeMinutes).toBe('number');
      expect(typeof res.body.averageResolutionTimeMinutes).toBe('number');
    });

    it('GET /api/v1/andon/analytics/pareto should return ranked downtime Pareto analysis', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/andon/analytics/pareto')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.totalDowntimeSeconds).toBe('number');
    });
  });

  describe('4. Run Completion & Teardown', () => {
    it('POST /api/v1/production/runs/:id/complete should finish run and unbind from machine', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/production/runs/${createdRunId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.endTime).toBeDefined();

      // Verify machine current state unbinds activeRunId
      const snapshot = await request(app.getHttpServer())
        .get('/api/v1/telemetry/machines/IMM-01/latest')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(snapshot.body.code).toBe('IMM-01');
    });
  });
});
