import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Car } from '../entities/car.entity';
import { CarImage } from 'src/entities/car-image.entity';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car) private readonly carsRepository: Repository<Car>,
    @InjectRepository(CarImage) // 👈 Инжектим репозиторий картинок
    private readonly imagesRepository: Repository<CarImage>,
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
}
