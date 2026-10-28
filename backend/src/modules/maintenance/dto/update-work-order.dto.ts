import { IsOptional, IsString } from 'class-validator';

export class UpdateMaintenanceWorkOrderDto {
  @IsString()
  @IsOptional()
  status?: string; // OPEN, IN_PROGRESS, COMPLETED, CANCELLED

  @IsString()
  @IsOptional()
  assignedTechId?: string;

  @IsString()
  @IsOptional()
  checklistPayload?: string;
}
