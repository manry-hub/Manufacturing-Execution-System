import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { RoleEnum } from '../src/common/enums/role.enum.js';

describe('Auth & Master Data API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let operatorToken: string;

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

    const jwtService = moduleFixture.get<JwtService>(JwtService);
    operatorToken = jwtService.sign({
      sub: 'operator-uuid',
      username: 'operator1',
      roles: [RoleEnum.MACHINE_OPERATOR],
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow (/api/v1/auth)', () => {
    it('POST /api/v1/auth/login should fail with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('POST /api/v1/auth/login should succeed with seeded admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.roles).toContain('System Administrator');

      adminToken = response.body.accessToken;
    });

    it('GET /api/v1/auth/me should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('GET /api/v1/auth/me should return current user profile with valid JWT Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.username).toBe('admin');
      expect(response.body.roles).toContain('System Administrator');
    });
  });

  describe('Master Data Endpoints & RBAC Enforcement', () => {
    it('GET /api/v1/plants should return plants including PLANT-01', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const plant01 = response.body.find((p: any) => p.code === 'PLANT-01');
      expect(plant01).toBeDefined();
      expect(plant01.name).toBe('Main Injection Molding Facility');
    });

    it('POST /api/v1/plants should reject Operator role with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/plants')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          code: 'PLANT-FORBIDDEN',
          name: 'Forbidden Operator Plant',
        })
        .expect(403);
    });

    it('POST /api/v1/plants should allow System Administrator role to create plant', async () => {
      const uniqueCode = `PLANT-TEST-${Date.now().toString().slice(-6)}`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: uniqueCode,
          name: 'Authorized Admin Plant',
          timezone: 'Asia/Jakarta',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.code).toBe(uniqueCode);
    });

    it('GET /api/v1/areas should return 4 seeded production areas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4);

      const codes = response.body.map((a: any) => a.code);
      expect(codes).toContain('INJ-PROD');
      expect(codes).toContain('FIN-INSP');
      expect(codes).toContain('MAT-PREP');
      expect(codes).toContain('Q-MAINT');
    });

    it('GET /api/v1/machines should return all 10 virtual injection molding machines (IMM-01 to IMM-10)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(10);

      // Verify IMM-01 through IMM-10 exist and have initial IDLE normalized status
      for (let i = 1; i <= 10; i++) {
        const expectedCode = `IMM-${String(i).padStart(2, '0')}`;
        const machine = response.body.find((m: any) => m.code === expectedCode);
        expect(machine).toBeDefined();
        expect(machine.isVirtual).toBe(true);
        expect(machine.currentState).toBeDefined();
        expect(['IDLE', 'RUNNING', 'FAULT', 'SETUP', 'STOPPED']).toContain(machine.currentState.normalizedStatus);
        expect(machine.area).toBeDefined();
        expect(machine.area.code).toBe('INJ-PROD');
      }
    });

    it('GET /api/v1/products should return catalog of products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const bumper = response.body.find((p: any) => p.partNumber === 'PRD-AUTO-BUMPER');
      expect(bumper).toBeDefined();
      expect(bumper.compatibilities).toBeDefined();
    });

    it('GET /api/v1/molds should return molds with numeric totalShots', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/molds')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const mold01 = response.body.find((m: any) => m.code === 'MOLD-BUMP-2C');
      expect(mold01).toBeDefined();
      expect(typeof mold01.totalShots).toBe('number');
      expect(mold01.cavityCount).toBe(2);
    });
  });
});
