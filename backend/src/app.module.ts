import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { TelemetryModule } from './modules/telemetry/telemetry.module.js';
import { SimulatorModule } from './modules/simulator/simulator.module.js';
import { ProductionModule } from './modules/production/production.module.js';
import { OeeModule } from './modules/oee/oee.module.js';
import { AndonModule } from './modules/andon/andon.module.js';
import { MaterialsModule } from './modules/materials/materials.module.js';
import { QualityModule } from './modules/quality/quality.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { PackagingModule } from './modules/packaging/packaging.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { TravelerModule } from './modules/traveler/traveler.module.js';
import { IotGatewayModule } from './modules/iot-gateway/iot-gateway.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    MasterDataModule,
    TelemetryModule,
    SimulatorModule,
    ProductionModule,
    OeeModule,
    AndonModule,
    MaterialsModule,
    QualityModule,
    MaintenanceModule,
    PackagingModule,
    SchedulingModule,
    TravelerModule,
    IotGatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
