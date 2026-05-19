import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn()
  id: number;

  // Вопрос на разных языках { "ru": "Как?", "en": "How?" }
  @Column({ type: 'jsonb' })
  question: Record<string, string>;

  // Ответ на разных языках
  @Column({ type: 'jsonb' })
  answer: Record<string, string>;

  // Порядок сортировки (чтобы важные вопросы были сверху)
  @Column({ type: 'int', default: 0 })
  order_index: number;

  // Можно скрывать неактуальные вопросы
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
