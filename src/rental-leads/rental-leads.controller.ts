import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { RentalLeadsService } from './rental-leads.service';
import { CreateRentalLeadDto } from './dto/create-rental-lead.dto';
import { UpdateRentalLeadStatusDto } from './dto/update-rental-lead.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('rental-leads')
export class RentalLeadsController {
  constructor(private readonly rentalLeadsService: RentalLeadsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateRentalLeadDto) {
    return this.rentalLeadsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.rentalLeadsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
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
    const result = await this.rentalLeadsService.findAllForAdmin({
      _start: _start ? parseInt(_start, 10) : undefined,
      _end: _end ? parseInt(_end, 10) : undefined,
      _sort: _sort || 'created_at',
      _order: order,
    });
    if (res) {
      res.header('X-Total-Count', String(result.total));
      res.header('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return result.data;
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalLeadStatusDto,
  ) {
    return this.rentalLeadsService.updateStatus(id, dto.status);
  }
}
