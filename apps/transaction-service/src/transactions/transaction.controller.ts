import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';

function requireHouseholdId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-household-id header missing');
  return id;
}

function requireUserId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-user-id header missing');
  return id;
}

@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Get()
  list(
    @Headers('x-household-id') householdId: string | undefined,
    @Query('month') month?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: string,
  ) {
    return this.service.listTransactions(requireHouseholdId(householdId), {
      month,
      categoryId,
      type,
    });
  }

  @Get('summary')
  getSummary(
    @Headers('x-household-id') householdId: string | undefined,
    @Query('month') month: string,
  ) {
    return this.service.getSummary(requireHouseholdId(householdId), month);
  }

  @Get(':id')
  getOne(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getTransaction(requireHouseholdId(householdId), id);
  }

  @Post()
  create(
    @Headers('x-household-id') householdId: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.service.createTransaction(
      requireHouseholdId(householdId),
      requireUserId(userId),
      dto,
    );
  }

  @Patch(':id')
  update(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.updateTransaction(
      requireHouseholdId(householdId),
      id,
      dto,
    );
  }

  @Delete('bulk')
  @HttpCode(204)
  bulkDelete(
    @Headers('x-household-id') householdId: string | undefined,
    @Body() dto: BulkDeleteDto,
  ) {
    return this.service.bulkDelete(requireHouseholdId(householdId), dto.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.deleteTransaction(requireHouseholdId(householdId), id);
  }
}
