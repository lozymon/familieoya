import { IsInt, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @IsInt()
  @IsPositive()
  limitAmount!: number;
}
