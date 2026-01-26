import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Car } from './car.entity';
import { Rental } from './rental.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rating: number | null; // 1-5

  @Column('text')
  comment: string;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Car, (car) => car.reviews, { nullable: true })
  @JoinColumn({ name: 'car_id' })
  car: Car | null;

  @ManyToOne(() => Rental, (rental) => rental.reviews, { nullable: true })
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;

  @CreateDateColumn()
  created_at: Date;
}
