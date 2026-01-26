import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { DocType } from 'src/entities/user-document.entity';

export class CreateDocumentDto {
  @IsEnum(DocType)
  type: DocType;

  @IsString()
  @IsNotEmpty()
  image_url: string;

  @IsString()
  @IsOptional()
  document_number?: string; // If not transferred, "OCR" will work.
}
