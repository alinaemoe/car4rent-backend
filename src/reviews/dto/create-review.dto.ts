import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @IsOptional()
  @IsInt()
  rental_id?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number; // 1-5

  @IsString()
  @IsNotEmpty()
  comment: string;
}
