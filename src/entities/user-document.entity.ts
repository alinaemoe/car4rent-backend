import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DocType {
  PASSPORT = 'PASSPORT',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
}

export enum DocStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('user_documents')
export class UserDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: DocType })
  type: DocType;

  @Column()
  image_url: string;

  @Column({ nullable: true })
  document_number: string;

  @Column({ type: 'enum', enum: DocStatus, default: DocStatus.PENDING })
  status: DocStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @ManyToOne(() => User, (user) => user.documents)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
