import { IsNotEmpty, IsString } from 'class-validator';

export class CheckPermissionDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  permission: string;

  @IsNotEmpty()
  @IsString()
  nodeId: string;
}
