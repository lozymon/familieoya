import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  /** Amount in smallest currency unit (øre / cents). Must be a positive integer. */
  @IsInt()
  @Min(1)
  amount!: number;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** ISO 8601 date string (YYYY-MM-DD). */
  @IsDateString()
  date!: string;
}
