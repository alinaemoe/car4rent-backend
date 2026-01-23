import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { Translation } from '../entities/translation.entity';

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation)
    private repo: Repository<Translation>,
  ) {}

  async create(dto: CreateTranslationDto) {
    try {
      const translation = this.repo.create(dto);
      return await this.repo.save(translation);
    } catch (e) {
      if (e.code === '23505') {
        // Код ошибки Postgres: Unique violation
        throw new ConflictException('Such a translation key already exists.');
      }
      throw e;
    }
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, dto: UpdateTranslationDto) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
