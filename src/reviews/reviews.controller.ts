import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreateReviewDto) {
    const userId = req.user.userId || req.user.id;
    return this.reviewsService.create(userId, dto);
  }

  @Public()
  @Get('car/:id')
  getCarReviews(
    @Param('id', ParseIntPipe) carId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '3',
  ) {
    return this.reviewsService.findCarReviews(
      carId,
      Number(page),
      Number(limit),
    );
  }

  @Public()
  @Get('company')
  getCompanyReviews() {
    return this.reviewsService.findCompanyReviews();
  }
}
