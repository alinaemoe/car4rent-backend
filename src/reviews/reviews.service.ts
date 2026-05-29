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
import { UpdateReviewDto } from './dto/update-review.dto';
import { Rental, RentalStatus } from '../entities/rental.entity';
import { Car } from '../entities/car.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(Rental)
    private rentalRepo: Repository<Rental>,
    @InjectRepository(Car)
    private carRepo: Repository<Car>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    let rental: Rental | null = null;
    let car: Car | null = null;
    let targetUserId = userId;

    // Admin creation: explicit user_id and car_id
    if (dto.user_id) {
      targetUserId = dto.user_id;
    }

    if (dto.rental_id) {
      rental = await this.rentalRepo.findOne({
        where: { id: dto.rental_id },
        relations: ['user', 'car'],
      });
      if (!rental) throw new NotFoundException('Rental not found');
      if (rental.user.id !== targetUserId) {
        throw new ForbiddenException('Rental does not belong to this user');
      }
      if (rental.status !== RentalStatus.COMPLETED) {
        throw new BadRequestException('Can only review completed rentals');
      }
      const existing = await this.reviewRepo.findOne({
        where: { rental: { id: dto.rental_id } },
      });
      if (existing) throw new BadRequestException('Already reviewed this rental');
      car = rental.car;
    } else if (dto.car_id) {
      car = await this.carRepo.findOne({ where: { id: dto.car_id } });
      if (!car) throw new NotFoundException('Car not found');
    }

    if (!car && !dto.rental_id) {
      // Company review (no car)
    }

    // Verify user exists
    const userExists = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!userExists) throw new NotFoundException('User not found');

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      user: { id: targetUserId },
      rental: rental ?? undefined,
      car: car ?? undefined,
    });

    const savedReview = await this.reviewRepo.save(review);

    if (car) {
      await this.recalculateCarRating(car.id);
    }

    return this.reviewRepo.findOne({
      where: { id: savedReview.id },
      relations: ['user', 'car'],
    });
  }

  async findAllForAdmin(
    _start: number,
    _end: number,
    _sort: string,
    _order: string,
    filters: { car_id?: number; rating?: number; user_id?: string },
  ) {
    const where: any = {};
    if (filters.car_id != null) where.car = { id: filters.car_id };
    if (filters.rating != null) where.rating = filters.rating;
    if (filters.user_id != null) where.user = { id: filters.user_id };

    const order: any = {};
    order[_sort] = _order.toUpperCase();

    const [reviews, total] = await this.reviewRepo.findAndCount({
      where,
      relations: ['user', 'car'],
      order,
      skip: _start,
      take: _end - _start,
    });

    return { data: reviews, total };
  }

  async findOne(id: number) {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'car'],
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(id: number, dto: UpdateReviewDto) {
    const review = await this.findOne(id);

    if (dto.rating != null) review.rating = dto.rating;
    if (dto.comment != null) review.comment = dto.comment;

    await this.reviewRepo.save(review);

    if (review.car) {
      await this.recalculateCarRating(review.car.id);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const review = await this.findOne(id);
    const carId = review.car?.id;
    await this.reviewRepo.remove(review);
    if (carId) {
      await this.recalculateCarRating(carId);
    }
    return review;
  }

  private async recalculateCarRating(carId: number) {
    const allReviews = await this.reviewRepo.find({
      where: { car: { id: carId } },
    });
    const totalStars = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = allReviews.length > 0 ? totalStars / allReviews.length : 0;
    const car = await this.carRepo.findOne({ where: { id: carId } });
    if (car) {
      car.avg_rating = Math.round(avg * 10) / 10;
      car.reviews_count = allReviews.length;
      await this.carRepo.save(car);
    }
  }

  async findCarReviews(carId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { car: { id: carId } },
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const mappedData = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      userFirstName: r.user?.first_name,
      userLastName: r.user?.last_name,
      userAvatarUrl: r.user?.avatar_url,
    }));

    return {
      data: mappedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findCompanyReviews() {
    return this.reviewRepo.find({
      where: { car: IsNull() },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }
}
