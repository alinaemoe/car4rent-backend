import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Car } from './car.entity';
import { Location } from './location.entity';
import { CarDamage } from './car-damage.entity';
import { Review } from './review.entity';

export enum RentalStatus {
  CREATED = 'CREATED', // Booked
  APPROVED = 'APPROVED', // Confirmed by manager
  ACTIVE = 'ACTIVE', // The machine has been issued.
  COMPLETED = 'COMPLETED', // Returned
  CANCELED = 'CANCELED', // Cancellation
  OVERDUE = 'OVERDUE', // Overdue
}

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn()
  id: number;

  // WHO
  @ManyToOne(() => User, (user) => user.rentals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // WHAT
  @ManyToOne(() => Car, (car) => car.rentals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @Column({ type: 'enum', enum: RentalStatus, default: RentalStatus.CREATED })
  status: RentalStatus;

  // DATES
  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_return_date: Date;

  @Column({ type: 'int', default: 100 })
  start_fuel: number; // How much was issued (usually 100%)

  @Column({ type: 'int', nullable: true })
  end_fuel: number;

  // LOCATIONS (Where you took it from, where you returned it)
  @ManyToOne(() => Location)
  @JoinColumn({ name: 'pick_up_location_id' })
  pick_up_location: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'drop_off_location_id' })
  drop_off_location: Location;

  // MILEAGE
  @Column({ nullable: true })
  start_mileage: number;

  @Column({ nullable: true })
  end_mileage: number;

  // MONEY
  @Column('decimal', { precision: 10, scale: 2 })
  base_price: number; // Calculated at the time of booking

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  penalty_price: number; // Penalties + Overtime

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  total_price: number | null;

  // Connections
  @OneToMany(() => CarDamage, (damage) => damage.rental)
  damages: CarDamage[];

  @OneToMany(() => Review, (review) => review.rental) // Review specifically for this rental
  reviews: Review[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
