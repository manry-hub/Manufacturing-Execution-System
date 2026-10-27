import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;
}
