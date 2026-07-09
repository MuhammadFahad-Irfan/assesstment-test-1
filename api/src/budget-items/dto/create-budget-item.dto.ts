import {
  IsNumber,
  IsPositive,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateBudgetItemDto {
  @IsString()
  @MinLength(1)
  category: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;
}
