import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarDamage } from '../entities/car-damage.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCarDamageDto } from './dto/create-car-damage.dto';

@Injectable()
export class CarDamagesService {
  constructor(
    @InjectRepository(CarDamage)
    private repo: Repository<CarDamage>,
    private cloudinary: CloudinaryService,
  ) {}

  async uploadPhoto(file: Express.Multer.File) {
    return await this.cloudinary.uploadImage(file, 'car4rent_damages');
  }

  async findAll() {
    return this.repo.find({
      relations: ['rental', 'rental.car', 'rental.user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCar(carId: number) {
    return this.repo.find({
      where: { car: { id: carId } },
      relations: ['rental', 'rental.user'],
      order: { created_at: 'DESC' },
    });
  }

  async markAsPaid(id: number) {
    const damage = await this.repo.findOne({ where: { id } });
    if (!damage) throw new NotFoundException('Damage record not found');

    damage.is_paid = true;
    return await this.repo.save(damage);
  }

  async create(dto: CreateCarDamageDto) {
    const damage = this.repo.create({
      type: dto.type,
      description: dto.description,
      repair_cost: dto.repair_cost,
      image_url: dto.image_url,
      is_paid: false,
      car: { id: dto.carId },
      rental: dto.rentalId ? { id: dto.rentalId } : undefined,
    });
    return await this.repo.save(damage);
  }

  async remove(id: number) {
    const damage = await this.repo.findOne({ where: { id } });
    if (!damage) throw new NotFoundException('Damage not found');
    return await this.repo.remove(damage);
  }
}
