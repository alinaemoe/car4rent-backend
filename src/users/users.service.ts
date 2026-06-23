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

  async findAll(opts: {
    skip?: number;
    take?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
    q?: string;
    role?: string;
    status?: string;
  } = {}) {
    const { skip, take, sort, order, q, role, status } = opts;

    const qb = this.usersRepository.createQueryBuilder('user');

    // Поиск по имени/фамилии/email
    if (q) {
      qb.andWhere(
        '(LOWER(user.first_name) LIKE LOWER(:q) OR LOWER(user.last_name) LIKE LOWER(:q) OR LOWER(user.email) LIKE LOWER(:q))',
        { q: `%${q}%` },
      );
    }

    // Фильтр по статусу (enum)
    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    // Фильтр по роли: roles — это text[], проверяем вхождение
    if (role) {
      qb.andWhere(':role = ANY(user.roles)', { role });
    }

    // Сортировка только по разрешённым колонкам (защита от инъекции/битых полей,
    // напр. вычисляемого fullName с фронта, которого нет в таблице)
    const allowedSort = [
      'email',
      'first_name',
      'last_name',
      'status',
      'created_at',
      'updated_at',
    ];
    const orderColumn = sort && allowedSort.includes(sort) ? sort : 'created_at';
    const orderDir = order === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`user.${orderColumn}`, orderDir);

    qb.skip(skip ?? 0).take(take ?? 100);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
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

  async updateStatus(userId: string, status: UserStatus) {
    await this.usersRepository.update(userId, { status });
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

  async updateResetOtpDetails(
    userId: string,
    otpHash: string | null,
    expiresAt: Date | null,
    attempts: number,
  ) {
    await this.usersRepository.update(userId, {
      reset_password_otp_hash: otpHash,
      reset_password_otp_expires_at: expiresAt,
      reset_password_attempts: attempts,
    });
  }

  async clearResetOtpDetails(userId: string) {
    await this.usersRepository.update(userId, {
      reset_password_otp_hash: null,
      reset_password_otp_expires_at: null,
      reset_password_attempts: 0,
    });
  }

  async incrementResetAttempts(userId: string) {
    await this.usersRepository.increment(
      { id: userId },
      'reset_password_attempts',
      1,
    );
  }

  async updatePassword(userId: string, newPassword: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(newPassword, salt);
    await this.usersRepository.update(userId, {
      password_hash: hash,
    });
  }

  async getRegistrationStats() {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const byMonth = await this.usersRepository
      .createQueryBuilder('u')
      .select("TO_CHAR(u.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(u.id)', 'count')
      .where('u.created_at >= :twelveMonthsAgo', { twelveMonthsAgo })
      .groupBy("TO_CHAR(u.created_at, 'YYYY-MM')")
      .orderBy('"month"', 'ASC')
      .getRawMany();

    const buckets: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    for (const row of byMonth) {
      if (buckets[row.month] !== undefined) buckets[row.month] = parseInt(row.count) || 0;
    }

    return {
      total: await this.usersRepository.count(),
      thisMonth: byMonth
        .filter((r) => r.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
        .reduce((s, r) => s + (parseInt(r.count) || 0), 0),
      byMonth: Object.entries(buckets).map(([month, count]) => ({ month, count })),
    };
  }
}
