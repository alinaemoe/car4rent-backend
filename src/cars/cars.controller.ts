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
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 1. СОЗДАНИЕ: Разрешаем всем авторизованным (Клиент станет LESSOR'ом)
  @Post()
  create(@Body() createCarDto: CreateCarDto, @Request() req) {
    return this.carsService.create(createCarDto, req.user);
  }

  // 2. МОИ МАШИНЫ: ВАЖНО! Этот роут должен быть ВЫШЕ, чем @Get(':id')
  @Get('my')
  @Roles(UserRole.LESSOR, UserRole.ADMIN, UserRole.MANAGER)
  findMyCars(@Request() req) {
    return this.carsService.findCarsByOwner(req.user.userId);
  }

  // 3. СПИСОК: Публично (с пагинацией для DataGrid)
  @Public()
  @Get()
  async findAll(
    @Query('_start') start: string | undefined,
    @Query('_end') end: string | undefined,
    @Query('_sort') sort: string | undefined,
    @Query('_order') order: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const skip = start ? parseInt(start, 10) : undefined;
    const take =
      end && start ? parseInt(end, 10) - parseInt(start, 10) : undefined;
    const sortOrder = order === 'desc' ? ('DESC' as const) : ('ASC' as const);

    const result = await this.carsService.findAll(skip, take, sort, sortOrder);

    res.setHeader('X-Total-Count', result.total.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return result.data;
  }

  @Public()
  @Get('catalog')
  getCatalog(@Query() query: any) {
    return this.carsService.getCatalog(query);
  }

  @Public()
  @Get('catalog/:id')
  getCatalogOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.getCatalogOne(id);
  }

  // 4. ОДНА МАШИНА: Публично
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.findOne(id);
  }

  // 5. ОБНОВЛЕНИЕ: Админ, Менеджер или Владелец (LESSOR)
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.LESSOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
    @Request() req, // 👈 Передаем юзера для проверки прав
  ) {
    return this.carsService.update(id, updateCarDto, req.user);
  }

  // 6. УДАЛЕНИЕ: Оставим только Админам (или можно добавить логику "мягкого удаления" для LESSOR)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.remove(id);
  }

  // 7. ЗАГРУЗКА ФОТО: Админ или Владелец
  @Post(':id/images')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.LESSOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req, // 👈 Передаем юзера
  ) {
    // 1. Проверяем права ДО загрузки в облако (внутри сервиса)
    await this.carsService.checkOwnership(id, req.user);

    // 2. Загружаем в облако
    const imageUrl = await this.cloudinaryService.uploadImage(file);

    // 3. Сохраняем ссылку в БД
    return this.carsService.uploadCarImage(id, imageUrl);
  }

  // 8. УДАЛЕНИЕ ФОТО: Админ или Владелец
  @Delete('images/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.LESSOR)
  removeImage(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.carsService.removeImage(id, req.user);
  }

  @Patch(':id/visibility')
  @Roles(UserRole.LESSOR)
  toggleVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body('isVisible') isVisible: boolean,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.carsService.toggleVisibility(id, userId, isVisible);
  }
}
