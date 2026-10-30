import { Module } from '@nestjs/common';
import { OeeService } from './oee.service.js';
import { OeeController } from './oee.controller.js';

@Module({
  controllers: [OeeController],
  providers: [OeeService],
  exports: [OeeService],
})
export class OeeModule {}
