import { IsString, IsNotEmpty, IsUrl, IsBoolean, IsOptional } from 'class-validator';

export class WebhookConfigDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  targetUrl: string;

  @IsString()
  @IsNotEmpty()
  secretToken: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  events?: string;
}
