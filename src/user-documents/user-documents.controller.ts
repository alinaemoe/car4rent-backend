import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserDocumentsService } from './user-documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { DocType } from '../entities/user-document.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // 👈 Импортируем Cloudinary

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class UserDocumentsController {
  constructor(
    private readonly service: UserDocumentsService,
    private readonly cloudinaryService: CloudinaryService, // 👈 Инжектим сервис облака
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query('userId') userId?: string) {
    return this.service.findAll(userId);
  }

  // 👇 ОБНОВЛЕННЫЙ РОУТ ЗАГРУЗКИ (Ждет FormData с файлом)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // Перехватываем поле 'file'
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocType,
    @Body('document_number') documentNumber?: string,
  ) {
    const userId = (req.user.userId || req.user.id) as string;

    if (!file) {
      throw new BadRequestException('Файл документа обязателен');
    }

    if (!type) {
      throw new BadRequestException('Тип документа (type) обязателен');
    }

    // 1. Отправляем физический файл в Cloudinary
    const imageUrl = await this.cloudinaryService.uploadImage(file);

    // 2. Передаем ссылку и тип в сервис для сохранения в БД
    return this.service.upload(userId, type, imageUrl, documentNumber);
  }

  @Get('my')
  findMy(@Request() req) {
    const userId = (req.user.userId || req.user.id) as string;
    return this.service.findMyDocs(userId);
  }

  @Patch(':id/verify')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  verify(@Param('id', ParseIntPipe) id: number) {
    return this.service.verify(id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.service.reject(id, reason);
  }
}
