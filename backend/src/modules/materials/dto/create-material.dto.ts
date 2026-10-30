import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: string; // BASE_RESIN, MASTERBATCH, ADDITIVE, REGRIND

  @IsNumber()
  @IsOptional()
  densityGcm3?: number;
}
