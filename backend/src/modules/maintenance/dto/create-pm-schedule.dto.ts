import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreatePmScheduleDto {
  @IsString()
  @IsNotEmpty()
  moldId!: string;

  @IsString()
  @IsNotEmpty()
  pmLevel!: string; // LEVEL_1_CLEAN, LEVEL_2_INSPECT, LEVEL_3_OVERHAUL

  @IsInt()
  @Min(1)
  intervalShots!: number;
}
