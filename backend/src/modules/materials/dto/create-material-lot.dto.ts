import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaterialLotDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsString()
  @IsNotEmpty()
  lotNumber!: string;

  @IsString()
  @IsOptional()
  supplierLot?: string;

  @IsNumber()
  @Min(0.01)
  initialQtyKg!: number;

  @IsISO8601()
  @IsOptional()
  expirationDate?: string;
}
