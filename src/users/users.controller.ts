import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  // 👇 ЗАЩИЩАЕМ СПИСОК ЮЗЕРОВ (Только Админ может видеть всех)
  // Импортируй Roles из декоратора и UserRole из entity!
  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Note: UpdateUserDto needs to be mapped properly in the service if field names differ
    // (e.g. firstName -> first_name). For now, we assume simple updates.
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
