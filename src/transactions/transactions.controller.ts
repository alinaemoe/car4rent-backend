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
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // 3. Получить ВСЕ транзакции (Для Админа)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.transactionsService.findAll();
  }

  // 4. Отметить выплату партнеру (Для Админа)
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
