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

  async upload(userId: string, dto: CreateDocumentDto) {
    // Checking for duplicates
    const existing = await this.docRepo.findOne({
      where: { user: { id: userId }, type: dto.type },
    });

    if (existing && existing.status !== DocStatus.REJECTED) {
      throw new BadRequestException(
        'The document has already been uploaded or is being checked.',
      );
    }

    // OCR IMITATION (Scanning)
    let finalDocNumber = dto.document_number;
    if (!finalDocNumber) {
      // Generate a random string if the user has not entered the number manually.
      finalDocNumber = Math.random()
        .toString(36)
        .substring(2, 12)
        .toUpperCase();
    }

    const doc =
      existing || this.docRepo.create({ user: { id: userId }, type: dto.type });

    doc.image_url = dto.image_url;
    doc.document_number = finalDocNumber;
    doc.status = DocStatus.PENDING;
    doc.rejection_reason = null;

    return await this.docRepo.save(doc);
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
