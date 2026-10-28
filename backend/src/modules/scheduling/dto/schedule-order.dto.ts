import { IsString, IsNotEmpty, IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class ScheduleOrderDto {
  @IsString()
  @IsNotEmpty()
  machineId: string;

  @IsString()
  @IsNotEmpty()
  moldId: string;

  @IsDateString()
  plannedStartTime: string;

  @IsOptional()
  @IsDateString()
  plannedEndTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number; // 1: Urgent/Rush, 2: High, 3: Normal, 4: Low

  @IsOptional()
  @IsString()
  schedulingNotes?: string;
}
