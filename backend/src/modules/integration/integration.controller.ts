import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PpssInboundService } from './services/ppss-inbound.service.js';
import { PpssWebhookService } from './services/ppss-webhook.service.js';
import { PlmInboundService } from './services/plm-inbound.service.js';
import { QmsInboundService } from './services/qms-inbound.service.js';
import { InboundProductionOrderDto } from './dto/inbound-production-order.dto.js';
import { UpdateInboundOrderDto } from './dto/update-inbound-order.dto.js';
import { WebhookConfigDto } from './dto/webhook-config.dto.js';
import { SyncPlmRecipeDto } from './dto/sync-plm-recipe.dto.js';
import { QmsQcReleaseDto } from './dto/qms-qc-release.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { ScopeGuard } from '../../common/guards/scope.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';

@Controller('integration')
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class IntegrationController {
  constructor(
    private readonly inboundService: PpssInboundService,
    private readonly webhookService: PpssWebhookService,
    private readonly plmService: PlmInboundService,
    private readonly qmsService: QmsInboundService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Ingest a planned production order from external PPSS.
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('integration.ppss.order.write')
  async ingestOrder(@Body() dto: InboundProductionOrderDto) {
    return this.inboundService.ingestOrder(dto);
  }

  /**
   * Update an existing planned order by its external reference.
   */
  @Patch('orders/:externalRef')
  @RequirePermissions('integration.ppss.order.write')
  async updateOrder(
    @Param('externalRef') externalRef: string,
    @Body() dto: UpdateInboundOrderDto,
  ) {
    return this.inboundService.updateOrder(externalRef, dto);
  }

  /**
   * Cancel an order requested by PPSS.
   */
  @Delete('orders/:externalRef')
  @RequirePermissions('integration.ppss.order.write')
  async cancelOrder(@Param('externalRef') externalRef: string) {
    return this.inboundService.cancelOrder(externalRef);
  }

  /**
   * Export MES plant physical capabilities (machines, clamping tonnage, molds, changeover matrix).
   */
  @Get('capabilities')
  @RequirePermissions('integration.ppss.order.read')
  async getPlantCapabilities() {
    return this.inboundService.getPlantCapabilities();
  }

  /**
   * Get current PPSS webhook configuration.
   */
  @Get('webhook-config')
  @RequirePermissions('integration.webhook.configure')
  async getWebhookConfig() {
    return this.webhookService.getConfig();
  }

  /**
   * Update or setup PPSS webhook configuration.
   */
  @Post('webhook-config')
  @RequirePermissions('integration.webhook.configure')
  async updateWebhookConfig(@Body() dto: WebhookConfigDto) {
    return this.webhookService.upsertConfig(dto);
  }

  /**
   * Sends a test ping webhook to verify connectivity with PPSS.
   */
  @Post('test-ping')
  @RequirePermissions('integration.webhook.configure')
  async testPing() {
    const success = await this.webhookService.dispatchWebhook('system.ping', {
      source: 'MES',
      status: 'ONLINE',
      message: 'Ping from MES Integration Gateway',
      timestamp: new Date().toISOString(),
    });
    return {
      success,
      message: success
        ? 'Test ping webhook delivered successfully to PPSS'
        : 'Failed to deliver ping webhook to PPSS (check targetUrl or server availability)',
    };
  }

  // ---------------------------------------------------------------------------
  // PLM (Product Lifecycle Management) Recipe Integration
  // ---------------------------------------------------------------------------

  /**
   * List all synchronized PLM recipes.
   */
  @Get('plm/recipes')
  @RequirePermissions('integration.plm.recipe.read')
  async listPlmRecipes() {
    return this.plmService.listRecipes();
  }

  /**
   * Synchronize or update an injection molding recipe from PLM.
   */
  @Put('plm/recipes')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('integration.plm.recipe.write')
  async syncPlmRecipe(@Body() dto: SyncPlmRecipeDto) {
    return this.plmService.syncRecipe(dto);
  }

  /**
   * Retrieve active recipe for a product and mold combination.
   */
  @Get('plm/recipes/:productId/:moldId')
  @RequirePermissions('integration.plm.recipe.read')
  async getPlmRecipe(
    @Param('productId') productId: string,
    @Param('moldId') moldId: string,
  ) {
    return this.plmService.getRecipe(productId, moldId);
  }

  // ---------------------------------------------------------------------------
  // QMS (Quality Management System) First-Piece Release Integration
  // ---------------------------------------------------------------------------

  /**
   * Process First-Piece QC inspection disposition from external QMS.
   */
  @Post('qms/qc-release')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('integration.qms.qc.write')
  async processQmsQcRelease(@Body() dto: QmsQcReleaseDto) {
    return this.qmsService.processQcRelease(dto);
  }

  // ---------------------------------------------------------------------------
  // M2M Service Accounts & System Health
  // ---------------------------------------------------------------------------

  /**
   * List registered M2M service accounts and connection status.
   */
  @Get('service-accounts')
  @RequirePermissions('masterdata.read')
  async listServiceAccounts() {
    const accounts = await this.prisma.serviceAccount.findMany({
      select: {
        id: true,
        name: true,
        clientId: true,
        scopeType: true,
        scopeId: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return accounts.map((sa) => ({
      ...sa,
      permissions: sa.permissions ? JSON.parse(sa.permissions) : [],
    }));
  }
}
