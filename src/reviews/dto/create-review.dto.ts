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

  // For admin: allow specifying user and car directly
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsInt()
  car_id?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number; // 1-5

  @IsString()
  @IsNotEmpty()
  comment: string;
}
