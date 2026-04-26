import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePartnershipDto } from './dto/create-partnership-request.dto';
import {
  PartnershipRequest,
  RequestStatus,
} from '../entities/partnership-request.entity';

@Injectable()
export class PartnershipRequestsService {
  constructor(
    @InjectRepository(PartnershipRequest)
    private repo: Repository<PartnershipRequest>,
  ) {}

  async create(dto: CreatePartnershipDto, photos: string[], userId: string) {
    const request = this.repo.create({
      ...dto,
      car_year: Number(dto.car_year), // Принудительно делаем числом
      photos: photos, // 👈 Сохраняем ссылки на картинки
      user: { id: userId }, // 👈 Жестко линкуем юзера
    });

    return await this.repo.save(request);
  }

  async findOne(id: number) {
    const request = await this.repo.findOne({
      where: { id },
      relations: ['user'], // Подтягиваем юзера для страницы просмотра
    });

    if (!request) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    return request;
  }

  async findAll() {
    return this.repo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: RequestStatus) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    request.status = status;
    return await this.repo.save(request);
  }
}
