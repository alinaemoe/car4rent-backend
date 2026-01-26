import { Module } from '@nestjs/common';
import { UserDocumentsService } from './user-documents.service';
import { UserDocumentsController } from './user-documents.controller';

@Module({
  controllers: [UserDocumentsController],
  providers: [UserDocumentsService],
})
export class UserDocumentsModule {}
