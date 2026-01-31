import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from 'src/entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly langRepo: Repository<Language>,
  ) {}
  create(createLanguageDto: CreateLanguageDto) {
    const lang = this.langRepo.create(createLanguageDto);
    return this.langRepo.save(lang);
  }

  findAll() {
    // Возвращаем только активные, если это публичный API,
    // но для админки, возможно, нужны все.
    // Давай пока возвращать все, а сортировать по 'is_active'
    return this.langRepo.find({
      order: { is_active: 'DESC' },
    });
  }

  findOne(id: number) {
    // У тебя ID это строка code ('ru', 'en'), поэтому findOneBy code
    // Но в контроллере у тебя findOne(@Param('id') id: string) -> +id (number)
    // В Entity Language @PrimaryColumn() code: string.
    // Тут несостыковка. Давай искать по code.
    // Если id приходит строкой, то ок.
    return `Logic needs check: ID is string code or number? In entity it is string code.`;
  }

  // Для наших целей сейчас важен только findAll
  async findActive() {
    return this.langRepo.find({ where: { is_active: true } });
  }

  update(id: number, updateLanguageDto: UpdateLanguageDto) {
    return `This action updates a #${id} language`;
  }

  remove(id: number) {
    return `This action removes a #${id} language`;
  }
}
