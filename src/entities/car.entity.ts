import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';
import { CarImage } from './car-image.entity';
import { Feature } from './feature.entity';
import { Rental } from './rental.entity';
import { Review } from './review.entity';

// Оставляем только системный статус, так как он влияет на жесткую бизнес-логику бэкенда
export enum CarStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('cars')
export class Car {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ unique: true })
  license_plate: string;

  @Column({ unique: true })
  vin: string;

  @Column({ type: 'jsonb', nullable: true })
  description: Record<string, string>;

  @Column({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE })
  status: CarStatus;

  // 👇 ТЕПЕРЬ ЭТО ПРОСТО СТРОКИ. Сюда будут писаться 'SEDAN', 'RED', 'AUTOMATIC' из словарей
  @Column()
  color: string;

  @Column()
  body_type: string;

  @Column()
  drive_type: string;

  @Column()
  transmission: string;

  @Column()
  fuel_type: string;

  // Характеристики
  @Column({ type: 'int', nullable: true })
  horsepower: number;

  @Column('decimal', { precision: 4, scale: 1, nullable: true })
  fuel_consumption: number;

  // Цены и Лимиты
  @Column('decimal', { precision: 10, scale: 2 })
  price_per_day: number;

  @Column({ default: 150 })
  mileage_limit_per_day: number;

  @Column('decimal', { precision: 10, scale: 2, default: 1.0 })
  price_per_km_over_limit: number;

  @Column({ default: 0 })
  current_mileage: number;

  // Связи
  @ManyToOne(() => User, (user) => user.my_cars, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @OneToMany(() => CarImage, (image) => image.car)
  images: CarImage[];

  @ManyToMany(() => Feature)
  @JoinTable({ name: 'car_features' })
  features: Feature[];

  @OneToMany(() => Rental, (rental) => rental.car)
  rentals: Rental[];

  @OneToMany(() => Review, (review) => review.car)
  reviews: Review[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
