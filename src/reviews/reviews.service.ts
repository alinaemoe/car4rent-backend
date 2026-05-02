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
import { Car } from '../entities/car.entity'; // 👈 Добавили

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(Rental)
    private rentalRepo: Repository<Rental>,
    @InjectRepository(Car) // 👈 Инжектим репозиторий авто
    private carRepo: Repository<Car>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    let rental: Rental | null = null;
    let car: Car | null = null;

    if (dto.rental_id) {
      rental = await this.rentalRepo.findOne({
        where: { id: dto.rental_id },
        relations: ['user', 'car'],
      });

      if (!rental) throw new NotFoundException('Поездка не найдена');

      if (rental.user.id !== userId) {
        throw new ForbiddenException('Это не ваша поездка');
      }
      if (rental.status !== RentalStatus.COMPLETED) {
        throw new BadRequestException(
          'Оценить можно только завершенную поездку',
        );
      }

      const existing = await this.reviewRepo.findOne({
        where: { rental: { id: dto.rental_id } },
      });
      if (existing)
        throw new BadRequestException('Вы уже оценивали эту поездку');

      car = rental.car;
    }

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      user: { id: userId },
      rental: rental ?? undefined,
      car: car ?? undefined,
    });

    const savedReview = await this.reviewRepo.save(review);

    // 🔥 ПЕРЕСЧЕТ РЕЙТИНГА АВТОМОБИЛЯ 🔥
    if (car) {
      // Ищем все отзывы для этой машины
      const allCarReviews = await this.reviewRepo.find({
        where: { car: { id: car.id } },
      });

      // Считаем сумму звезд
      const totalStars = allCarReviews.reduce((sum, r) => sum + r.rating, 0);

      // Считаем среднее (с одним знаком после запятой, например 4.8)
      const avgRating = totalStars / allCarReviews.length;
      car.avg_rating = Math.round(avgRating * 10) / 10;
      car.reviews_count = allCarReviews.length;

      // Сохраняем обновленную машину
      await this.carRepo.save(car);
    }

    return savedReview;
  }

  async findCarReviews(carId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Используем findAndCount для пагинации
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { car: { id: carId } },
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    // Мапим под интерфейс, который мы уже используем на фронте (CarReviewPreview)
    const mappedData = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      userFirstName: r.user?.first_name,
      userLastName: r.user?.last_name,
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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
