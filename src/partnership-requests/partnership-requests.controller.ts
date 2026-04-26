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
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PartnershipRequestsService } from './partnership-requests.service';
import { CreatePartnershipDto } from './dto/create-partnership-request.dto';
import { UpdatePartnershipStatusDto } from './dto/update-partnership-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // 👈 Импортируем Cloudinary

@Controller('partnership-requests')
@UseGuards(JwtAuthGuard) // 👈 Закрываем роут, заявки только для своих
export class PartnershipRequestsController {
  constructor(
    private readonly service: PartnershipRequestsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('photos', 5)) // 👈 Перехватываем массив файлов (до 5 штук)
  async create(
    @Request() req,
    @Body() dto: CreatePartnershipDto,
    @UploadedFiles() files: Express.Multer.File[], // 👈 Достаем физические файлы
  ) {
    const userId = req.user.userId || req.user.id;
    let photoUrls: string[] = [];

    // Если юзер прикрепил файлы, грузим их в облако
    if (files && files.length > 0) {
      // Promise.all позволяет загрузить все 5 фоток параллельно, что супер быстро!
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
