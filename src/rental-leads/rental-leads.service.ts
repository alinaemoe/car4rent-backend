import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRentalLeadDto } from './dto/create-rental-lead.dto';
import { LeadStatus, RentalLead } from '../entities/rental-lead.entity';

@Injectable()
export class RentalLeadsService {
  constructor(
    @InjectRepository(RentalLead)
    private repo: Repository<RentalLead>,
  ) {}

  async create(dto: CreateRentalLeadDto) {
    const { car_id, ...rest } = dto;

    const lead = this.repo.create({
      ...rest,
      car: car_id ? { id: car_id } : null,
    });

    return await this.repo.save(lead);
  }

  async findAll() {
    return this.repo.find({
      relations: ['car'],
      order: { created_at: 'DESC' },
    });
  }

  async findAllForAdmin(params: {
    _start?: number;
    _end?: number;
    _sort?: string;
    _order?: 'ASC' | 'DESC';
  }) {
    const { _start = 0, _end = 10, _sort = 'created_at', _order = 'DESC' } = params;
    const take = _end - _start;
    const allowedSortFields = ['id', 'name', 'status', 'created_at'];
    const sortField = allowedSortFields.includes(_sort) ? _sort : 'created_at';
    const [data, total] = await this.repo.findAndCount({
      relations: ['car'],
      skip: _start,
      take,
      order: { [sortField]: _order },
    });
    return { data, total };
  }

  async updateStatus(id: number, status: LeadStatus) {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    lead.status = status;
    return await this.repo.save(lead);
  }
}
