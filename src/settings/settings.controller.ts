import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN) // 👈 Только админы создают настройки
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Public() // 👈 Публичный доступ, чтобы мобилка при старте всё скачала
  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Public()
  @Get(':key') // 👈 Поменяли id на key
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key); // 👈 Убрали + (плюс), так как это строка
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN) // 👈 Только админы меняют настройки
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.update(key, updateSettingDto);
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}
