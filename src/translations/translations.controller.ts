import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Res,
  Query, // 👈 Импортируем Query
} from '@nestjs/common';
import type { Response } from 'express';
import { TranslationsService } from './translations.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('translations')
@Roles(UserRole.ADMIN)
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Post()
  create(@Body() createTranslationDto: CreateTranslationDto) {
    return this.translationsService.create(createTranslationDto);
  }

  @Public()
  @Get()
  async findAll(
    @Query() query: any, // 👈 Ловим все query-параметры (?key_like=...&_sort=...)
    @Res({ passthrough: true }) res: Response,
  ) {
    // Передаем query в сервис
    const { data, total } = await this.translationsService.findAll(query);

    res.setHeader('X-Total-Count', total.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return data;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.translationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTranslationDto: UpdateTranslationDto,
  ) {
    return this.translationsService.update(id, updateTranslationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.translationsService.remove(id);
  }
}
