import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  // 1. СОЗДАНИЕ: Только Админ (или Менеджер)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createCarDto: CreateCarDto) {
    return this.carsService.create(createCarDto);
  }

  // 2. СПИСОК: Публично (каталог видят все)
  @Public()
  @Get()
  findAll() {
    return this.carsService.findAll();
  }

  // 3. ОДНА МАШИНА: Публично
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe превращает "123" в число 123
    return this.carsService.findOne(id);
  }

  // 4. ОБНОВЛЕНИЕ: Только Админ/Менеджер
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    return this.carsService.update(id, updateCarDto);
  }

  // 5. УДАЛЕНИЕ: Только Админ
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.remove(id);
  }
}
