import { Module } from '@nestjs/common';
import { PlantsService } from './services/plants.service.js';
import { PlantsController } from './plants.controller.js';
import { AreasService } from './services/areas.service.js';
import { AreasController } from './areas.controller.js';
import { MachinesService } from './services/machines.service.js';
import { MachinesController } from './machines.controller.js';
import { ProductsService } from './services/products.service.js';
import { ProductsController } from './products.controller.js';
import { MoldsService } from './services/molds.service.js';
import { MoldsController } from './molds.controller.js';

@Module({
  controllers: [
    PlantsController,
    AreasController,
    MachinesController,
    ProductsController,
    MoldsController,
  ],
  providers: [
    PlantsService,
    AreasService,
    MachinesService,
    ProductsService,
    MoldsService,
  ],
  exports: [
    PlantsService,
    AreasService,
    MachinesService,
    ProductsService,
    MoldsService,
  ],
})
export class MasterDataModule {}
