import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Delete,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CarDamagesService } from './car-damages.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateCarDamageDto } from './dto/create-car-damage.dto';
import { UpdateCarDamageDto } from './dto/update-car-damage.dto';

@Controller('car-damages')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CarDamagesController {
  constructor(private readonly service: CarDamagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is missing');

    const url = await this.service.uploadPhoto(file);
    return { url };
  }

  @Get()
  findAll(
    @Query('carId') carId?: string,
    @Query('isPaid') isPaid?: string,
    @Query('_start') _start?: string,
    @Query('_end') _end?: string,
    @Query('_sort') _sort?: string,
    @Query('_order') _order?: string,
  ) {
    return this.service.findAll({
      carId: carId ? parseInt(carId, 10) : undefined,
      isPaid: isPaid !== undefined ? isPaid === 'true' : undefined,
      _start: _start ? parseInt(_start, 10) : undefined,
      _end: _end ? parseInt(_end, 10) : undefined,
      _sort,
      _order,
    });
  }

  @Get('car/:id')
  findByCar(@Param('id', ParseIntPipe) carId: number) {
    return this.service.findByCar(carId);
  }

  @Patch(':id/pay')
  markAsPaid(@Param('id', ParseIntPipe) id: number) {
    return this.service.markAsPaid(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarDamageDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post()
  create(@Body() dto: CreateCarDamageDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
