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
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.locationsService.findAll();
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
    const order = _order === 'DESC' ? 'DESC' : 'ASC';
    const result = await this.locationsService.findAllForAdmin({
      _start: _start ? parseInt(_start, 10) : undefined,
      _end: _end ? parseInt(_end, 10) : undefined,
      _sort: _sort || 'id',
      _order: order,
    });
    if (res) {
      res.header('X-Total-Count', String(result.total));
      res.header('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return result.data;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.remove(id);
  }
}
