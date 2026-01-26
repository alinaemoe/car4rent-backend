import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarDamage } from '../entities/car-damage.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
}
