import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Файл обязателен');
    const avatarUrl = await this.cloudinaryService.uploadImage(file);
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('_start') start: string | undefined,
    @Query('_end') end: string | undefined,
    @Query('_sort') sort: string | undefined,
    @Query('_order') order: string | undefined,
    @Query('q') q: string | undefined,
    @Query('role') role: string | undefined,
    @Query('status') status: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const skip = start ? parseInt(start, 10) : undefined;
    const take =
      end && start ? parseInt(end, 10) - parseInt(start, 10) : undefined;
    const sortOrder =
      order?.toLowerCase() === 'asc' ? ('ASC' as const) : ('DESC' as const);

    const result = await this.usersService.findAll({
      skip,
      take,
      sort,
      order: sortOrder,
      q,
      role,
      status,
    });

    res.setHeader('X-Total-Count', result.total.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return result.data;
  }

  @Get('registration-stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getRegistrationStats() {
    return this.usersService.getRegistrationStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
