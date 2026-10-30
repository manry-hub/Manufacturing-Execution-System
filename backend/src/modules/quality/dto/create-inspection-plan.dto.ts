import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InspectionPlanItemDto {
  @IsInt()
  @Min(1)
  sequence!: number;

  @IsString()
  @IsNotEmpty()
  parameterName!: string;

  @IsString()
  @IsNotEmpty()
  measurementType!: string; // VARIABLE, ATTRIBUTE

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsNumber()
  @IsOptional()
  upperTolerance?: number;

  @IsNumber()
  @IsOptional()
  lowerTolerance?: number;

  @IsString()
  @IsOptional()
  inspectionStage?: string; // FIRST_PIECE, PATROL, FINAL_AUDIT
}

export class CreateInspectionPlanDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @IsOptional()
  version?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionPlanItemDto)
  items!: InspectionPlanItemDto[];
}
