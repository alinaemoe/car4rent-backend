import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Rental, RentalStatus } from '../entities/rental.entity';

@Injectable()
export class RentalCronService {
  private readonly logger = new Logger(RentalCronService.name);

  constructor(
    @InjectRepository(Rental)
    private rentalRepository: Repository<Rental>,
  ) {}

  // 1. ПРОВЕРКА ПРОСРОЧЕННЫХ АРЕНД
  // Запускается каждый час в 00 минут
  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueRentals() {
    this.logger.log('🕵️‍♂️ Cron: Проверка просроченных аренд...');
    const now = new Date();

    // Ищем аренды в статусе ACTIVE, у которых время возврата уже прошло
    const overdueRentals = await this.rentalRepository.find({
      where: {
        status: RentalStatus.ACTIVE,
        end_date: LessThan(now),
      },
    });

    if (overdueRentals.length > 0) {
      for (const rental of overdueRentals) {
        rental.status = RentalStatus.OVERDUE;
      }
      await this.rentalRepository.save(overdueRentals);
      this.logger.warn(
        `🔴 Cron: Переведено в OVERDUE: ${overdueRentals.length} бронирований.`,
      );
    }
  }

  // 2. ОЧИСТКА "ЗАВИСШИХ" ИЛИ НЕОПЛАЧЕННЫХ ЗАЯВОК
  // Запускается каждый день в полночь
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAbandonedRentals() {
    this.logger.log(
      '🧹 Cron: Очистка зависших бронирований (клиент не пришел)...',
    );
    const now = new Date();

    // Если заявка висит в CREATED или APPROVED, а дата начала аренды уже прошла
    const abandoned = await this.rentalRepository.find({
      where: [
        { status: RentalStatus.CREATED, start_date: LessThan(now) },
        { status: RentalStatus.APPROVED, start_date: LessThan(now) },
      ],
    });

    if (abandoned.length > 0) {
      for (const rental of abandoned) {
        rental.status = RentalStatus.CANCELED;
      }
      await this.rentalRepository.save(abandoned);
      this.logger.log(`🧹 Cron: Отменено зависших броней: ${abandoned.length}`);
    }
  }
}
