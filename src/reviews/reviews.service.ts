import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Review } from '../entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Rental, RentalStatus } from '../entities/rental.entity';
import { Car } from '../entities/car.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(Rental)
    private rentalRepo: Repository<Rental>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    let rental: Rental | null = null;
    let car: Car | null = null;

    if (dto.rental_id) {
      rental = await this.rentalRepo.findOne({
        where: { id: dto.rental_id },
        relations: ['user', 'car'],
      });

      if (!rental) throw new NotFoundException('No trip found');

      if (rental.user.id !== userId) {
        throw new ForbiddenException('This is not your journey');
      }
      if (rental.status !== RentalStatus.COMPLETED) {
        throw new BadRequestException('The journey must be completed');
      }

      const existing = await this.reviewRepo.findOne({
        where: { rental: { id: dto.rental_id } },
      });
      if (existing)
        throw new BadRequestException('Have you already rated this trip?');

      car = rental.car;
    }

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      user: { id: userId },
      rental: rental ?? undefined,
      car: car ?? undefined,
    });

    return await this.reviewRepo.save(review);
  }

  async findCarReviews(carId: number) {
    return this.reviewRepo.find({
      where: { car: { id: carId } },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findCompanyReviews() {
    return this.reviewRepo.find({
      where: { car: IsNull() },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }
}
