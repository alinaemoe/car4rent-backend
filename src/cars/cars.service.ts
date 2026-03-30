import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Car, CarStatus } from '../entities/car.entity';
import { CarImage } from 'src/entities/car-image.entity';
import { User, UserRole } from '../entities/user.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car) private readonly carsRepository: Repository<Car>,
    @InjectRepository(CarImage)
    private readonly imagesRepository: Repository<CarImage>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>, // 👈 Для обновления ролей
    private cloudinaryService: CloudinaryService,
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

  // 1. СОЗДАНИЕ (И авто-выдача роли LESSOR)
  async create(createCarDto: CreateCarDto, reqUser: any) {
    const car = this.carsRepository.create({
      ...createCarDto,
      owner: { id: reqUser.userId }, // Привязываем создателя как владельца
    });

    const savedCar = await this.carsRepository.save(car);

    // Проверяем, есть ли у юзера роль LESSOR. Если нет — добавляем.
    const user = await this.usersRepository.findOne({
      where: { id: reqUser.userId },
    });
    if (user && !user.roles.includes(UserRole.LESSOR)) {
      user.roles.push(UserRole.LESSOR);
      await this.usersRepository.save(user);
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

  async findAll() {
    return await this.carsRepository.find({
      relations: ['location', 'images', 'features', 'owner'],
      order: { created_at: 'DESC' },
    });
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
    car.status = CarStatus.AVAILABLE;
    return this.carsRepository.save(car);
  }
}
