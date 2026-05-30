import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PayoutStatus, TransactionType } from '../entities/transaction.entity';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAllForAdmin(
    @Query('_start') _start?: string,
    @Query('_end') _end?: string,
    @Query('_sort') _sort?: string,
    @Query('_order') _order?: string,
    @Query('payout_status') payout_status?: PayoutStatus,
    @Query('type') type?: TransactionType,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const order = _order === 'ASC' ? 'ASC' : 'DESC';
    const result = await this.transactionsService.findAllForAdmin({
      _start: _start ? parseInt(_start, 10) : undefined,
      _end: _end ? parseInt(_end, 10) : undefined,
      _sort: _sort || 'created_at',
      _order: order,
      payout_status,
      type,
      from_date,
      to_date,
    });
    if (res) {
      res.header('X-Total-Count', String(result.total));
      res.header('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return result.data;
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStats() {
    return this.transactionsService.getStats();
  }

  @Patch(':id/payout-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updatePayoutStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updatePayoutStatus(id, dto.payout_status);
  }

  @Get('lessor/stats')
  @Roles(UserRole.LESSOR)
  getLessorStats(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.transactionsService.getLessorStats(userId, month, year);
  }

  @Get('lessor/history')
  @Roles(UserRole.LESSOR)
  getLessorHistory(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.transactionsService.getLessorHistory(userId, month, year);
  }
}
