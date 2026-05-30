import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly langRepo: Repository<Language>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  create(createLanguageDto: CreateLanguageDto) {
    const lang = this.langRepo.create(createLanguageDto);
    return this.langRepo.save(lang);
  }

  findAll() {
    return this.langRepo.find({
      order: { is_active: 'DESC' },
    });
  }

  async findOne(code: string) {
    const lang = await this.langRepo.findOne({ where: { code } });
    if (!lang) throw new NotFoundException(`Language "${code}" not found`);
    return lang;
  }

  async findActive() {
    return this.langRepo.find({ where: { is_active: true } });
  }

  async update(code: string, updateLanguageDto: UpdateLanguageDto) {
    const lang = await this.findOne(code);
    Object.assign(lang, updateLanguageDto);
    return this.langRepo.save(lang);
  }

  async remove(code: string) {
    const lang = await this.findOne(code);
    return this.langRepo.remove(lang);
  }

  async uploadImage(file: Express.Multer.File) {
    const url = await this.cloudinary.uploadImage(file, 'car4rent_languages');
    return { url };
  }
}
