import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Name for the workspace created on registration. Required.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  workspaceName: string;
}
