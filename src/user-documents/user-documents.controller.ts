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
} from '@nestjs/common';
import { UserDocumentsService } from './user-documents.service';
import { CreateDocumentDto } from './dto/create-user-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class UserDocumentsController {
  constructor(private readonly service: UserDocumentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query('userId') userId?: string) {
    return this.service.findAll(userId);
  }

  @Post('upload')
  upload(@Request() req, @Body() dto: CreateDocumentDto) {
    const userId = (req.user.userId || req.user.id) as string;
    return this.service.upload(userId, dto);
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
