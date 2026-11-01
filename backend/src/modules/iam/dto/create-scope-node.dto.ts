import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches } from 'class-validator';

export enum ScopeNodeType {
  GLOBAL = 'GLOBAL',
  PLANT = 'PLANT',
  AREA = 'AREA',
  MACHINE = 'MACHINE',
}

export class CreateScopeNodeDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsNotEmpty()
  @IsEnum(ScopeNodeType)
  type: ScopeNodeType;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'Code must only contain lowercase alphanumeric characters, hyphens, and underscores',
  })
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  plantId?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsString()
  machineId?: string;
}
