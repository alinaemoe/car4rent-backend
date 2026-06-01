import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { Car, CarStatus } from '../entities/car.entity';
import { Rental, RentalStatus } from '../entities/rental.entity';
import { Transaction, PayoutStatus } from '../entities/transaction.entity';
import { CarDamage } from '../entities/car-damage.entity';
import { RentalLead, LeadStatus } from '../entities/rental-lead.entity';
import { PartnershipRequest, RequestStatus } from '../entities/partnership-request.entity';
import { UserDocument, DocStatus } from '../entities/user-document.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Car) private readonly carsRepo: Repository<Car>,
    @InjectRepository(Rental) private readonly rentalsRepo: Repository<Rental>,
    @InjectRepository(Transaction) private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(CarDamage) private readonly carDamagesRepo: Repository<CarDamage>,
    @InjectRepository(RentalLead) private readonly rentalLeadsRepo: Repository<RentalLead>,
    @InjectRepository(PartnershipRequest)
    private readonly partnershipRequestsRepo: Repository<PartnershipRequest>,
    @InjectRepository(UserDocument) private readonly userDocumentsRepo: Repository<UserDocument>,
  ) {}

  async getDashboard() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfWeek = new Date(now);
    firstOfWeek.setDate(now.getDate() - now.getDay());
    firstOfWeek.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      totalUsers,
      thisMonthUsers,
      thisWeekUsers,
      totalCars,
      availableCars,
      rentedCars,
      maintenanceCars,
      totalRentals,
      thisMonthRentals,
      totalRevenue,
      thisMonthRevenue,
      pendingPayouts,
      pendingDocs,
      newLeads,
      newPartnerRequests,
      overdueRentals,
      unpaidDamages,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { created_at: MoreThanOrEqual(firstOfMonth) } }),
      this.usersRepo.count({ where: { created_at: MoreThanOrEqual(firstOfWeek) } }),
      this.carsRepo.count(),
      this.carsRepo.count({ where: { status: CarStatus.AVAILABLE } }),
      this.carsRepo.count({ where: { status: CarStatus.RENTED } }),
      this.carsRepo.count({ where: { status: CarStatus.MAINTENANCE } }),
      this.rentalsRepo.count(),
      this.rentalsRepo.count({ where: { created_at: MoreThanOrEqual(firstOfMonth) } }),
      this.getSum('total_amount'),
      this.getSumSince('total_amount', firstOfMonth),
      this.getPendingPayoutsSum(),
      this.userDocumentsRepo.count({ where: { status: DocStatus.PENDING } }),
      this.rentalLeadsRepo.count({ where: { status: LeadStatus.NEW } }),
      this.partnershipRequestsRepo.count({ where: { status: RequestStatus.NEW } }),
      this.rentalsRepo.count({ where: { status: RentalStatus.OVERDUE } }),
      this.carDamagesRepo.count({ where: { is_paid: false } }),
    ]);

    const [topBrands, rentalByStatus, avgDurationResult, monthlyStatsRows, userRegistrations] =
      await Promise.all([
        this.carsRepo
          .createQueryBuilder('car')
          .select('car.brand', 'brand')
          .addSelect('COUNT(car.id)', 'count')
          .groupBy('car.brand')
          .orderBy('COUNT(car.id)', 'DESC')
          .limit(5)
          .getRawMany(),
        this.rentalsRepo
          .createQueryBuilder('r')
          .select('r.status', 'status')
          .addSelect('COUNT(r.id)', 'count')
          .groupBy('r.status')
          .getRawMany(),
        this.rentalsRepo
          .createQueryBuilder('r')
          .select("AVG(DATE_PART('day', r.end_date - r.start_date))", 'avg')
          .where('r.status = :status', { status: 'COMPLETED' })
          .getRawOne(),
        this.transactionsRepo
          .createQueryBuilder('tx')
          .select("TO_CHAR(tx.created_at, 'YYYY-MM')", 'month')
          .addSelect('SUM(tx.total_amount)', 'revenue')
          .addSelect('SUM(tx.system_fee)', 'fees')
          .addSelect('SUM(tx.lessor_income)', 'payouts')
          .addSelect('COUNT(tx.id)', 'count')
          .addSelect('SUM(tx.penalty_amount)', 'penalties')
          .where('tx.created_at >= :sixMonthsAgo', { sixMonthsAgo })
          .groupBy("TO_CHAR(tx.created_at, 'YYYY-MM')")
          .orderBy('"month"', 'ASC')
          .getRawMany(),
        this.usersRepo
          .createQueryBuilder('u')
          .select("TO_CHAR(u.created_at, 'YYYY-MM')", 'month')
          .addSelect('COUNT(u.id)', 'count')
          .where('u.created_at >= :twelveMonthsAgo', { twelveMonthsAgo })
          .groupBy("TO_CHAR(u.created_at, 'YYYY-MM')")
          .orderBy('"month"', 'ASC')
          .getRawMany(),
      ]);

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(RentalStatus)) byStatus[s] = 0;
    for (const row of rentalByStatus) byStatus[row.status] = parseInt(row.count) || 0;

    const monthlyBuckets: Record<string, any> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyBuckets[key] = { revenue: 0, fees: 0, payouts: 0, count: 0, penalties: 0 };
    }
    for (const row of monthlyStatsRows) {
      if (monthlyBuckets[row.month]) {
        monthlyBuckets[row.month] = {
          revenue: parseFloat(row.revenue) || 0,
          fees: parseFloat(row.fees) || 0,
          payouts: parseFloat(row.payouts) || 0,
          count: parseInt(row.count) || 0,
          penalties: parseFloat(row.penalties) || 0,
        };
      }
    }
    const monthlyStats = Object.entries(monthlyBuckets).map(([month, data]) => ({
      month,
      ...data,
    }));

    const userRegBuckets: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      userRegBuckets[key] = 0;
    }
    for (const row of userRegistrations) {
      if (userRegBuckets[row.month] !== undefined)
        userRegBuckets[row.month] = parseInt(row.count) || 0;
    }
    const userRegistrationsByMonth = Object.entries(userRegBuckets).map(([month, count]) => ({
      month,
      count,
    }));

    return {
      users: {
        total: totalUsers,
        thisMonth: thisMonthUsers,
        thisWeek: thisWeekUsers,
        registrationsByMonth: userRegistrationsByMonth,
      },
      cars: {
        total: totalCars,
        available: availableCars,
        rented: rentedCars,
        maintenance: maintenanceCars,
        topBrands: topBrands.map((b: any) => ({
          brand: b.brand,
          count: parseInt(b.count) || 0,
        })),
      },
      rentals: {
        total: totalRentals,
        thisMonth: thisMonthRentals,
        byStatus,
        avgDuration: avgDurationResult?.avg
          ? Math.round(parseFloat(avgDurationResult.avg) * 10) / 10
          : null,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        pendingPayouts,
        monthlyStats,
      },
      alerts: {
        pendingDocuments: pendingDocs,
        newLeads,
        newPartnershipRequests: newPartnerRequests,
        overdueRentals,
        unpaidDamages,
      },
    };
  }

  private async getSum(column: string): Promise<number> {
    const result = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select(`SUM(tx.${column})`, 'total')
      .getRawOne();
    return parseFloat(result?.total) || 0;
  }

  private async getSumSince(column: string, since: Date): Promise<number> {
    const result = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select(`SUM(tx.${column})`, 'total')
      .where('tx.created_at >= :since', { since })
      .getRawOne();
    return parseFloat(result?.total) || 0;
  }

  private async getPendingPayoutsSum(): Promise<number> {
    const result = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.lessor_income)', 'total')
      .where('tx.payout_status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();
    return parseFloat(result?.total) || 0;
  }
}
