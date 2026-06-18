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
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum DepositStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  HELD = 'HELD',
  RETURNED = 'RETURNED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rental, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental | null;

  @ManyToOne(() => Car, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'car_id' })
  car: Car | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lessor_id' })
  lessor: User | null;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.RENTAL_PAYMENT,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  system_fee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  lessor_income: number;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.NOT_APPLICABLE,
  })
  payout_status: PayoutStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  base_rental_amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  penalty_amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  deposit_amount: number;

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.NOT_APPLICABLE,
  })
  deposit_status: DepositStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PAID,
  })
  payment_status: PaymentStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  customer_total: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
