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

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental) private rentalRepository: Repository<Rental>,
    @InjectRepository(CarDamage)
    private damageRepository: Repository<CarDamage>,
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

  async findAll(userId?: string) {
    const whereCondition = userId ? { user: { id: userId } } : {};

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
      relations: ['car'],
    });

    if (!rental) throw new NotFoundException('Rental not found');

    if (
      rental.status !== RentalStatus.ACTIVE &&
      rental.status !== RentalStatus.APPROVED
    ) {
      throw new BadRequestException('Only active rentals can be completed.');
    }

    // 👇 We retrieve damages from DTO
    const { end_mileage, actual_return_date, end_fuel, damages } = finishDto;

    // 👇 TIME LOGIC: Take from DTO or current
    const returnDate = actual_return_date
      ? new Date(actual_return_date)
      : new Date();

    if (returnDate < rental.start_date) {
      throw new BadRequestException(
        'The return date cannot be earlier than the start date of the rental.',
      );
    }

    // 1. Mileage
    // Important point: start_mileage must be recorded at the time of issue (see below)
    const startMileage = rental.start_mileage || rental.car.current_mileage;

    if (end_mileage < startMileage) {
      throw new BadRequestException(
        'The final mileage cannot be less than the initial mileage.',
      );
    }

    let penalty = 0;

    const plannedDays = this.calculateDays(rental.start_date, rental.end_date);
    const totalLimit = rental.car.mileage_limit_per_day * plannedDays;
    const distanceDriven =
      end_mileage - (rental.start_mileage || rental.car.current_mileage);

    if (distanceDriven > totalLimit) {
      penalty +=
        (distanceDriven - totalLimit) * rental.car.price_per_km_over_limit;
    }

    // B. Penalty for late return (Overdue)
    // Compare returnDate (actual) with rental.end_date (planned)
    if (returnDate > rental.end_date) {
      const overdueDays = this.calculateDays(rental.end_date, returnDate);
      // For example, penalty: daily rate * 2
      penalty += overdueDays * (rental.car.price_per_day * 2);
    }

    // B. ⛽️ FUEL PENALTY (New logic)
    // Let's say: 1% shortage = 2 y.e. (or you can take it from the settings)
    const FUEL_PENALTY_PER_PERCENT = 2.0;

    if (end_fuel < rental.start_fuel) {
      const missingFuel = rental.start_fuel - end_fuel;
      penalty += missingFuel * FUEL_PENALTY_PER_PERCENT;
    }

    // 💥 DAMAGES LOGIC
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

    // 5. Updating the machine
    await this.carsService.updateMileageAndStatus(
      rental.car.id,
      end_mileage,
      CarStatus.AVAILABLE,
    );

    return await this.rentalRepository.save(rental);
  }
}
