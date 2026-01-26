import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum RequestStatus {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('partnership_requests')
export class PartnershipRequest {
  @PrimaryGeneratedColumn()
  id: number;

  // If the application is submitted by a registered user
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column()
  owner_name: string;

  @Column()
  owner_phone: string;

  @Column()
  car_brand: string;

  @Column()
  car_model: string;

  @Column()
  car_year: number;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.NEW })
  status: RequestStatus;

  @CreateDateColumn()
  created_at: Date;
}
