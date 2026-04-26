import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Car } from './car.entity';
import { Rental } from './rental.entity';

export enum TransactionType {
  RENTAL_PAYMENT = 'RENTAL_PAYMENT',
  PENALTY = 'PENALTY',
  DAMAGE_COMPENSATION = 'DAMAGE_COMPENSATION',
}

export enum PayoutStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE', // Для машин компании (никому выплачивать не надо)
  PENDING = 'PENDING', // Должны партнеру
  PAID = 'PAID', // Выплачено партнеру
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rental, { nullable: true })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental | null;

  @ManyToOne(() => Car)
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lessor_id' })
  lessor: User | null;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.RENTAL_PAYMENT,
  })
  type: TransactionType;

  // Сколько всего заплатил клиент
  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number;

  // Наша комиссия сервиса (например 20%)
  @Column('decimal', { precision: 10, scale: 2 })
  system_fee: number;

  // Доход партнера (80%)
  @Column('decimal', { precision: 10, scale: 2 })
  lessor_income: number;

  // Статус выплаты (должны мы деньги или уже перевели)
  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.NOT_APPLICABLE,
  })
  payout_status: PayoutStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
