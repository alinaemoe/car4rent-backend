import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CarDamage } from '../entities/car-damage.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCarDamageDto } from './dto/create-car-damage.dto';

interface FindAllParams {
  carId?: number;
  isPaid?: boolean;
  _start?: number;
  _end?: number;
  _sort?: string;
  _order?: string;
}

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

  async findAll(params: FindAllParams = {}) {
    const where: FindOptionsWhere<CarDamage> = {};
    if (params.carId) where.car = { id: params.carId } as any;
    if (params.isPaid !== undefined) where.is_paid = params.isPaid;

    const order: Record<string, 'ASC' | 'DESC'> = {};
    if (params._sort && params._order) {
      order[params._sort] = params._order.toUpperCase() as 'ASC' | 'DESC';
    } else {
      order.created_at = 'DESC';
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['car', 'rental', 'rental.user'],
      order,
      skip: params._start ?? 0,
      take: params._end && params._start ? params._end - params._start : undefined,
    });

    return { data, total };
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
      coord_x: dto.coord_x ?? null,
      coord_y: dto.coord_y ?? null,
      coord_z: dto.coord_z ?? null,
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
