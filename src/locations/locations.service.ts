import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from 'src/entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepo: Repository<Location>,
  ) {}

  async create(createLocationDto: CreateLocationDto) {
    const loc = this.locationRepo.create(createLocationDto);
    return await this.locationRepo.save(loc);
  }

  async findAll() {
    return await this.locationRepo.find();
  }

  async findOne(id: number) {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException(`Location #${id} not found`);
    return loc;
  }

  async update(id: number, updateLocationDto: UpdateLocationDto) {
    const loc = await this.findOne(id);
    Object.assign(loc, updateLocationDto);
    return await this.locationRepo.save(loc);
  }

  async remove(id: number) {
    const loc = await this.findOne(id);
    return await this.locationRepo.remove(loc);
  }
}
