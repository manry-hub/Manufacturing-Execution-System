import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { SyncPlmRecipeDto } from '../dto/sync-plm-recipe.dto.js';

@Injectable()
export class PlmInboundService {
  private readonly logger = new Logger(PlmInboundService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Synchronize or update an injection molding recipe from PLM.
   */
  async syncRecipe(dto: SyncPlmRecipeDto) {
    this.logger.log(
      `Received PLM recipe sync for code: ${dto.recipeCode} (Product: ${dto.productPartNumber}, Mold: ${dto.moldCode})`,
    );

    // 1. Resolve Product
    const product = await this.prisma.product.findUnique({
      where: { partNumber: dto.productPartNumber },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with part number "${dto.productPartNumber}" not found in MES catalog`,
      );
    }

    // 2. Resolve Mold
    const mold = await this.prisma.mold.findUnique({
      where: { code: dto.moldCode },
    });
    if (!mold) {
      throw new NotFoundException(
        `Mold with code "${dto.moldCode}" not found in MES catalog`,
      );
    }

    // 3. Ensure Mold-Product compatibility exists
    const existingComp = await this.prisma.moldProductCompatibility.findUnique({
      where: {
        uq_mold_product: {
          moldId: mold.id,
          productId: product.id,
        },
      },
    });

    if (!existingComp) {
      this.logger.log(
        `Auto-registering mold-product compatibility between ${mold.code} and ${product.partNumber}`,
      );
      await this.prisma.moldProductCompatibility.create({
        data: {
          moldId: mold.id,
          productId: product.id,
          idealCycleTime: dto.coolingTimeSec + dto.holdingTimeSec + 5.0, // Baseline estimate
        },
      });
    }

    // 4. Validate physical parameter coherence
    if (dto.barrelTempZones.some((t) => t < 100 || t > 450)) {
      throw new BadRequestException(
        'Barrel temperature zones must be within physical plastics processing limits (100°C - 450°C)',
      );
    }

    const revision = dto.revision ?? 'REV-A';

    // 5. Upsert RecipeMaster
    const recipe = await this.prisma.recipeMaster.upsert({
      where: {
        recipeCode: dto.recipeCode,
      },
      update: {
        productId: product.id,
        moldId: mold.id,
        revision,
        status: 'APPROVED',
        barrelTempZones: JSON.stringify(dto.barrelTempZones),
        tempTolerance: dto.tempTolerance ?? 5.0,
        injectionPressureBar: dto.injectionPressureBar,
        holdingPressureBar: dto.holdingPressureBar,
        holdingTimeSec: dto.holdingTimeSec,
        coolingTimeSec: dto.coolingTimeSec,
        cushionLimitMm: dto.cushionLimitMm,
        cushionToleranceMm: dto.cushionToleranceMm ?? 0.5,
        clampingTonnage: dto.clampingTonnage,
        resinGrade: dto.resinGrade,
        masterbatchGrade: dto.masterbatchGrade ?? null,
        masterbatchRatio: dto.masterbatchRatio ?? 0.0,
        regrindAllowedPct: dto.regrindAllowedPct ?? 0.0,
        cadInstructionUrl: dto.cadInstructionUrl ?? null,
        plmApprovedAt: new Date(),
      },
      create: {
        recipeCode: dto.recipeCode,
        productId: product.id,
        moldId: mold.id,
        revision,
        status: 'APPROVED',
        barrelTempZones: JSON.stringify(dto.barrelTempZones),
        tempTolerance: dto.tempTolerance ?? 5.0,
        injectionPressureBar: dto.injectionPressureBar,
        holdingPressureBar: dto.holdingPressureBar,
        holdingTimeSec: dto.holdingTimeSec,
        coolingTimeSec: dto.coolingTimeSec,
        cushionLimitMm: dto.cushionLimitMm,
        cushionToleranceMm: dto.cushionToleranceMm ?? 0.5,
        clampingTonnage: dto.clampingTonnage,
        resinGrade: dto.resinGrade,
        masterbatchGrade: dto.masterbatchGrade ?? null,
        masterbatchRatio: dto.masterbatchRatio ?? 0.0,
        regrindAllowedPct: dto.regrindAllowedPct ?? 0.0,
        cadInstructionUrl: dto.cadInstructionUrl ?? null,
        plmApprovedAt: new Date(),
      },
      include: {
        product: { select: { partNumber: true, name: true } },
        mold: { select: { code: true, name: true, cavityCount: true } },
      },
    });

    this.logger.log(`Successfully synchronized PLM recipe: ${recipe.recipeCode}`);
    return {
      success: true,
      recipeId: recipe.id,
      recipeCode: recipe.recipeCode,
      revision: recipe.revision,
      product: recipe.product.partNumber,
      mold: recipe.mold.code,
      barrelTempZones: JSON.parse(recipe.barrelTempZones),
      injectionPressureBar: Number(recipe.injectionPressureBar),
      clampingTonnage: recipe.clampingTonnage,
      status: recipe.status,
      synchronizedAt: recipe.updatedAt,
    };
  }

  /**
   * Retrieve active recipe for a product and mold combination.
   */
  async getRecipe(productIdOrPartNumber: string, moldIdOrCode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productIdOrPartNumber }, { partNumber: productIdOrPartNumber }],
      },
    });
    if (!product) {
      throw new NotFoundException(`Product "${productIdOrPartNumber}" not found`);
    }

    const mold = await this.prisma.mold.findFirst({
      where: {
        OR: [{ id: moldIdOrCode }, { code: moldIdOrCode }],
      },
    });
    if (!mold) {
      throw new NotFoundException(`Mold "${moldIdOrCode}" not found`);
    }

    const recipe = await this.prisma.recipeMaster.findFirst({
      where: {
        productId: product.id,
        moldId: mold.id,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { partNumber: true, name: true } },
        mold: { select: { code: true, name: true, cavityCount: true } },
      },
    });

    if (!recipe) {
      throw new NotFoundException(
        `No approved PLM recipe found for Product "${product.partNumber}" with Mold "${mold.code}"`,
      );
    }

    return {
      ...recipe,
      barrelTempZones: JSON.parse(recipe.barrelTempZones),
      injectionPressureBar: Number(recipe.injectionPressureBar),
      holdingPressureBar: Number(recipe.holdingPressureBar),
      holdingTimeSec: Number(recipe.holdingTimeSec),
      coolingTimeSec: Number(recipe.coolingTimeSec),
      cushionLimitMm: Number(recipe.cushionLimitMm),
      tempTolerance: Number(recipe.tempTolerance),
      cushionToleranceMm: Number(recipe.cushionToleranceMm),
      masterbatchRatio: recipe.masterbatchRatio ? Number(recipe.masterbatchRatio) : 0,
      regrindAllowedPct: Number(recipe.regrindAllowedPct),
    };
  }

  /**
   * List all synchronized recipes with product and tooling relations.
   */
  async listRecipes() {
    const recipes = await this.prisma.recipeMaster.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        product: { select: { id: true, partNumber: true, name: true } },
        mold: { select: { id: true, code: true, name: true, cavityCount: true } },
      },
    });

    return recipes.map((recipe) => ({
      ...recipe,
      barrelTempZones: JSON.parse(recipe.barrelTempZones),
      injectionPressureBar: Number(recipe.injectionPressureBar),
      holdingPressureBar: Number(recipe.holdingPressureBar),
      holdingTimeSec: Number(recipe.holdingTimeSec),
      coolingTimeSec: Number(recipe.coolingTimeSec),
      cushionLimitMm: Number(recipe.cushionLimitMm),
      tempTolerance: Number(recipe.tempTolerance),
      cushionToleranceMm: Number(recipe.cushionToleranceMm),
      masterbatchRatio: recipe.masterbatchRatio ? Number(recipe.masterbatchRatio) : 0,
      regrindAllowedPct: Number(recipe.regrindAllowedPct),
    }));
  }
}
