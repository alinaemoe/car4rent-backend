import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Rental } from './rental.entity';

export enum DamageType {
  SCRATCH = 'SCRATCH',
  DENT = 'DENT',
  SALON = 'SALON',
  WHEEL = 'WHEEL',
  OTHER = 'OTHER',
}

@Entity('car_damages')
export class CarDamage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rental, (rental) => rental.damages)
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @Column({ type: 'enum', enum: DamageType })
  type: DamageType;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  image_url: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  repair_cost: number; // Сколько выставили клиенту

  @Column({ default: false })
  is_paid: boolean;

  @CreateDateColumn()
  created_at: Date;
}
