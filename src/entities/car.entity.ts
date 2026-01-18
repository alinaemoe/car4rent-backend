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

export enum CarStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum Transmission {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  ROBOT = 'ROBOT',
}

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID',
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

  @Column()
  color: string;

  @Column({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE })
  status: CarStatus;

  @Column({ type: 'enum', enum: Transmission })
  transmission: Transmission;

  @Column({ type: 'enum', enum: FuelType })
  fuel_type: FuelType;

  // Prices and Limits
  @Column('decimal', { precision: 10, scale: 2 })
  price_per_day: number;

  @Column({ default: 150 })
  mileage_limit_per_day: number;

  @Column('decimal', { precision: 10, scale: 2, default: 1.0 })
  price_per_km_over_limit: number;

  @Column({ default: 0 })
  current_mileage: number;

  // COMMUNICATIONS

  // Owner (If NULL - company car)
  @ManyToOne(() => User, (user) => user.my_cars, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  // Where is it worth
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @OneToMany(() => CarImage, (image) => image.car)
  images: CarImage[];

  @ManyToMany(() => Feature)
  @JoinTable({ name: 'car_features' }) // The connection table will be created automatically.
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
