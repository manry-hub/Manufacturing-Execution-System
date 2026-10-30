import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsDateString } from 'class-validator';

export class InboundProductionOrderDto {
  @IsString()
  @IsNotEmpty()
  externalOrderRef: string; // e.g. "PPSS-PO-2026-1088"

  @IsString()
  @IsNotEmpty()
  orderNumber: string; // e.g. "WO-2026-1088"

  @IsString()
  @IsNotEmpty()
  productPartNumber: string; // e.g. "PART-BUMP-001"

  @IsInt()
  @Min(1)
  targetQuantity: number;

  @IsDateString()
  dueDate: string; // Customer delivery deadline from PPSS

  @IsOptional()
  @IsDateString()
  plannedStartTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number; // 1: Urgent, 2: High, 3: Normal, 4: Low

  @IsOptional()
  @IsString()
  suggestedMachineCode?: string; // e.g. "IMM-07"

  @IsOptional()
  @IsString()
  notes?: string;
}
