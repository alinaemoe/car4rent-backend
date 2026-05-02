import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocStatus,
  DocType,
  UserDocument,
} from '../entities/user-document.entity';
import { User } from '../entities/user.entity';
import { CreateDocumentDto } from './dto/create-user-document.dto';

@Injectable()
export class UserDocumentsService {
  constructor(
    @InjectRepository(UserDocument)
    private docRepo: Repository<UserDocument>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAll(userId?: string) {
    const whereCondition = userId ? { user: { id: userId } } : {};

    return this.docRepo.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
    });
  }

  // 👇 ОБНОВЛЕННЫЙ МЕТОД ЗАГРУЗКИ С ПОДДЕРЖКОЙ ОБНОВЛЕНИЯ
  async upload(
    userId: string,
    type: DocType,
    imageUrl: string,
    documentNumber?: string,
  ) {
    // Ищем существующий документ этого типа
    const existing = await this.docRepo.findOne({
      where: { user: { id: userId }, type: type },
    });

    // Если документ уже висит на проверке (PENDING), можно запретить спамить новыми
    // Но если он VERIFIED или REJECTED - разрешаем перезаписать
    if (existing && existing.status === DocStatus.PENDING) {
      throw new BadRequestException(
        'Этот документ уже находится на проверке у модератора.',
      );
    }

    // OCR IMITATION (Scanning)
    let finalDocNumber = documentNumber;
    if (!finalDocNumber) {
      finalDocNumber = Math.random()
        .toString(36)
        .substring(2, 12)
        .toUpperCase();
    }

    // Если документа не было — создаем новый. Если был — перезаписываем.
    const doc =
      existing || this.docRepo.create({ user: { id: userId }, type: type });

    doc.image_url = imageUrl;
    doc.document_number = finalDocNumber;
    doc.status = DocStatus.PENDING; // 🔥 Отправляем на модерацию
    doc.rejection_reason = null; // Очищаем причину отказа, если она была

    await this.docRepo.save(doc);

    // 🔥 ГЛАВНОЕ: Если юзер обновил документ, он теряет статус "Верифицирован"
    // Ему придется ждать, пока админ не проверит новую фотографию
    await this.userRepo.update(userId, { is_documents_verified: false });

    return doc;
  }

  // ADMIN: APPROVE
  async verify(id: number) {
    const doc = await this.docRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!doc) throw new NotFoundException('Document not found');

    doc.status = DocStatus.VERIFIED;
    await this.docRepo.save(doc);

    // Check whether the user has been fully verified
    await this.checkFullVerification(doc.user.id);

    return doc;
  }

  // ADMIN: REJECT
  async reject(id: number, reason: string) {
    const doc = await this.docRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!doc) throw new NotFoundException('Document not found');

    doc.status = DocStatus.REJECTED;
    doc.rejection_reason = reason;
    await this.docRepo.save(doc);

    // Uncheck the verification box for the user
    await this.userRepo.update(doc.user.id, { is_documents_verified: false });

    return doc;
  }

  // Private method for checking the set
  private async checkFullVerification(userId: string) {
    const docs = await this.docRepo.find({
      where: { user: { id: userId }, status: DocStatus.VERIFIED },
    });

    const hasPassport = docs.some((d) => d.type === DocType.PASSPORT);
    const hasLicense = docs.some((d) => d.type === DocType.DRIVER_LICENSE);

    if (hasPassport && hasLicense) {
      await this.userRepo.update(userId, { is_documents_verified: true });
    }
  }

  async findMyDocs(userId: string) {
    return this.docRepo.find({ where: { user: { id: userId } } });
  }
}
