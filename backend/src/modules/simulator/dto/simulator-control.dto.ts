import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetSimulatorSpeedDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  speedMultiplier!: number;
}

export class ResetSimulatorDto {
  @IsOptional()
  @IsInt()
  seed?: number;
}

export class TriggerScenarioDto {
  @IsString()
  @IsNotEmpty()
  machineCode!: string;

  @IsString()
  @IsIn(['SLOW_CYCLE', 'CLEAR_SLOW_CYCLE', 'FAULT', 'CLEAR_FAULT', 'DISCONNECT', 'RECONNECT'])
  scenario!: 'SLOW_CYCLE' | 'CLEAR_SLOW_CYCLE' | 'FAULT' | 'CLEAR_FAULT' | 'DISCONNECT' | 'RECONNECT';

  @IsOptional()
  @IsString()
  faultCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  delayPercent?: number;
}
