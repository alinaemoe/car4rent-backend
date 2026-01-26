import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Car } from './car.entity';

export enum LeadStatus {
  NEW = 'NEW',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

@Entity('rental_leads')
export class RentalLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  // If the user has selected a specific machine on the website (but this is not mandatory)
  @ManyToOne(() => Car, { nullable: true })
  @JoinColumn({ name: 'car_id' })
  car: Car | null;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @CreateDateColumn()
  created_at: Date;
}
