import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('cars')
export class CarsController {
  constructor(
    private readonly carsService: CarsService,
    private readonly cloudinaryService: CloudinaryService, // 👈 Инжектим сервис
  ) {}

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

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.findOne(id);
  }

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

  @Post(':id/images')
  @Roles(UserRole.ADMIN) // Только админ грузит фото
  @UseInterceptors(FileInterceptor('file')) // 'file' - имя поля в Form-Data
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 1. Загружаем в облако
    const imageUrl = await this.cloudinaryService.uploadImage(file);

    // 2. Сохраняем ссылку в БД
    return this.carsService.uploadCarImage(id, imageUrl);
  }

  @Delete('images/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeImage(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.removeImage(id);
  }
}
