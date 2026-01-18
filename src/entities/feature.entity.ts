import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Air conditioning, GPS

  @Column({ nullable: true })
  icon_url: string;
}
