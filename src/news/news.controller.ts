import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // 🔓 Моб. приложение: Получить ленту новостей
  @Public()
  @Get()
  findActive() {
    return this.newsService.findActive();
  }

  // 🔓 Моб. приложение: Открыть конкретную новость
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.findOne(id);
  }

  // 🔐 Админка: Получить список всех новостей для таблицы (с пагинацией)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/all')
  async findAllForAdmin(
    @Query('_start') _start?: string,
    @Query('_end') _end?: string,
    @Query('_sort') _sort?: string,
    @Query('_order') _order?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const order = _order === 'ASC' ? 'ASC' : 'DESC';
    const sortField = _sort === 'title' || _sort === 'is_active' || _sort === 'order_index' ? _sort : 'created_at';
    const result = await this.newsService.findAllForAdmin({
      _start: _start ? parseInt(_start, 10) : undefined,
      _end: _end ? parseInt(_end, 10) : undefined,
      _sort: sortField,
      _order: order,
    });
    if (res) {
      res.header('X-Total-Count', String(result.total));
    }
    return result.data;
  }

  // 🔐 Админка: Загрузить картинку для новости
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is missing');
    return this.newsService.uploadImage(file);
  }

  // 🔐 Админка: Создать новость
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.newsService.create(dto);
  }

  // 🔐 Админка: Редактировать новость
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  // 🔐 Админка: Удалить новость
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.remove(id);
  }
}
