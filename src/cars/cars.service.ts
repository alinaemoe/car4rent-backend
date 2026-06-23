import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { GetCatalogDto } from './dto/get-catalog-dto';
import { Car, CarStatus } from '../entities/car.entity';
import { CarImage } from 'src/entities/car-image.entity';
import { User, UserRole } from '../entities/user.entity';
import { RentalStatus } from 'src/entities/rental.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car) private readonly carsRepository: Repository<Car>,
    @InjectRepository(CarImage)
    private readonly imagesRepository: Repository<CarImage>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>, // 👈 Для обновления ролей
    private cloudinaryService: CloudinaryService,
    @InjectRepository(CarImage)
    private carImagesRepository: Repository<CarImage>, // 👈 ВАЖНО ДЛЯ КАРТИНОК
  ) {}

  // 👇 ВСПОМОГАТЕЛЬНЫЙ МЕТОД: Проверка прав на машину
  async checkOwnership(carId: number, reqUser: any) {
    const car = await this.findOne(carId);

    const isAdminOrManager =
      reqUser.roles.includes(UserRole.ADMIN) ||
      reqUser.roles.includes(UserRole.MANAGER);
    const isOwner = car.owner?.id === reqUser.userId;

    if (!isAdminOrManager && !isOwner) {
      throw new ForbiddenException(
        'У вас нет прав на изменение этого автомобиля',
      );
    }
    return car;
  }

  // 1. СОЗДАНИЕ (С обработкой фоток и выдачей роли)
  async create(createCarDto: CreateCarDto, reqUser: any) {
    // Вытаскиваем фотки и владельца из DTO
    const { existing_images, owner, ...carData } = createCarDto;

    // Определяем ID владельца.
    // Берем из DTO (если админ указал его в форме).
    const finalOwnerId = owner?.id || null;

    // Создаем машину
    const car = this.carsRepository.create({
      ...carData,
      owner: finalOwnerId ? { id: finalOwnerId } : null,
    });

    const savedCar = await this.carsRepository.save(car);

    // 👇 ОБРАБОТКА КАРТИНОК ИЗ ЗАЯВКИ
    if (existing_images && existing_images.length > 0) {
      const imagesToSave = existing_images.map((url, index) => {
        return this.carImagesRepository.create({
          url: url,
          car: savedCar,
          is_main: index === 0, // Делаем первую фотку главной
        });
      });

      await this.carImagesRepository.save(imagesToSave);
    }

    // 👇 ВЫДАЧА РОЛИ LESSOR (вторая страховка)
    // Роль партнёра выдаётся ещё на этапе одобрения заявки
    // (PartnershipRequestsService.updateStatus). Здесь дублируем: если машину
    // привязали к юзеру, гарантированно делаем его лессором. Так в мобилке точно
    // появится вкладка "Мой автопарк", а GET /cars/my (findCarsByOwner) вернёт
    // эту машину, т.к. owner_id теперь проставлен корректно.
    if (finalOwnerId) {
      const user = await this.usersRepository.findOne({
        where: { id: finalOwnerId },
      });

      if (user && !user.roles.includes(UserRole.LESSOR)) {
        user.roles.push(UserRole.LESSOR);
        await this.usersRepository.save(user);
      }
    }

    return savedCar;
  }

  // 2. ПОЛУЧИТЬ МАШИНЫ ВЛАДЕЛЬЦА
  async findCarsByOwner(ownerId: string) {
    return await this.carsRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['location', 'images', 'features'],
      order: { created_at: 'DESC' },
    });
  }

  async findAll(
    skip?: number,
    take?: number,
    sort?: string,
    order?: 'ASC' | 'DESC',
    q?: string,
    status?: string,
  ) {
    const qb = this.carsRepository.createQueryBuilder('car');
    qb.leftJoinAndSelect('car.location', 'location');
    qb.leftJoinAndSelect('car.images', 'images');
    qb.leftJoinAndSelect('car.features', 'features');
    qb.leftJoinAndSelect('car.owner', 'owner');

    if (q) {
      qb.andWhere(
        '(LOWER(car.brand) LIKE LOWER(:q) OR LOWER(car.model) LIKE LOWER(:q) OR LOWER(car.license_plate) LIKE LOWER(:q))',
        { q: `%${q}%` },
      );
    }

    if (status) {
      qb.andWhere('car.status = :status', { status });
    }

    const orderColumn = sort || 'created_at';
    const orderDir = order || 'DESC';
    qb.orderBy(`car.${orderColumn}`, orderDir);

    qb.skip(skip || 0);
    qb.take(take || 100);

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }
  // 👇 ОБНОВЛЕННЫЙ МЕТОД ДЛЯ МОБИЛЬНОГО КАТАЛОГА С МАКСИМАЛЬНЫМИ ФИЛЬТРАМИ
  async getCatalog(query: GetCatalogDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.carsRepository.createQueryBuilder('car');

    qb.leftJoinAndSelect('car.images', 'image', 'image.is_main = :isMain', {
      isMain: true,
    });
    qb.leftJoinAndSelect('car.location', 'location');
    qb.leftJoinAndSelect('car.features', 'features');

    // Считаем количество отзывов (это TypeORM умеет мапить из коробки)
    qb.loadRelationCountAndMap('car.reviews_count', 'car.reviews');

    // Базовый статус
    const carStatus = query.status || CarStatus.AVAILABLE;
    qb.andWhere('car.status = :status', { status: carStatus });

    // --- УТИЛИТА ДЛЯ МАССИВОВ ---
    const toArray = (val: any): any[] => {
      if (!val) return [];
      return Array.isArray(val) ? val : String(val).split(',');
    };

    // 1. ИЗБРАННОЕ (ПО ИДЕНТИФИКАТОРАМ)
    const idsArray = toArray(query.ids)
      .map(Number)
      .filter((id) => !isNaN(id));
    if (idsArray.length > 0) {
      qb.andWhere('car.id IN (:...ids)', { ids: idsArray });
    }

    // 2. БАЗОВЫЕ МАССИВЫ (Марка, Кузов, Топливо, Коробка, Привод)
    const brands = toArray(query.brands);
    if (brands.length > 0) qb.andWhere('car.brand IN (:...brands)', { brands });

    const bodyTypes = toArray(query.body_types);
    if (bodyTypes.length > 0)
      qb.andWhere('car.body_type IN (:...bodyTypes)', { bodyTypes });

    const transmissions = toArray(query.transmissions);
    if (transmissions.length > 0)
      qb.andWhere('car.transmission IN (:...transmissions)', { transmissions });

    const fuelTypes = toArray(query.fuel_types);
    if (fuelTypes.length > 0)
      qb.andWhere('car.fuel_type IN (:...fuelTypes)', { fuelTypes });

    const driveTypes = toArray(query.drive_types);
    if (driveTypes.length > 0)
      qb.andWhere('car.drive_type IN (:...driveTypes)', { driveTypes });

    const colors = toArray(query.colors);
    if (colors.length > 0)
      qb.andWhere('car.color IN (:...colors)', { colors });

    // 3. ЧИСЛОВЫЕ ДИАПАЗОНЫ (От и До)
    if (query.min_price)
      qb.andWhere('car.price_per_day >= :min_price', {
        min_price: query.min_price,
      });
    if (query.max_price)
      qb.andWhere('car.price_per_day <= :max_price', {
        max_price: query.max_price,
      });

    if (query.min_year)
      qb.andWhere('car.year >= :min_year', { min_year: query.min_year });
    if (query.max_year)
      qb.andWhere('car.year <= :max_year', { max_year: query.max_year });

    if (query.min_mileage)
      qb.andWhere('car.current_mileage >= :min_mileage', {
        min_mileage: query.min_mileage,
      });
    if (query.max_mileage)
      qb.andWhere('car.current_mileage <= :max_mileage', {
        max_mileage: query.max_mileage,
      });

    if (query.min_power)
      qb.andWhere('car.horsepower >= :min_power', {
        min_power: query.min_power,
      });
    if (query.max_power)
      qb.andWhere('car.horsepower <= :max_power', {
        max_power: query.max_power,
      });

    if (query.min_consumption)
      qb.andWhere('car.fuel_consumption >= :min_consumption', {
        min_consumption: query.min_consumption,
      });
    if (query.max_consumption)
      qb.andWhere('car.fuel_consumption <= :max_consumption', {
        max_consumption: query.max_consumption,
      });

    // 4. ДОП. ОПЦИИ (Features) - "Машина должна иметь ВСЕ выбранные опции"
    const featureIds = toArray(query.feature_ids)
      .map(Number)
      .filter((id) => !isNaN(id));

    if (featureIds.length > 0) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('cf.carsId')
          .from('car_features', 'cf')
          .where('cf.featuresId IN (:...featureIds)')
          .groupBy('cf.carsId')
          .having('COUNT(cf.featuresId) >= :featuresCount')
          .getQuery();
        return `car.id IN ${subQuery}`;
      });
      qb.setParameter('featureIds', featureIds);
      qb.setParameter('featuresCount', featureIds.length);
    }

    // 5. ДАТЫ АРЕНДЫ (Исключаем занятые машины)
    const startDate = query.start_date || (query as any).startDate;
    const endDate = query.end_date || (query as any).endDate || startDate;

    if (startDate && endDate) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('1')
          .from('rentals', 'rental')
          .where('rental.car_id = car.id')
          .andWhere('rental.status NOT IN (:...excludedStatuses)')
          .andWhere(
            '(rental.start_date <= :endDate AND rental.end_date >= :startDate)',
          )
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });

      qb.setParameter('startDate', startDate);
      qb.setParameter('endDate', endDate);

      // 🔥 Исправили: CANCELED с одной 'L', как в твоем Enum
      qb.setParameter('excludedStatuses', [
        RentalStatus.CANCELED,
        RentalStatus.COMPLETED,
      ]);
    }

    // Выводим финальный SQL-запрос, чтобы убедиться, что он правильный
    console.log('5. Generated SQL:', qb.getSql());
    console.log('=============================\n');

    // 6. МИНИМАЛЬНЫЙ РЕЙТИНГ (Фильтрация работает на уровне SQL)
    if (query.min_rating) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('COALESCE(AVG(r.rating), 0)')
          .from('reviews', 'r')
          .where('r.car_id = car.id')
          .getQuery();
        return `${subQuery} >= :min_rating`;
      });
      qb.setParameter('min_rating', query.min_rating);
    }

    // 7. СОРТИРОВКА
    if (query.sort_by === 'price_asc') {
      qb.orderBy('car.price_per_day', 'ASC');
    } else if (query.sort_by === 'price_desc') {
      qb.orderBy('car.price_per_day', 'DESC');
    } else if (query.sort_by === 'rating_desc') {
      // сортировка в памяти после ручного маппинга avg_rating (см. шаг 8)
    } else {
      qb.orderBy('car.created_at', 'DESC');
    }

    // Вторичная сортировка от дубликатов
    qb.addOrderBy('car.id', 'DESC');

    // 🔥 👇 ВОТ ЭТА СТРОЧКА ВЕРНЕТ ПАГИНАЦИЮ К ЖИЗНИ
    qb.skip(skip).take(limit);

    // Только после skip и take делаем запрос к БД!
    const [data, total] = await qb.getManyAndCount();

    // 8. 🛠 РЕШЕНИЕ ПРОБЛЕМЫ: РУЧНОЙ МАППИНГ РЕЙТИНГА
    if (data.length > 0) {
      const carIds = data.map((car) => car.id);

      // Делаем легкий сырой запрос через менеджер для подсчета среднего рейтинга
      const ratings = await this.carsRepository.manager
        .createQueryBuilder()
        .select('r.car_id', 'carId')
        .addSelect('ROUND(AVG(r.rating), 1)', 'avgRating')
        .from('reviews', 'r')
        .where('r.car_id IN (:...carIds)', { carIds })
        .groupBy('r.car_id')
        .getRawMany();

      const ratingMap = new Map();
      ratings.forEach((r) => ratingMap.set(r.carId, Number(r.avgRating)));

      // Приклеиваем рейтинг к нашим сущностям
      data.forEach((car: any) => {
        car.avg_rating = ratingMap.get(car.id) || 0;
      });
    }

    // 9. СОРТИРОВКА В ПАМЯТИ для rating_desc (TypeORM не умеет subquery + skip/take)
    if (query.sort_by === 'rating_desc') {
      data.sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0));
    }

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCatalogOne(id: number) {
    // 1. Достаем саму машину со статичными связями (без ренталов и отзывов, чтобы не грузить БД)
    const car = await this.carsRepository.findOne({
      where: { id },
      relations: ['location', 'images', 'features'],
    });

    if (!car) throw new NotFoundException(`Car with ID ${id} not found`);

    // 2. Достаем ЗАНЯТЫЕ ДАТЫ (Активные бронирования)
    // Отдаем на фронт только start_date и end_date, чтобы календарь заблокировал эти дни
    const bookedDates = await this.carsRepository.manager
      .createQueryBuilder()
      .select(['r.start_date AS "startDate"', 'r.end_date AS "endDate"'])
      .from('rentals', 'r')
      .where('r.car_id = :id', { id })
      // Нас волнуют только те брони, которые состоятся или уже идут
      .andWhere("r.status IN ('CREATED', 'APPROVED', 'ACTIVE')")
      .getRawMany();

    // 3. Достаем СТАТИСТИКУ РЕЙТИНГА
    const ratingStats = await this.carsRepository.manager
      .createQueryBuilder()
      .select('COALESCE(ROUND(AVG(r.rating), 1), 0)', 'avgRating')
      .addSelect('COUNT(r.id)', 'reviewsCount')
      .from('reviews', 'r')
      .where('r.car_id = :id', { id })
      .getRawOne();

    // 4. Достаем ПОСЛЕДНИЕ 3 ОТЗЫВА (Для превью на экране)
    const latestReviews = await this.carsRepository.manager
      .createQueryBuilder()
      .select([
        'r.id AS "id"',
        'r.rating AS "rating"',
        'r.comment AS "comment"',
        'r.created_at AS "created_at"',
        'u.first_name AS "userFirstName"',
        'u.last_name AS "userLastName"',
        'u.avatar_url AS "userAvatarUrl"',
      ])
      .from('reviews', 'r')
      .leftJoin('r.user', 'u')
      .where('r.car_id = :id', { id })
      .orderBy('r.created_at', 'DESC')
      .limit(3) // 👈 Жесткий лимит!
      .getRawMany();

    // 5. Собираем идеальный объект для мобильного приложения
    return {
      ...car,
      avg_rating: Number(ratingStats.avgRating),
      reviews_count: Number(ratingStats.reviewsCount),
      booked_dates: bookedDates, // Массив [{startDate, endDate}, ...]
      latest_reviews: latestReviews, // Массив из 3-х отзывов
    };
  }

  async findOne(id: number) {
    const car = await this.carsRepository.findOne({
      where: { id },
      relations: ['location', 'images', 'features', 'owner'],
    });

    if (!car) throw new NotFoundException(`Car with ID ${id} not found`);
    return car;
  }

  // 3. ОБНОВЛЕНИЕ (С проверкой прав)
  async update(id: number, updateCarDto: UpdateCarDto, reqUser: any) {
    await this.checkOwnership(id, reqUser); // 👈 Безопасность

    const car = await this.carsRepository.preload({
      id: id,
      ...updateCarDto,
    });

    if (!car) throw new NotFoundException(`Car with ID ${id} not found`);
    return await this.carsRepository.save(car);
  }

  async remove(id: number) {
    const result = await this.carsRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Car with ID ${id} not found`);
    return { message: 'Car deleted successfully' };
  }

  async uploadCarImage(carId: number, url: string) {
    const car = await this.findOne(carId);
    const image = this.imagesRepository.create({
      url: url,
      car: car,
      is_main: false,
    });
    return await this.imagesRepository.save(image);
  }

  async removeImage(imageId: number, reqUser: any) {
    const image = await this.imagesRepository.findOne({
      where: { id: imageId },
      relations: ['car', 'car.owner'], // Подтягиваем машину, чтобы узнать владельца
    });

    if (!image) throw new NotFoundException('Image not found');

    // Безопасность: Можем ли мы удалить это фото?
    const isAdminOrManager =
      reqUser.roles.includes(UserRole.ADMIN) ||
      reqUser.roles.includes(UserRole.MANAGER);
    const isOwner = image.car.owner?.id === reqUser.userId;

    if (!isAdminOrManager && !isOwner) {
      throw new ForbiddenException('У вас нет прав на удаление этого фото');
    }

    try {
      const publicId = this.extractPublicIdFromUrl(image.url);
      if (publicId) await this.cloudinaryService.deleteImage(publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }

    return await this.imagesRepository.remove(image);
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (e) {
      console.error('Error extracting public_id', e);
      return null;
    }
  }

  async updateMileageAndStatus(id: number, mileage: number, statusStr: string) {
    const car = await this.findOne(id);
    car.current_mileage = mileage;
    car.status = statusStr as CarStatus;
    return this.carsRepository.save(car);
  }

  async toggleVisibility(id: number, userId: string, isVisible: boolean) {
    const car = await this.carsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!car) throw new NotFoundException('Машина не найдена');

    if (car.owner?.id !== userId) {
      throw new ForbiddenException('Это не ваш автомобиль');
    }

    // Блокируем выключение, если на машине кто-то едет
    if (!isVisible && car.status === CarStatus.RENTED) {
      throw new BadRequestException(
        'Нельзя скрыть автомобиль, который сейчас находится в поездке',
      );
    }

    car.status = isVisible ? CarStatus.AVAILABLE : CarStatus.MAINTENANCE;
    return await this.carsRepository.save(car);
  }
}
