import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

  async getLessorStats(
    lessorId: string,
    monthParam?: string,
    yearParam?: string,
  ) {
    // В JS месяцы начинаются с 0, поэтому вычитаем 1 из переданного параметра
    const targetMonth = monthParam
      ? parseInt(monthParam, 10) - 1
      : new Date().getMonth();
    const targetYear = yearParam
      ? parseInt(yearParam, 10)
      : new Date().getFullYear();

    const transactions = await this.transactionRepo.find({
      where: { lessor: { id: lessorId } },
    });

    let totalEarnedMonth = 0;
    let pendingPayout = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.created_at);

      // Считаем заработок ТОЛЬКО за выбранный месяц
      if (
        txDate.getMonth() === targetMonth &&
        txDate.getFullYear() === targetYear
      ) {
        totalEarnedMonth += Number(tx.lessor_income);
      }

      // Долг считаем за все время (или можно тоже ограничить, зависит от бизнеса)
      if (tx.payout_status === PayoutStatus.PENDING) {
        pendingPayout += Number(tx.lessor_income);
      }
    });

    return {
      total_earned_month: totalEarnedMonth,
      pending_payout: pendingPayout,
    };
  }

  // 👇 ОБНОВЛЕННЫЙ: История транзакций (Используем SQL фильтрацию Between для скорости)
  async getLessorHistory(
    lessorId: string,
    monthParam?: string,
    yearParam?: string,
  ) {
    const targetMonth = monthParam
      ? parseInt(monthParam, 10) - 1
      : new Date().getMonth();
    const targetYear = yearParam
      ? parseInt(yearParam, 10)
      : new Date().getFullYear();

    // Создаем границы: от первого дня месяца до последнего
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    return this.transactionRepo.find({
      where: {
        lessor: { id: lessorId },
        created_at: Between(startDate, endDate), // 👈 Ищем строго в рамках месяца
      },
      relations: ['car', 'rental'],
      order: { created_at: 'DESC' },
    });
  }
}
