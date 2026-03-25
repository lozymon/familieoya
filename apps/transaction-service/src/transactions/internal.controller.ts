import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from '@familieoya/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Controller('internal')
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  /** GDPR data export — all transactions created by this user. */
  @Get('users/:userId/export')
  async exportForUser(@Param('userId') userId: string) {
    return this.transactions.find({
      where: { userId },
      relations: ['category'],
      order: { date: 'DESC' },
    });
  }
}
