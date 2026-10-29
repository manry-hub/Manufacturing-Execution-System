import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartProductionRunDto {
  @IsString()
  @IsNotEmpty()
  productionOrderId!: string;

  @IsString()
  @IsNotEmpty()
  machineId!: string;

  @IsString()
  @IsNotEmpty()
  moldId!: string;

  @IsOptional()
  @IsString()
  status?: string;
}
