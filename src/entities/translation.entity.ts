import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('translations')
export class Translation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string; // Например: 'ui_btn_save', 'error_404_text'

  @Column({ type: 'jsonb' })
  value: Record<string, string>; // { "ru": "...", "en": "..." }
}
