import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
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
