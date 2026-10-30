import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class SignoffTravelerDto {
  @IsString()
  @IsNotEmpty()
  inspectorName!: string;

  @IsString()
  @IsIn(['RELEASED', 'QUARANTINED', 'CONCESSION'])
  status!: 'RELEASED' | 'QUARANTINED' | 'CONCESSION';

  @IsOptional()
  @IsString()
  notes?: string;
}
