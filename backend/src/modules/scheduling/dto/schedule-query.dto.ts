import { IsOptional, IsDateString, IsString } from 'class-validator';

export class ScheduleQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  areaId?: string;
}
