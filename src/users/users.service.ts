import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Import bcrypt
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // 1. Create User with Hashed Password
  async create(createUserDto: CreateUserDto) {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      password_hash: hash, // Save the HASH, not the password
      first_name: createUserDto.firstName,
      last_name: createUserDto.lastName,
      phone: createUserDto.phone,
    });

    const savedUser = await this.usersRepository.save(user);

    // Remove password from response for security
    const { password_hash, ...result } = savedUser;
    return result;
  }

  async findAll() {
    return await this.usersRepository.find();
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // Critical for Auth: Find user to validate password
  async findByEmail(email: string) {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const { password, ...otherData } = updateUserDto;

    const updateData: DeepPartial<User> = { ...otherData };

    if (password) {
      updateData.password_hash = password; // тут тоже password — уже захеширован
    }

    const user = await this.usersRepository.preload({
      id,
      ...updateData,
    });

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: _, ...result } = savedUser;
    return result;
  }

  async remove(id: string) {
    return await this.usersRepository.delete(id);
  }
}
