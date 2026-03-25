import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
  // currency is intentionally absent — immutable after creation
}
