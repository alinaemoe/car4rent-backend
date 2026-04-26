import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, PayoutStatus } from '../entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  // Для админки (Refine)
  async findAll() {
    return this.transactionRepo.find({
      relations: ['rental', 'car', 'lessor'],
      order: { created_at: 'DESC' },
    });
  }

  // Для админки (отметить как выплачено)
  async updatePayoutStatus(id: number, status: PayoutStatus) {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) throw new NotFoundException('Transaction not found');

    transaction.payout_status = status;
    return await this.transactionRepo.save(transaction);
  }

  // Для мобильного Дашборда Партнера
  async getLessorStats(lessorId: string) {
    const transactions = await this.transactionRepo.find({
      where: { lessor: { id: lessorId } },
    });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalEarnedMonth = 0;
    let pendingPayout = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.created_at);
      // Считаем заработок за текущий месяц
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        totalEarnedMonth += Number(tx.lessor_income);
      }
      // Считаем общий долг сервиса перед партнером
      if (tx.payout_status === PayoutStatus.PENDING) {
        pendingPayout += Number(tx.lessor_income);
      }
    });

    return {
      total_earned_month: totalEarnedMonth,
      pending_payout: pendingPayout,
    };
  }

  // Для мобилы (история начислений)
  async getLessorHistory(lessorId: string) {
    return this.transactionRepo.find({
      where: { lessor: { id: lessorId } },
      relations: ['car', 'rental'],
      order: { created_at: 'DESC' },
    });
  }
}
