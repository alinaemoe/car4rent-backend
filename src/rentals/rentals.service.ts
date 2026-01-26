import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { CreateRentalDto } from './dto/create-rental.dto';
import { FinishRentalDto } from './dto/finish-rental.dto';
import { Rental, RentalStatus } from '../entities/rental.entity';
import { CarsService } from '../cars/cars.service';
import { User } from '../entities/user.entity';
import { CarStatus } from '../entities/car.entity';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental)
    private rentalRepository: Repository<Rental>,
    private carsService: CarsService,
  ) {}

  async create(user: any, createRentalDto: CreateRentalDto) {
    const { car_id, start_date, end_date } = createRentalDto;
    const start = new Date(start_date);
    const end = new Date(end_date);
    const now = new Date();

    // 1. Date Validation
    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }
    if (start < now) {
      throw new BadRequestException('Cannot book a car in the past');
    }
    if (end <= now) {
      throw new BadRequestException('Rental end date cannot be in the past');
    }

    // 2. Find the car (Ensure location is loaded to know where to pick it up)
    const car = await this.carsService.findOne(car_id);

    // 3. Check for overlaps (CREATED + APPROVED + ACTIVE)
    // We check if the car is already active or booked during these dates
    const overlap = await this.rentalRepository.findOne({
      where: {
        car: { id: car_id },
        status: In([
          RentalStatus.CREATED,
          RentalStatus.APPROVED,
          RentalStatus.ACTIVE,
        ]),
        start_date: LessThanOrEqual(end),
        end_date: MoreThanOrEqual(start),
      },
    });

    if (overlap) {
      throw new BadRequestException(
        'The car is already booked for the selected dates',
      );
    }

    // 4. Price Calculation
    const days = this.calculateDays(start, end);
    const calculatedPrice = days * car.price_per_day;

    const rental = this.rentalRepository.create({
      user: { id: user.id || user.userId },

      car,
      start_date: start,
      end_date: end,
      base_price: calculatedPrice,
      total_price: undefined,
      status: RentalStatus.CREATED,
      pick_up_location: car.location ?? undefined,
      drop_off_location: car.location ?? undefined,
    });

    const savedRental = await this.rentalRepository.save(rental);

    return {
      ...savedRental,
      user: user,
    };
  }

  private calculateDays(start: Date, end: Date): number {
    const oneDay = 1000 * 60 * 60 * 24;
    const diffInTime = end.getTime() - start.getTime();
    return Math.ceil(diffInTime / oneDay);
  }

  async findMyRentals(userId: string) {
    return this.rentalRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'car', 'car.images'],

      //!! can be selected
      // select: {
      //   id: true,
      //   status: true,
      //   start_date: true,
      //   end_date: true,
      //   base_price: true,
      //   created_at: true,

      //   user: {
      //     id: true,
      //     first_name: true,
      //     last_name: true,
      //     email: true,
      //   },

      //   car: {
      //     id: true,
      //     brand: true,
      //     model: true,
      //     year: true,
      //     price_per_day: true,
      //     images: {
      //       url: true,
      //       is_main: true,
      //     },
      //     // vin, description, color
      //   },
      // },
      order: { created_at: 'DESC' },
    });
  }

  async findAll() {
    return this.rentalRepository.find({
      relations: ['user', 'car'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: RentalStatus) {
    const rental = await this.rentalRepository.findOne({ where: { id } });
    if (!rental) throw new NotFoundException('Rental not found');

    rental.status = status;
    return await this.rentalRepository.save(rental);
  }

  async finish(id: number, finishDto: FinishRentalDto) {
    const rental = await this.rentalRepository.findOne({
      where: { id },
      relations: ['car'],
    });

    if (!rental) throw new NotFoundException('Rental not found');

    if (
      rental.status !== RentalStatus.ACTIVE &&
      rental.status !== RentalStatus.APPROVED
    ) {
      throw new BadRequestException('Only active rentals can be completed.');
    }

    const { end_mileage } = finishDto;
    const now = new Date();

    // 1. Пробег
    // Если start_mileage не был записан при выдаче, считаем его равным текущему пробегу авто до аренды
    // Но лучше при выдаче (start) его фиксировать. Пока допустим, что current_mileage у авто актуален.
    const startMileage = rental.start_mileage || rental.car.current_mileage;

    if (end_mileage < startMileage) {
      throw new BadRequestException(
        'The final mileage cannot be less than the initial mileage.',
      );
    }

    const distanceDriven = end_mileage - startMileage;

    // 2. Расчет дней аренды (фактический)
    // base_days - на сколько договаривались
    // actual_days - сколько проездили по факту (округляем вверх до часов/суток)
    // Для простоты считаем разницу дат.

    // 3. Лимиты и Штрафы
    let penalty = 0;

    // А. Штраф за перепробег
    // Лимит на всю поездку = Лимит в день * Кол-во планируемых дней
    const plannedDays = this.calculateDays(rental.start_date, rental.end_date);
    const totalLimit = rental.car.mileage_limit_per_day * plannedDays;

    if (distanceDriven > totalLimit) {
      const overLimitKm = distanceDriven - totalLimit;
      // car.price_per_km_over_limit хранит цену штрафа за км (у нас 1.0 по дефолту)
      penalty += overLimitKm * rental.car.price_per_km_over_limit;
    }

    // Б. Штраф за опоздание (Overdue)
    if (now > rental.end_date) {
      // Логика штрафа за время: например, двойной тариф за каждый лишний день
      const overdueDays = this.calculateDays(rental.end_date, now);
      penalty += overdueDays * (rental.car.price_per_day * 2); // Штраф x2
    }

    // 4. Обновляем данные
    rental.actual_return_date = now;
    rental.end_mileage = end_mileage;
    rental.penalty_price = penalty;

    // ИТОГОВАЯ ЦЕНА = Базовая + Штрафы
    // Обрати внимание: base_price у нас string/decimal, надо привести к числу
    rental.total_price = Number(rental.base_price) + penalty;

    rental.status = RentalStatus.COMPLETED;

    // 5. Важно! Обновляем пробег у самой машины и ставим статус AVAILABLE
    // Чтобы следующая аренда знала новый пробег
    await this.carsService.updateMileageAndStatus(
      rental.car.id,
      end_mileage,
      CarStatus.AVAILABLE,
    );

    return await this.rentalRepository.save(rental);
  }
}
