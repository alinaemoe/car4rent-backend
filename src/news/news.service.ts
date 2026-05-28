import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from '../entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
  ) {}

  // 🔥 ДЛЯ МОБИЛКИ: Только активные новости, свежие сверху
  async findActive() {
    return this.newsRepo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  // 👉 ДЛЯ АДМИНКИ: Вообще все новости
  async findAllForAdmin() {
    return this.newsRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  // Получить одну новость (для детального экрана на мобилке)
  async findOne(id: number) {
    const news = await this.newsRepo.findOne({ where: { id } });
    if (!news) throw new NotFoundException('Новость не найдена');
    return news;
  }

  // Создать
  async create(dto: CreateNewsDto) {
    const news = this.newsRepo.create(dto);
    return this.newsRepo.save(news);
  }

  // Обновить
  async update(id: number, dto: UpdateNewsDto) {
    const news = await this.findOne(id);
    Object.assign(news, dto);
    return this.newsRepo.save(news);
  }

  // Удалить
  async remove(id: number) {
    const news = await this.findOne(id);
    await this.newsRepo.remove(news);
    return { success: true };
  }
}
