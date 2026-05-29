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
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { Public } from '../auth/decorators/public.decorator'; // Твой декоратор для открытых роутов
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // 👉 ПУБЛИЧНЫЙ ЭНДПОИНТ (Для мобилки)
  @Public()
  @Get()
  findActive() {
    return this.faqService.findActive();
  }

  // 👉 АДМИНСКИЙ ЭНДПОИНТ: Получить все (даже скрытые)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin')
  findAllForAdmin() {
    return this.faqService.findAllForAdmin();
  }

  // 👉 АДМИНСКИЙ ЭНДПОИНТ: Получить один
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.findOne(id);
  }

  // 👉 АДМИНСКИЙ ЭНДПОИНТ: Создать
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateFaqDto) {
    return this.faqService.create(dto);
  }

  // 👉 АДМИНСКИЙ ЭНДПОИНТ: Обновить (текст, порядок или статус активности)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateFaqDto>,
  ) {
    return this.faqService.update(id, dto);
  }

  // 👉 АДМИНСКИЙ ЭНДПОИНТ: Удалить
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.remove(id);
  }
}
