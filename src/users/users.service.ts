import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Import bcrypt
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserStatus } from '../entities/user.entity';

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
      password_hash: hash, // сохраняем хэш пароля
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      phone: createUserDto.phone,
      is_email_verified: createUserDto.is_email_verified ?? false,
      is_documents_verified: createUserDto.is_documents_verified ?? false,
      admin_comment: createUserDto.admin_comment ?? undefined,
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
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['documents'], // 👈 ВОТ ЭТА МАГИЯ ПОДТЯНЕТ ДОКУМЕНТЫ
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Аккуратно отрезаем всё секьюрное перед отправкой
    const {
      password_hash,
      verification_otp_hash,
      otp_expires_at,
      hashed_refresh_token,
      ...safeUser
    } = user;

    return safeUser;
  }

  async findByIdForAuth(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user; // Ничего не отрезаем!
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

  async updateRefreshToken(userId: string, hashedToken: string | null) {
    await this.usersRepository.update(userId, {
      hashed_refresh_token: hashedToken,
    });
  }

  async verifyEmailSuccess(userId: string) {
    await this.usersRepository.update(userId, {
      is_email_verified: true,
      status: UserStatus.ACTIVE, // Почта подтверждена -> аккаунт активен
      verification_otp_hash: null,
      otp_expires_at: null,
    });
  }

  // 👇 МЕТОД ДЛЯ ПОДТВЕРЖДЕНИЯ ДОКУМЕНТОВ
  async setDocumentsVerified(userId: string, isVerified: boolean) {
    await this.usersRepository.update(userId, {
      is_documents_verified: isVerified,
    });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.usersRepository.update(userId, { avatar_url: avatarUrl });
    return this.findOne(userId);
  }

  async updateOtpDetails(
    userId: string,
    otpHash: string | null,
    expiresAt: Date | null,
  ) {
    await this.usersRepository.update(userId, {
      verification_otp_hash: otpHash,
      otp_expires_at: expiresAt,
    });
  }
}
