import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class PrintCartonLabelDto {
  @IsNotEmpty()
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  printerIp?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  printerPort?: number = 9100;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  copies: number = 1;
}

export class TestPrinterDto {
  @IsNotEmpty()
  @IsString()
  printerIp!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  printerPort?: number = 9100;
}

export interface NetworkPrinterInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
  model: string;
  location: string;
  isOnline?: boolean;
}
