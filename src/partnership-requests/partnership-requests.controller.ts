import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PartnershipRequestsService } from './partnership-requests.service';
import { CreatePartnershipDto } from './dto/create-partnership-request.dto';
import { UpdatePartnershipStatusDto } from './dto/update-partnership-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('partnership-requests')
export class PartnershipRequestsController {
  constructor(private readonly service: PartnershipRequestsService) {}

  // 1. Create a request (Public)
  // We cannot easily get req.user here if it is set to @Public.
  // So for now, let's leave it without binding user_id, OR, if you want to complicate things:
  // We need to make a custom Guard that doesn't block but parses the token.
  // FOR SIMPLICITY: Let's make it public.
  @Public()
  @Post()
  create(@Body() dto: CreatePartnershipDto) {
    // If it is really necessary to link the user, the front end can send the userId in the body (not secure)
    // Or we can leave user: null. The main thing for the business is the phone number.
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartnershipStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
