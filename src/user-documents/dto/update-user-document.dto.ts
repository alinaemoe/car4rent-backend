import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-user-document.dto';

export class UpdateUserDocumentDto extends PartialType(CreateDocumentDto) {}
