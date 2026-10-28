import { IsString, IsOptional, IsDateString } from 'class-validator';

export class RescheduleSlotDto {
  @IsOptional()
  @IsString()
  machineId?: string;

  @IsOptional()
  @IsString()
  moldId?: string;

  @IsDateString()
  plannedStartTime: string;

  @IsOptional()
  @IsDateString()
  plannedEndTime?: string;
}
