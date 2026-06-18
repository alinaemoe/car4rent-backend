import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePartnershipDto } from './dto/create-partnership-request.dto';
import {
  PartnershipRequest,
  RequestStatus,
} from '../entities/partnership-request.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class PartnershipRequestsService {
  constructor(
    @InjectRepository(PartnershipRequest)
    private repo: Repository<PartnershipRequest>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(dto: CreatePartnershipDto, photos: string[], userId: string) {
    const request = this.repo.create({
      ...dto,
      car_year: Number(dto.car_year), // Принудительно делаем числом
      photos: photos, // 👈 Сохраняем ссылки на картинки
      user: { id: userId }, // 👈 Жестко линкуем юзера
    });

    return await this.repo.save(request);
  }

  async findMy(userId: string) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' }, // Свежие сверху
    });
  }

  async findOne(id: number) {
    const request = await this.repo.findOne({
      where: { id },
      relations: ['user'], // Подтягиваем юзера для страницы просмотра
    });

    if (!request) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    return request;
  }

  async findAll() {
    return this.repo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: RequestStatus) {
    const request = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Request not found');

    request.status = status;
    await this.repo.save(request);

    // Grant LESSOR role when approved
    if (status === RequestStatus.APPROVED && request.user) {
      const user = await this.usersRepository.findOne({
        where: { id: request.user.id },
      });
      if (user && !user.roles.includes(UserRole.LESSOR)) {
        user.roles = [...user.roles, UserRole.LESSOR];
        await this.usersRepository.save(user);
      }
    }

    return request;
  }

  async remove(id: number, userId: string) {
    const request = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Проверяем, что удаляет именно автор
    if (request.user?.id !== userId) {
      throw new ForbiddenException('Вы не можете удалить чужую заявку');
    }

    // Разрешаем удалять только отклоненные
    if (request.status !== RequestStatus.REJECTED) {
      throw new BadRequestException('Можно удалить только отклоненную заявку');
    }

    return await this.repo.remove(request);
  }
}
