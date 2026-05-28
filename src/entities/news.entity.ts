import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  // Заголовок на разных языках { "ru": "Скидки 20%", "en": "20% Off" }
  @Column({ type: 'jsonb' })
  title: Record<string, string>;

  // Текст новости/акции { "ru": "...", "en": "..." }
  @Column({ type: 'jsonb' })
  text: Record<string, string>;

  // Бейджик категории { "ru": "акция", "en": "promo" } или { "ru": "тренд", "en": "trend" }
  @Column({ type: 'jsonb' })
  badge: Record<string, string>;

  // Ссылка на картинку в Cloudinary
  @Column({ type: 'varchar', nullable: true })
  image_url: string;

  // Флаг активности (чтобы можно было скрыть новость)
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
