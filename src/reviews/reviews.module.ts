import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from 'src/entities/review.entity';
import { Rental } from 'src/entities/rental.entity';
import { Car } from 'src/entities/car.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Rental, Car])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
