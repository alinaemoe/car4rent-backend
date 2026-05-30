import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, PayoutStatus, TransactionType } from '../entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findAll() {
    return this.transactionRepo.find({
      relations: ['rental', 'car', 'lessor'],
      order: { created_at: 'DESC' },
    });
  }

  async findAllForAdmin(params: {
    _start?: number;
    _end?: number;
    _sort?: string;
    _order?: 'ASC' | 'DESC';
    payout_status?: PayoutStatus;
    type?: TransactionType;
    from_date?: string;
    to_date?: string;
  }) {
    const { _start = 0, _end = 10, _sort = 'created_at', _order = 'DESC', payout_status, type, from_date, to_date } = params;
    const take = _end - _start;
    const allowedSortFields = ['id', 'total_amount', 'system_fee', 'lessor_income', 'payout_status', 'type', 'created_at'];
    const sortField = allowedSortFields.includes(_sort) ? _sort : 'created_at';

    const where: any = {};

    if (payout_status) {
      where.payout_status = payout_status;
    }

    if (type) {
      where.type = type;
    }

    if (from_date && to_date) {
      where.created_at = Between(new Date(from_date), new Date(to_date));
    } else if (from_date) {
      where.created_at = Between(new Date(from_date), new Date('2100-01-01'));
    } else if (to_date) {
      where.created_at = Between(new Date('2020-01-01'), new Date(to_date));
    }

    const [data, total] = await this.transactionRepo.findAndCount({
      relations: ['rental', 'car', 'lessor'],
      where,
      skip: _start,
      take,
      order: { [sortField]: _order },
    });

    return { data, total };
  }

  async getStats() {
    const all = await this.transactionRepo.find();

    let totalRevenue = 0;
    let totalSystemFees = 0;
    let totalLessorIncome = 0;
    let pendingPayouts = 0;

    all.forEach((tx) => {
      totalRevenue += Number(tx.total_amount);
      totalSystemFees += Number(tx.system_fee);
      totalLessorIncome += Number(tx.lessor_income);
      if (tx.payout_status === PayoutStatus.PENDING) {
        pendingPayouts += Number(tx.lessor_income);
      }
    });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const recentTransactions = all.filter((tx) => new Date(tx.created_at) >= sixMonthsAgo);

    const monthlyBuckets: Record<string, { revenue: number; fees: number; payouts: number; count: number }> = {};

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyBuckets[key] = { revenue: 0, fees: 0, payouts: 0, count: 0 };
    }

    recentTransactions.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyBuckets[key]) {
        monthlyBuckets[key].revenue += Number(tx.total_amount);
        monthlyBuckets[key].fees += Number(tx.system_fee);
        monthlyBuckets[key].payouts += Number(tx.lessor_income);
        monthlyBuckets[key].count += 1;
      }
    });

    const monthlyStats = Object.entries(monthlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const payoutStatusCounts = {
      [PayoutStatus.NOT_APPLICABLE]: all.filter((tx) => tx.payout_status === PayoutStatus.NOT_APPLICABLE).length,
      [PayoutStatus.PENDING]: all.filter((tx) => tx.payout_status === PayoutStatus.PENDING).length,
      [PayoutStatus.PAID]: all.filter((tx) => tx.payout_status === PayoutStatus.PAID).length,
    };

    const typeCounts = {
      [TransactionType.RENTAL_PAYMENT]: all.filter((tx) => tx.type === TransactionType.RENTAL_PAYMENT).length,
      [TransactionType.PENALTY]: all.filter((tx) => tx.type === TransactionType.PENALTY).length,
      [TransactionType.DAMAGE_COMPENSATION]: all.filter((tx) => tx.type === TransactionType.DAMAGE_COMPENSATION).length,
    };

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSystemFees: Math.round(totalSystemFees * 100) / 100,
      totalLessorIncome: Math.round(totalLessorIncome * 100) / 100,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      transactionCount: all.length,
      monthlyStats,
      payoutStatusCounts,
      typeCounts,
    };
  }

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

      if (
        txDate.getMonth() === targetMonth &&
        txDate.getFullYear() === targetYear
      ) {
        totalEarnedMonth += Number(tx.lessor_income);
      }

      if (tx.payout_status === PayoutStatus.PENDING) {
        pendingPayout += Number(tx.lessor_income);
      }
    });

    return {
      total_earned_month: totalEarnedMonth,
      pending_payout: pendingPayout,
    };
  }

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

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    return this.transactionRepo.find({
      where: {
        lessor: { id: lessorId },
        created_at: Between(startDate, endDate),
      },
      relations: ['car', 'rental'],
      order: { created_at: 'DESC' },
    });
  }
}
