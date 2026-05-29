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

  async findAllForAdmin(params: {
    _start?: number;
    _end?: number;
    _sort?: string;
    _order?: 'ASC' | 'DESC';
  }) {
    const { _start = 0, _end = 10, _sort = 'id', _order = 'ASC' } = params;
    const take = _end - _start;
    const allowedSortFields = ['name', 'address', 'latitude', 'longitude', 'id'];
    const sortField = allowedSortFields.includes(_sort) ? _sort : 'id';
    const [data, total] = await this.locationRepo.findAndCount({
      skip: _start,
      take,
      order: { [sortField]: _order },
    });
    return { data, total };
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
