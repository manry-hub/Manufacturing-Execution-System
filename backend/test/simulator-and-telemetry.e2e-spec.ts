import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { SimulatorService } from '../src/modules/simulator/simulator.service.js';
import { TelemetryIngestionService } from '../src/modules/telemetry/telemetry.service.js';
import {
  SourceTypeEnum,
  EventTypeEnum,
  NormalizedStatusEnum,
} from '../src/modules/telemetry/dto/normalized-machine-event.dto.js';
import { randomUUID } from 'node:crypto';

describe('Simulator & Telemetry Engine (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let serverPort: number;
  let socketClient: Socket;
  let simulatorService: SimulatorService;
  let telemetryService: TelemetryIngestionService;

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

    simulatorService = moduleFixture.get<SimulatorService>(SimulatorService);
    telemetryService = moduleFixture.get<TelemetryIngestionService>(TelemetryIngestionService);

    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    serverPort = address.port;

    // Login as admin to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'AdminPassword123!',
      });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (socketClient?.connected) {
      socketClient.disconnect();
    }
    simulatorService.stop();
    await app.close();
  });

  describe('Telemetry Ingestion Pipeline (/api/v1/telemetry)', () => {
    const testEventId = randomUUID();

    it('POST /api/v1/telemetry/events should ingest and update machine current state', async () => {
      const payload = {
        eventId: testEventId,
        machineId: 'IMM-01',
        sourceId: 'E2E-TEST-NODE',
        sourceType: SourceTypeEnum.SIMULATOR,
        sourceTimestamp: new Date().toISOString(),
        eventType: EventTypeEnum.CYCLE_COMPLETED,
        rawStatus: 'INJECTION_DONE',
        normalizedStatus: NormalizedStatusEnum.RUNNING,
        metrics: {
          cycleCounter: 42,
          cycleTimeSeconds: 19.8,
          peakInjectionPressureBar: 142.5,
          cushionPositionMm: 12.1,
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/telemetry/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('PROCESSED');
      expect(res.body.eventId).toBe(testEventId);
      expect(res.body.machineCode).toBe('IMM-01');
      expect(res.body.normalizedStatus).toBe('RUNNING');
    });

    it('POST /api/v1/telemetry/events should enforce idempotency and drop duplicate eventId', async () => {
      const duplicatePayload = {
        eventId: testEventId, // Same event ID as previous test
        machineId: 'IMM-01',
        sourceId: 'E2E-TEST-NODE',
        sourceType: SourceTypeEnum.SIMULATOR,
        sourceTimestamp: new Date().toISOString(),
        eventType: EventTypeEnum.CYCLE_COMPLETED,
        normalizedStatus: NormalizedStatusEnum.RUNNING,
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/telemetry/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicatePayload)
        .expect(200);

      expect(res.body.status).toBe('DUPLICATE_DROPPED');
    });

    it('GET /api/v1/telemetry/machines/:id/latest should return real-time snapshot and event logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/telemetry/machines/IMM-01/latest')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('IMM-01');
      expect(res.body.currentState).toBeDefined();
      expect(res.body.currentState.normalizedStatus).toBe('RUNNING');
      expect(res.body.currentState.currentCycleTime).toBe(19.8);
      expect(Array.isArray(res.body.recentEvents)).toBe(true);
      expect(res.body.recentEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Simulator Control & Scenario Execution (/api/v1/simulator)', () => {
    it('GET /api/v1/simulator/status should list all 10 virtual machine nodes adhering to 8+1+1 allocation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/simulator/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.nodes).toHaveLength(10);
      expect(res.body.speedMultiplier).toBeDefined();

      const imm09 = res.body.nodes.find((n: any) => n.machineCode === 'IMM-09');
      const imm10 = res.body.nodes.find((n: any) => n.machineCode === 'IMM-10');

      expect(imm09).toBeDefined();
      expect(imm10).toBeDefined();
    });

    it('POST /api/v1/simulator/start and stop should control simulator state', async () => {
      const startRes = await request(app.getHttpServer())
        .post('/api/v1/simulator/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(startRes.body.status).toBe('STARTED');

      const stopRes = await request(app.getHttpServer())
        .post('/api/v1/simulator/stop')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(stopRes.body.status).toBe('STOPPED');
    });

    it('POST /api/v1/simulator/speed should adjust speed multiplier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/simulator/speed')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ speedMultiplier: 5 })
        .expect(200);

      expect(res.body.status).toBe('UPDATED');
      expect(res.body.speedMultiplier).toBe(5);
    });

    it('POST /api/v1/simulator/scenarios/trigger should activate slow-cycle on IMM-09', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/simulator/scenarios/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machineCode: 'IMM-09',
          scenario: 'SLOW_CYCLE',
          delayPercent: 50,
        })
        .expect(200);

      expect(res.body.machineCode).toBe('IMM-09');
      expect(res.body.isSlowCycleActive).toBe(true);

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/simulator/status')
        .set('Authorization', `Bearer ${adminToken}`);

      const imm09 = statusRes.body.nodes.find((n: any) => n.machineCode === 'IMM-09');
      expect(imm09.isSlowCycleActive).toBe(true);
    });

    it('POST /api/v1/simulator/scenarios/trigger should trip fault on IMM-10 and update projection', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/simulator/scenarios/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machineCode: 'IMM-10',
          scenario: 'FAULT',
          faultCode: 'UNP-HYD-JAM',
          description: 'Hydraulic pressure drop',
        })
        .expect(200);

      expect(res.body.machineCode).toBe('IMM-10');
      expect(res.body.isFaultActive).toBe(true);
      expect(res.body.normalizedStatus).toBe('FAULT');

      // Check DB projection reflects FAULT
      const snapshot = await request(app.getHttpServer())
        .get('/api/v1/telemetry/machines/IMM-10/latest')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(snapshot.body.currentState.normalizedStatus).toBe('FAULT');
    });

    it('POST /api/v1/simulator/scenarios/trigger should clear fault on IMM-10', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/simulator/scenarios/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machineCode: 'IMM-10',
          scenario: 'CLEAR_FAULT',
        })
        .expect(200);

      expect(res.body.isFaultActive).toBe(false);
      expect(res.body.normalizedStatus).toBe('RUNNING');
    });

    it('POST /api/v1/simulator/reset should restore all 10 virtual machines to baseline', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/simulator/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ seed: 100 })
        .expect(200);

      expect(res.body.status).toBe('RESET');

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/simulator/status')
        .set('Authorization', `Bearer ${adminToken}`);

      for (const node of statusRes.body.nodes) {
        expect(node.isFaultActive).toBe(false);
        expect(node.isSlowCycleActive).toBe(false);
      }
    });
  });

  describe('WebSocket Live Telemetry Broadcast (/ws/telemetry)', () => {
    it('should connect to WebSocket gateway and receive live telemetry broadcasts', async () => {
      const wsUrl = `http://localhost:${serverPort}/ws/telemetry`;

      socketClient = io(wsUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        socketClient.on('connect', () => resolve());
        socketClient.on('connect_error', (err) => reject(err));
      });

      expect(socketClient.connected).toBe(true);

      // Listen for broadcasted telemetry event
      const broadcastPromise = new Promise<any>((resolve) => {
        socketClient.on('telemetry:event', (data) => {
          resolve(data);
        });
      });

      // Ingest an event through service to trigger WebSocket emission
      const testEvent = {
        eventId: randomUUID(),
        machineId: 'IMM-02',
        sourceId: 'WS-TEST-NODE',
        sourceType: SourceTypeEnum.SIMULATOR,
        sourceTimestamp: new Date().toISOString(),
        eventType: EventTypeEnum.CYCLE_COMPLETED,
        rawStatus: 'INJECTION_DONE',
        normalizedStatus: NormalizedStatusEnum.RUNNING,
        metrics: {
          cycleCounter: 99,
          cycleTimeSeconds: 18.2,
        },
      };

      await telemetryService.ingestEvent(testEvent);

      const receivedData = await broadcastPromise;
      expect(receivedData).toBeDefined();
      expect(receivedData.eventId).toBe(testEvent.eventId);
      expect(receivedData.machineId).toBe('IMM-02');
      expect(receivedData.eventType).toBe(EventTypeEnum.CYCLE_COMPLETED);
    });
  });
});
