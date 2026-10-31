import { IsNotEmpty, IsString } from 'class-validator';

export class ClientCredentialsDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
