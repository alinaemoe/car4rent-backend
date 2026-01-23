import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('languages')
export class Language {
  @PrimaryColumn() // Используем код как ID ('ru', 'en', 'de'), автоинкремент не нужен
  code: string;

  @Column()
  name: string; // "Русский", "English"

  @Column({ nullable: true })
  icon_url: string; // Ссылка на флаг

  @Column({ default: false })
  is_active: boolean; // Виден ли в приложении

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
