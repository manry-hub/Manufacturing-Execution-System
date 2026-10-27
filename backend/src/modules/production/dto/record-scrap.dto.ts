import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RecordScrapDto {
  @IsInt()
  @Min(1)
  rejectQuantity!: number;

  @IsString()
  @IsNotEmpty()
  defectCode!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
