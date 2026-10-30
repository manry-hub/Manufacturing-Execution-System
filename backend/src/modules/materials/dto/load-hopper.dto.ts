import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class LoadHopperDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsString()
  @IsNotEmpty()
  materialLotId!: string;

  @IsNumber()
  @Min(0.01)
  quantityKg!: number;
}
