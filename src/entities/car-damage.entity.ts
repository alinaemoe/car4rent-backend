import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Rental } from './rental.entity';
import { Car } from './car.entity';

export enum DamageType {
  SCRATCH = 'SCRATCH',
  DENT = 'DENT',
  CRACK = 'CRACK',
  BROKEN_PART = 'BROKEN_PART',
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

  @ManyToOne(() => Car)
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @Column({ type: 'enum', enum: DamageType })
  type: DamageType;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  image_url: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  repair_cost: number;

  @Column({ default: false })
  is_paid: boolean;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  coord_x: number | null;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  coord_y: number | null;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  coord_z: number | null;

  @CreateDateColumn()
  created_at: Date;
}
