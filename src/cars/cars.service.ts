import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Car } from '../entities/car.entity';
import { CarImage } from 'src/entities/car-image.entity';
import { CarStatus } from '../entities/car.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car) private readonly carsRepository: Repository<Car>,
    @InjectRepository(CarImage) // 👈 Инжектим репозиторий картинок
    private readonly imagesRepository: Repository<CarImage>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createCarDto: CreateCarDto) {
    // Магия TypeORM: если мы передадим location: { id: 5 }, он сам свяжет.
    // Но так как у нас в DTO поле называется location_id, надо перемапить.

    const { location_id, ...carData } = createCarDto;

    const car = this.carsRepository.create({
      ...carData,
      location: location_id ? { id: location_id } : null,
      // owner: null - по умолчанию машина компании
    });

    return await this.carsRepository.save(car);
  }

  async findAll() {
    // Возвращаем машины ВМЕСТЕ с картинками и локацией (Relations)
    return await this.carsRepository.find({
      relations: ['location', 'images', 'features'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const car = await this.carsRepository.findOne({
      where: { id },
      relations: ['location', 'images', 'features', 'owner'], // Владельца тоже подтянем, вдруг это частник
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }
    return car;
  }

  async update(id: number, updateCarDto: UpdateCarDto) {
    const { location_id, ...carData } = updateCarDto;

    // DeepPartial позволяет обновлять вложенные структуры (включая jsonb поля)
    const updatePayload: DeepPartial<Car> = { ...carData };

    if (location_id) {
      updatePayload.location = { id: location_id };
    }

    const car = await this.carsRepository.preload({
      id: id,
      ...updatePayload,
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }

    return await this.carsRepository.save(car);
  }

  async remove(id: number) {
    const result = await this.carsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }
    return { message: 'Car deleted successfully' };
  }

  async uploadCarImage(carId: number, url: string) {
    const car = await this.findOne(carId); // Проверяем, есть ли машина

    const image = this.imagesRepository.create({
      url: url,
      car: car, // Привязываем к машине
      is_main: false, // Логику главной картинки можно докрутить потом
    });

    return await this.imagesRepository.save(image);
  }
  async removeImage(imageId: number) {
    const image = await this.imagesRepository.findOne({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Image not found');

    // 1. Пытаемся удалить из Cloudinary
    try {
      const publicId = this.extractPublicIdFromUrl(image.url);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }

    // 2. Удаляем запись из БД
    return await this.imagesRepository.remove(image);
  }

  // 👇 Auxiliary method: Parses the URL and extracts the ID
  // Example URL: https://res.cloudinary.com/demo/image/upload/v123456/car4rent_cars/my_car.jpg
  // We need to extract: car4rent_cars/my_car
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
