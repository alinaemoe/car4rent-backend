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
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
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

  // 3. Админ: Все поездки
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Query('userId') userId: string | undefined,
    @Query('status') status: RentalStatus | undefined, // 👈 Добавляем
    @Res({ passthrough: true }) res: Response,
  ) {
    // Передаем статус в сервис
    const rentals = await this.rentalsService.findAll(userId, status);

    res.setHeader('X-Total-Count', rentals.length.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return rentals;
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
}
