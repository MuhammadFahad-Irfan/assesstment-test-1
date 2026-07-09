import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Optional name for the workspace created on registration.
  @IsOptional()
  @IsString()
  workspaceName?: string;
}
