import { IsOptional, IsString, IsBoolean, Matches } from 'class-validator';

export class UpdateScopeNodeDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'Code must only contain lowercase alphanumeric characters, hyphens, and underscores',
  })
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
