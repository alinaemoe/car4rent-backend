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

  async create(dto: CreatePartnershipDto, userId?: string) {
    const request = this.repo.create({
      ...dto,
      user: userId ? { id: userId } : undefined, // We link if the user is logged in
    });

    return await this.repo.save(request);
  }

  async findAll() {
    return this.repo.find({
      relations: ['user'], // The administrator will see whether the partner is registered.
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
