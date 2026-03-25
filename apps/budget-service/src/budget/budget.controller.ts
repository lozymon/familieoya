import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

function requireHouseholdId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-household-id header missing');
  return id;
}

@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  list(@Headers('x-household-id') householdId: string | undefined) {
    return this.budgetService.list(requireHouseholdId(householdId));
  }

  @Post()
  create(
    @Headers('x-household-id') householdId: string | undefined,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetService.create(requireHouseholdId(householdId), dto);
  }

  @Patch(':id')
  update(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetService.update(requireHouseholdId(householdId), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetService.remove(requireHouseholdId(householdId), id);
  }

  @Get('status')
  status(@Headers('x-household-id') householdId: string | undefined) {
    return this.budgetService.status(requireHouseholdId(householdId));
  }
}
