import { IsDateString, IsString, Length, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  // ISO date string, e.g. "2025-09-01" or full ISO timestamp.
  @IsDateString()
  date: string;

  // ISO 4217 currency code, e.g. "USD".
  @IsString()
  @Length(3, 3)
  currency: string;
}
