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
      relations: ['car'], // Let's load up the machine so the admin can see what they were interested in.
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: LeadStatus) {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    lead.status = status;
    return await this.repo.save(lead);
  }
}
