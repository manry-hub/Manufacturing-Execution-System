import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QualitySampleDto {
  @IsString()
  @IsNotEmpty()
  planItemId!: string;

  @IsNumber()
  @IsOptional()
  measuredValue?: number;

  @IsBoolean()
  @IsOptional()
  isPassed?: boolean;
}

export class RecordQualityCheckDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsString()
  @IsNotEmpty()
  checkType!: string; // FIRST_PIECE, HOURLY_PATROL, CONTAINMENT

  @IsString()
  @IsOptional()
  disposition?: string; // PENDING, RELEASED, QUARANTINE, REWORK, SCRAP

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualitySampleDto)
  samples!: QualitySampleDto[];
}
