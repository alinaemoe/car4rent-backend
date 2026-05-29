import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { Feature } from 'src/entities/feature.entity';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
  ) {}

  async create(createFeatureDto: CreateFeatureDto) {
    const feature = this.featureRepo.create(createFeatureDto);
    return await this.featureRepo.save(feature);
  }

  async findAll() {
    return await this.featureRepo.find();
  }

  async findAllForAdmin(params: {
    _start?: number;
    _end?: number;
    _sort?: string;
    _order?: 'ASC' | 'DESC';
  }) {
    const { _start = 0, _end = 10, _sort = 'id', _order = 'ASC' } = params;
    const take = _end - _start;
    const allowedSortFields = ['internal_name', 'id'];
    const sortField = allowedSortFields.includes(_sort) ? _sort : 'id';
    const [data, total] = await this.featureRepo.findAndCount({
      skip: _start,
      take,
      order: { [sortField]: _order },
    });
    return { data, total };
  }

  async findOne(id: number) {
    const feature = await this.featureRepo.findOne({ where: { id } });
    if (!feature) throw new NotFoundException(`Feature #${id} not found`);
    return feature;
  }

  async update(id: number, updateFeatureDto: UpdateFeatureDto) {
    const feature = await this.findOne(id); // Проверка на существование
    Object.assign(feature, updateFeatureDto);
    return await this.featureRepo.save(feature);
  }

  async remove(id: number) {
    const feature = await this.findOne(id);
    return await this.featureRepo.remove(feature);
  }
}
