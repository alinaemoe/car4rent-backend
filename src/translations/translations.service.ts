import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Translation } from '../entities/translation.entity';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationsRepo: Repository<Translation>,
  ) {}

  async create(createTranslationDto: CreateTranslationDto) {
    // Проверяем, нет ли уже такого ключа
    const existing = await this.translationsRepo.findOne({
      where: { key: createTranslationDto.key },
    });
    if (existing) {
      throw new ConflictException(
        `Translation key '${createTranslationDto.key}' already exists`,
      );
    }

    const translation = this.translationsRepo.create(createTranslationDto);
    return await this.translationsRepo.save(translation);
  }

  async findAll() {
    // Возвращаем данные и их количество для заголовка X-Total-Count
    const [data, total] = await this.translationsRepo.findAndCount({
      order: { id: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: number) {
    const translation = await this.translationsRepo.findOne({ where: { id } });
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
    return translation;
  }

  async update(id: number, updateTranslationDto: UpdateTranslationDto) {
    const translation = await this.translationsRepo.preload({
      id,
      ...updateTranslationDto,
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }

    return await this.translationsRepo.save(translation);
  }

  async remove(id: number) {
    const result = await this.translationsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
    return { message: 'Translation deleted successfully' };
  }
}
