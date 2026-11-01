import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncPlmRecipeDto {
  @IsString()
  @IsNotEmpty()
  recipeCode!: string;

  @IsString()
  @IsNotEmpty()
  productPartNumber!: string;

  @IsString()
  @IsNotEmpty()
  moldCode!: string;

  @IsString()
  @IsOptional()
  revision?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsNumber({}, { each: true })
  @Type(() => Number)
  barrelTempZones!: number[];

  @IsNumber()
  @Min(0.1)
  @Max(50.0)
  @Type(() => Number)
  @IsOptional()
  tempTolerance?: number;

  @IsNumber()
  @Min(1.0)
  @Max(3000.0)
  @Type(() => Number)
  injectionPressureBar!: number;

  @IsNumber()
  @Min(0.0)
  @Max(3000.0)
  @Type(() => Number)
  holdingPressureBar!: number;

  @IsNumber()
  @Min(0.1)
  @Max(300.0)
  @Type(() => Number)
  holdingTimeSec!: number;

  @IsNumber()
  @Min(0.1)
  @Max(600.0)
  @Type(() => Number)
  coolingTimeSec!: number;

  @IsNumber()
  @Min(0.1)
  @Max(100.0)
  @Type(() => Number)
  cushionLimitMm!: number;

  @IsNumber()
  @Min(0.05)
  @Max(10.0)
  @Type(() => Number)
  @IsOptional()
  cushionToleranceMm?: number;

  @IsNumber()
  @Min(10)
  @Max(5000)
  @Type(() => Number)
  clampingTonnage!: number;

  @IsString()
  @IsNotEmpty()
  resinGrade!: string;

  @IsString()
  @IsOptional()
  masterbatchGrade?: string;

  @IsNumber()
  @Min(0.0)
  @Max(100.0)
  @Type(() => Number)
  @IsOptional()
  masterbatchRatio?: number;

  @IsNumber()
  @Min(0.0)
  @Max(100.0)
  @Type(() => Number)
  @IsOptional()
  regrindAllowedPct?: number;

  @IsString()
  @IsOptional()
  cadInstructionUrl?: string;
}
