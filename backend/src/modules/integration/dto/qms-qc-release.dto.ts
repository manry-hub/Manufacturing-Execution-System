import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QmsSampleEvaluationDto {
  @IsString()
  @IsNotEmpty()
  characteristicName!: string;

  @IsNumber()
  @Type(() => Number)
  measuredValue!: number;

  @IsBoolean()
  isPassed!: boolean;
}

export class QmsQcReleaseDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsString()
  @IsIn(['RELEASED', 'REJECTED'])
  disposition!: 'RELEASED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  inspectorBadge!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  digitalSignature?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QmsSampleEvaluationDto)
  samples?: QmsSampleEvaluationDto[];
}
