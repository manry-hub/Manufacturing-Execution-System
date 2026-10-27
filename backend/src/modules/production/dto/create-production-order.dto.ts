import { IsInt, IsISO8601, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  targetQuantity!: number;

  @IsISO8601()
  plannedStartTime!: string;
}
