import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class UpsertChangeoverDto {
  @IsString()
  @IsNotEmpty()
  fromMoldId: string;

  @IsString()
  @IsNotEmpty()
  toMoldId: string;

  @IsInt()
  @Min(1)
  setupMinutes: number;

  @IsInt()
  @Min(0)
  purgeMinutes: number;
}
