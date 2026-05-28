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
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PartnershipRequestsService } from './partnership-requests.service';
import { CreatePartnershipDto } from './dto/create-partnership-request.dto';
import { UpdatePartnershipStatusDto } from './dto/update-partnership-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('partnership-requests')
export class PartnershipRequestsController {
  constructor(
    private readonly service: PartnershipRequestsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Post()
  @UseInterceptors(FilesInterceptor('photos', 5))
  async create(
    @Request() req,
    @Body() dto: CreatePartnershipDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.userId || req.user?.id || null;
    let photoUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file),
      );
      photoUrls = await Promise.all(uploadPromises);
    }

    return this.service.create(dto, photoUrls, userId);
  }

  @Get('my')
  findMy(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.service.findMy(userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartnershipStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.service.remove(id, userId);
  }
}
