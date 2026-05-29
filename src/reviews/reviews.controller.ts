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
  Patch,
  Delete,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
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

  // ---- Admin endpoints ----

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async findAllForAdmin(
    @Query('_start') _start: string = '0',
    @Query('_end') _end: string = '50',
    @Query('_sort') _sort: string = 'created_at',
    @Query('_order') _order: string = 'desc',
    @Query('car_id') car_id: string | undefined,
    @Query('rating') rating: string | undefined,
    @Query('user_id') user_id: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reviewsService.findAllForAdmin(
      Number(_start),
      Number(_end),
      _sort,
      _order,
      {
        car_id: car_id ? Number(car_id) : undefined,
        rating: rating ? Number(rating) : undefined,
        user_id,
      },
    );
    res.setHeader('X-Total-Count', String(result.total));
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    return result.data;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }

  // ---- Public endpoints ----

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
