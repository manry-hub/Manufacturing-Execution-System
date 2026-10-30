import { IsInt, Min, Max, IsOptional, IsDateString, IsString } from 'class-validator';

export class UpdateInboundOrderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  targetQuantity?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  plannedStartTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number;

  @IsOptional()
  @IsString()
  suggestedMachineCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
