import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  ParseIntPipe,
  Query,
  Res,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { FinishRentalDto } from './dto/finish-rental.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { RentalStatus } from '../entities/rental.entity';

@ApiTags('Rentals') // Grouping in Swagger (for aesthetics)
@ApiBearerAuth('JWT-auth') // 👈 IMPORTANT: The name must match the one in main.ts.
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  // 1. Забронировать (Может любой авторизованный юзер)
  @Post()
  create(@Request() req, @Body() createRentalDto: CreateRentalDto) {
    return this.rentalsService.create(req.user, createRentalDto); // req.user приходит из JWT Guard
  }

  // 2. Посмотреть мои поездки
  @Get('my')
  findMyRentals(@Request() req) {
    return this.rentalsService.findMyRentals(req.user.userId);
  }

  // 3. Админ: Все поездки (с пагинацией для DataGrid)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Query('userId') userId: string | undefined,
    @Query('status') status: RentalStatus | undefined,
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

    const result = await this.rentalsService.findAll(
      userId,
      status,
      skip,
      take,
      sort,
      sortOrder,
    );

    res.setHeader('X-Total-Count', result.total.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return result.data;
  }

  // 3b. Админ: Одна аренда (для Show)
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.findOne(id);
  }

  // 3c. Админ: Обновление аренды (даты и т.д.)
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRentalDto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(id, updateRentalDto);
  }

  // 4. Админ: Одобрить/Отклонить/Завершить
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: RentalStatus,
  ) {
    return this.rentalsService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  cancel(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId || req.user.id;
    return this.rentalsService.cancel(id, userId, req.user.roles);
  }

  @Post(':id/finish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  finish(
    @Param('id', ParseIntPipe) id: number,
    @Body() finishDto: FinishRentalDto,
  ) {
    return this.rentalsService.finish(id, finishDto);
  }

  @Get('car/:carId')
  @Roles(UserRole.LESSOR, UserRole.ADMIN, UserRole.MANAGER)
  findRentalsByCar(
    @Param('carId', ParseIntPipe) carId: number,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.rentalsService.findRentalsByCarId(
      carId,
      userId,
      req.user.roles,
    );
  }
}
