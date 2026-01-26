import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CarDamagesService } from './car-damages.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

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
  findAll() {
    return this.service.findAll();
  }

  @Get('car/:id')
  findByCar(@Param('id', ParseIntPipe) carId: number) {
    return this.service.findByCar(carId);
  }

  @Patch(':id/pay')
  markAsPaid(@Param('id', ParseIntPipe) id: number) {
    return this.service.markAsPaid(id);
  }
}
