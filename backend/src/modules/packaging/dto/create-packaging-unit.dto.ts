import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackagingUnitDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsInt()
  @Min(1)
  partCount!: number;

  @IsString()
  @IsOptional()
  palletId?: string;

  @IsString()
  @IsOptional()
  barcode?: string;
}
