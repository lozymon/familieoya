import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  categoryId!: string;

  @IsInt()
  @IsPositive()
  limitAmount!: number;
}
