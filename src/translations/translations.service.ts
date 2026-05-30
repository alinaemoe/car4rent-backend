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

  // 👇 Принимаем query-параметры
  async findAll(query: any = {}) {
    const { key_like, _sort, _order, _start, _end } = query;

    // Начинаем строить кастомный запрос
    const qb = this.translationsRepo.createQueryBuilder('translation');

    // Если пришел поиск
    if (key_like) {
      qb.where('translation.key ILIKE :search', { search: `%${key_like}%` })
        // ::text позволяет Postgres искать прямо внутри JSONB объекта!
        .orWhere('translation.value::text ILIKE :search', {
          search: `%${key_like}%`,
        });
    }

    // Сортировка (если Refine прислал, используем её, иначе по умолчанию DESC по id)
    const sortField = _sort || 'id';
    const sortOrder = _order ? _order.toUpperCase() : 'DESC';
    qb.orderBy(`translation.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Пагинация для DataGrid (Refine передает _start/_end)
    const start = _start !== undefined ? parseInt(_start, 10) : undefined;
    const end = _end !== undefined ? parseInt(_end, 10) : undefined;
    if (start !== undefined && end !== undefined) {
      qb.skip(start).take(end - start);
    }

    // Выполняем запрос
    const [data, total] = await qb.getManyAndCount();
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
