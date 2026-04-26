import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { CreateRentalDto } from './dto/create-rental.dto';
import { FinishRentalDto } from './dto/finish-rental.dto';
import { StartRentalDto } from './dto/start-rental.dto';
import { Rental, RentalStatus } from '../entities/rental.entity';
import { CarDamage } from 'src/entities/car-damage.entity';
import { CarsService } from '../cars/cars.service';
import { UserRole } from '../entities/user.entity';
import { CarStatus } from '../entities/car.entity';
import {
  Transaction,
  TransactionType,
  PayoutStatus,
} from '../entities/transaction.entity';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental) private rentalRepository: Repository<Rental>,
    @InjectRepository(CarDamage)
    private damageRepository: Repository<CarDamage>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private carsService: CarsService,
  ) {}

  async create(user: any, createRentalDto: CreateRentalDto) {
    const { car_id, start_date, end_date, user_id } = createRentalDto;
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

    let targetUserId = user.id || user.userId;
    const isAdminOrManager =
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.MANAGER);

    if (isAdminOrManager && user_id) {
      targetUserId = user_id;
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
    const basePrice = days * car.price_per_day;

    let discountPercent = 0;
    // Считаем скидку так же, как на фронте
    if (car.discount_tiers) {
      const tiers = Object.keys(car.discount_tiers)
        .map(Number)
        .sort((a, b) => b - a);
      for (const tierDays of tiers) {
        if (days >= tierDays) {
          discountPercent = car.discount_tiers[tierDays];
          break;
        }
      }
    }

    const discountAmount = Math.floor((basePrice * discountPercent) / 100);
    const finalPrice = basePrice - discountAmount;

    const rental = this.rentalRepository.create({
      user: { id: targetUserId },

      car,
      start_date: start,
      end_date: end,
      base_price: finalPrice, // 👈 Пишем уже ИТОГОВУЮ цену за аренду
      total_price: finalPrice + Number(car.deposit_amount), // 👈 Плюсуем залог
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
    const rentals = await this.rentalRepository.find({
      where: { user: { id: userId } },
      relations: ['car', 'car.images', 'reviews'], // 👈 Подтягиваем связи
      order: { created_at: 'DESC' },
    });

    // 👇 Трансформируем ответ для удобства фронтенда
    return rentals.map((rental) => {
      // Если есть хоть один отзыв — ставим true
      const has_review = rental.reviews && rental.reviews.length > 0;

      // Выкидываем сам массив отзывов, чтобы не раздувать JSON ответа
      const { reviews, ...rentalData } = rental;

      return {
        ...rentalData,
        has_review,
      };
    });
  }

  async findAll(userId?: string, status?: RentalStatus) {
    const whereCondition: any = {};

    if (userId) whereCondition.user = { id: userId };
    if (status) whereCondition.status = status;

    return this.rentalRepository.find({
      where: whereCondition,
      relations: ['user', 'car', 'car.images'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: RentalStatus) {
    const rental = await this.rentalRepository.findOne({ where: { id } });
    if (!rental) throw new NotFoundException('Rental not found');

    rental.status = status;
    return await this.rentalRepository.save(rental);
  }

  // 🚀 START OF LEASE (Key handover)
  async startRental(id: number, startDto: StartRentalDto) {
    const rental = await this.rentalRepository.findOne({
      where: { id },
      relations: ['car'],
    });

    if (!rental) throw new NotFoundException('No rentals found');

    // You can only start with APPROVED or CREATED (if immediately at the counter)
    if (
      rental.status !== RentalStatus.APPROVED &&
      rental.status !== RentalStatus.CREATED
    ) {
      throw new BadRequestException(
        'This rental cannot be started (status is not suitable).',
      );
    }

    // We capture reality
    rental.start_mileage = rental.car.current_mileage; // We take the mileage from the car.
    rental.start_fuel = startDto.start_fuel; // Fuel writes manager
    rental.status = RentalStatus.ACTIVE;

    await this.carsService.updateMileageAndStatus(
      rental.car.id,
      rental.car.current_mileage,
      CarStatus.RENTED,
    );

    return await this.rentalRepository.save(rental);
  }

  async cancel(id: number, userId: string, roles: UserRole[]) {
    const rental = await this.rentalRepository.findOne({
      where: { id },
      relations: ['user', 'car'], // Load the user for rights verification and the machine for status change
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    const isAdmin = roles.includes(UserRole.ADMIN);
    const isOwner = rental.user.id === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You are not allowed to cancel this rental');
    }

    if (
      rental.status === RentalStatus.ACTIVE ||
      rental.status === RentalStatus.COMPLETED
    ) {
      throw new BadRequestException('The trip has already started or ended');
    }

    if (rental.status === RentalStatus.CANCELED) {
      return rental;
    }

    rental.status = RentalStatus.CANCELED;

    return await this.rentalRepository.save(rental);
  }

  async finish(id: number, finishDto: FinishRentalDto) {
    const rental = await this.rentalRepository.findOne({
      where: { id },
      relations: ['car', 'car.owner'], // 👈 КРИТИЧНО ВАЖНО: загружаем владельца машины!
    });

    if (!rental) throw new NotFoundException('Rental not found');

    if (
      rental.status !== RentalStatus.ACTIVE &&
      rental.status !== RentalStatus.APPROVED
    ) {
      throw new BadRequestException('Only active rentals can be completed.');
    }

    const { end_mileage, actual_return_date, end_fuel, damages } = finishDto;

    const returnDate = actual_return_date
      ? new Date(actual_return_date)
      : new Date();

    if (returnDate < rental.start_date) {
      throw new BadRequestException(
        'The return date cannot be earlier than the start date of the rental.',
      );
    }

    const startMileage = rental.start_mileage || rental.car.current_mileage;

    if (end_mileage < startMileage) {
      throw new BadRequestException(
        'The final mileage cannot be less than the initial mileage.',
      );
    }

    let penalty = 0;

    const plannedDays = this.calculateDays(rental.start_date, rental.end_date);
    const totalLimit = rental.car.mileage_limit_per_day * plannedDays;
    const distanceDriven = end_mileage - startMileage;

    if (distanceDriven > totalLimit) {
      penalty +=
        (distanceDriven - totalLimit) * rental.car.price_per_km_over_limit;
    }

    if (returnDate > rental.end_date) {
      const overdueDays = this.calculateDays(rental.end_date, returnDate);
      penalty += overdueDays * (rental.car.price_per_day * 2);
    }

    const FUEL_PENALTY_PER_PERCENT = 2.0;

    if (end_fuel < rental.start_fuel) {
      const missingFuel = rental.start_fuel - end_fuel;
      penalty += missingFuel * FUEL_PENALTY_PER_PERCENT;
    }

    if (damages && damages.length > 0) {
      for (const dmgDto of damages) {
        penalty += dmgDto.repair_cost;

        const damageEntity = this.damageRepository.create({
          rental: rental,
          car: rental.car,
          type: dmgDto.type,
          description: dmgDto.description,
          repair_cost: dmgDto.repair_cost,
          image_url: dmgDto.image_url,
          is_paid: false,
        });

        await this.damageRepository.save(damageEntity);
      }
    }

    rental.end_fuel = end_fuel;
    rental.end_mileage = end_mileage;
    rental.actual_return_date = new Date(actual_return_date || new Date());
    rental.penalty_price = penalty;
    rental.total_price = Number(rental.base_price) + penalty;
    rental.status = RentalStatus.COMPLETED;

    // 💥 TRANSACTIONS LOGIC START 💥
    const carOwner = rental.car.owner;
    const COMMISSION_RATE = 0.2; // 20% комиссия нашего сервиса

    let systemFee = Number(rental.total_price);
    let lessorIncome = 0;
    let payoutStatus = PayoutStatus.NOT_APPLICABLE;

    // Если у машины есть владелец (это партнер), то пилим деньги
    if (carOwner) {
      systemFee = Number(rental.total_price) * COMMISSION_RATE;
      lessorIncome = Number(rental.total_price) - systemFee;
      payoutStatus = PayoutStatus.PENDING; // Ставим "В ожидании выплаты"
    }

    const transaction = this.transactionRepository.create({
      rental: rental,
      car: rental.car,
      lessor: carOwner || null, // Записываем кому платить (если есть)
      type: TransactionType.RENTAL_PAYMENT,
      total_amount: rental.total_price,
      system_fee: systemFee,
      lessor_income: lessorIncome,
      payout_status: payoutStatus,
    });

    await this.transactionRepository.save(transaction);
    // 💥 TRANSACTIONS LOGIC END 💥

    await this.carsService.updateMileageAndStatus(
      rental.car.id,
      end_mileage,
      CarStatus.AVAILABLE,
    );

    return await this.rentalRepository.save(rental);
  }

  async findRentalsByCarId(carId: number, userId: string, roles: UserRole[]) {
    // Получаем машину, чтобы проверить, чья она
    const car = await this.carsService.findOne(carId);

    const isAdminOrManager =
      roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER);

    // Если это не админ, и машина не принадлежит этому юзеру — шлем лесом
    if (!isAdminOrManager && car.owner?.id !== userId) {
      throw new ForbiddenException(
        'У вас нет доступа к статистике этого автомобиля',
      );
    }

    // Если проверки пройдены, отдаем историю аренд
    return this.rentalRepository.find({
      where: { car: { id: carId } },
      relations: ['user', 'car'], // Подтягиваем юзера, чтобы партнер видел имя арендатора
      order: { created_at: 'DESC' },
    });
  }
}
