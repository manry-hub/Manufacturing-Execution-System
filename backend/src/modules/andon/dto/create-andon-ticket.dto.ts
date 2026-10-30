import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAndonTicketDto {
  @IsString()
  @IsNotEmpty()
  machineId!: string;

  @IsString()
  @IsIn(['MAINTENANCE', 'QUALITY', 'MATERIAL', 'SAFETY'])
  category!: 'MAINTENANCE' | 'QUALITY' | 'MATERIAL' | 'SAFETY';

  @IsOptional()
  @IsString()
  faultCode?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveAndonTicketDto {
  @IsString()
  @IsNotEmpty()
  confirmedRootCause!: string;

  @IsString()
  @IsNotEmpty()
  correctiveAction!: string;
}
