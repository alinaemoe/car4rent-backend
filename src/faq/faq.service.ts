import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from '../entities/faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
  ) {}

  // ПУБЛИЧНЫЙ: Получить только активные вопросы, отсортированные по порядку
  async findActive() {
    return this.faqRepo.find({
      where: { is_active: true },
      order: { order_index: 'ASC', created_at: 'DESC' },
    });
  }

  // АДМИН: Получить вообще все вопросы (включая скрытые)
  async findAllForAdmin() {
    return this.faqRepo.find({
      order: { order_index: 'ASC', created_at: 'DESC' },
    });
  }

  // АДМИН: Получить один вопрос
  async findOne(id: number) {
    const faq = await this.faqRepo.findOne({ where: { id } });
    if (!faq) throw new NotFoundException('Вопрос не найден');
    return faq;
  }

  // АДМИН: Создать новый вопрос
  async create(dto: CreateFaqDto) {
    const faq = this.faqRepo.create(dto);
    return this.faqRepo.save(faq);
  }

  // АДМИН: Обновить вопрос
  async update(id: number, dto: Partial<CreateFaqDto>) {
    const faq = await this.faqRepo.findOne({ where: { id } });
    if (!faq) throw new NotFoundException('Вопрос не найден');

    Object.assign(faq, dto);
    return this.faqRepo.save(faq);
  }

  // АДМИН: Удалить вопрос
  async remove(id: number) {
    const result = await this.faqRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Вопрос не найден');
    }
    return { success: true };
  }
}
