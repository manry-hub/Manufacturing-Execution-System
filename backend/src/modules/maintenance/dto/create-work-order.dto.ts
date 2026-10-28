import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaintenanceWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @IsString()
  @IsOptional()
  moldId?: string;

  @IsString()
  @IsOptional()
  machineId?: string;

  @IsString()
  @IsNotEmpty()
  workType!: string; // PREVENTIVE_SHOT, CORRECTIVE_BREAKDOWN, CHANGEOVER

  @IsString()
  @IsOptional()
  assignedTechId?: string;

  @IsInt()
  @IsOptional()
  triggerShots?: number;

  @IsString()
  @IsOptional()
  checklistPayload?: string;
}
