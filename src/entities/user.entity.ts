import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserDocument } from './user-document.entity';
import { Rental } from './rental.entity';
import { Car } from './car.entity';
import { Review } from './review.entity';

export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  LESSOR = 'LESSOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true }) // A password may not be required for quick registration, but is usually necessary.
  @Exclude()
  password_hash: string;

  @Column({ nullable: true })
  @Exclude() // Прячем от фронтенда
  verification_otp_hash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otp_expires_at: Date | null;

  @Column({ nullable: true })
  @Exclude() // Прячем его от выдачи на фронтенд, как и пароль
  hashed_refresh_token: string | null;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  phone: string;

  // Role array: can be both a client and a supplier
  @Column('text', { array: true, default: [UserRole.CLIENT] })
  roles: UserRole[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'text', nullable: true })
  admin_comment: string; // "подозрительный тип"

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ default: false })
  is_verified: boolean; // Becomes true when the documents have been verified

  // COMMUNICATIONS
  @OneToMany(() => UserDocument, (doc) => doc.user)
  documents: UserDocument[];

  @OneToMany(() => Rental, (rental) => rental.user)
  rentals: Rental[];

  @OneToMany(() => Car, (car) => car.owner) // The machines he rents out
  my_cars: Car[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
