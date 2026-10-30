import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PpssInboundService } from './services/ppss-inbound.service.js';
import { PpssWebhookService } from './services/ppss-webhook.service.js';
import { InboundProductionOrderDto } from './dto/inbound-production-order.dto.js';
import { UpdateInboundOrderDto } from './dto/update-inbound-order.dto.js';
import { WebhookConfigDto } from './dto/webhook-config.dto.js';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly inboundService: PpssInboundService,
    private readonly webhookService: PpssWebhookService,
  ) {}

  /**
   * Ingest a planned production order from external PPSS.
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async ingestOrder(@Body() dto: InboundProductionOrderDto) {
    return this.inboundService.ingestOrder(dto);
  }

  /**
   * Update an existing planned order by its external reference.
   */
  @Patch('orders/:externalRef')
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
  async cancelOrder(@Param('externalRef') externalRef: string) {
    return this.inboundService.cancelOrder(externalRef);
  }

  /**
   * Export MES plant physical capabilities (machines, clamping tonnage, molds, changeover matrix).
   */
  @Get('capabilities')
  async getPlantCapabilities() {
    return this.inboundService.getPlantCapabilities();
  }

  /**
   * Get current PPSS webhook configuration.
   */
  @Get('webhook-config')
  async getWebhookConfig() {
    return this.webhookService.getConfig();
  }

  /**
   * Update or setup PPSS webhook configuration.
   */
  @Post('webhook-config')
  async updateWebhookConfig(@Body() dto: WebhookConfigDto) {
    return this.webhookService.upsertConfig(dto);
  }

  /**
   * Sends a test ping webhook to verify connectivity with PPSS.
   */
  @Post('test-ping')
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
}
