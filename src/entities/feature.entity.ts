import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true, nullable: true })
  internal_name: string; // Строгое имя для кода (например: 'climate_control', 'apple_carplay')

  @Column({ type: 'jsonb', nullable: true })
  description: Record<string, string>; // Локализованные названия: { "ru": "Климат-контроль", "en": "Climate control" }

  @Column({ nullable: true })
  icon_url: string;
}
