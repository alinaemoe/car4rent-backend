import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserDocument } from 'src/entities/user-document.entity';
import { UserDocumentsService } from './user-documents.service';
import { UserDocumentsController } from './user-documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserDocument, User])],
  controllers: [UserDocumentsController],
  providers: [UserDocumentsService],
  exports: [UserDocumentsService],
})
export class UserDocumentsModule {}
