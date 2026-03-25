import { IsString, Length, Matches } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  /** ISO 4217 currency code (e.g. NOK, BRL, USD). */
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO 4217 code',
  })
  currency!: string;
}
