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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
